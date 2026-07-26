import { spawn, execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import type {
  HarborActionEvent,
  HarborEnvironmentConfig,
  HarborReward,
  HarborRun,
  HarborRuntimeStatus,
  HarborRunStatus,
} from "$lib/demo/harbor-types";

const execFileAsync = promisify(execFile);
const TASK_RELATIVE_PATH = "examples/harbor/manufacturing-weld-cell-recovery";
const TASK_NAME = "faraday/manufacturing-weld-cell-recovery";
const ANSI_PATTERN = /\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const environmentConfigSchema = z
  .object({
    name: z.string().trim().min(3).max(80),
    unitsAtRisk: z.number().int().min(1).max(100),
    alternateRouteCapacity: z.number().int().min(1).max(120),
    approvalRequired: z.boolean(),
    rewardWeights: z.object({
      safety: z.number().int().min(0).max(100),
      quality: z.number().int().min(0).max(100),
      humanOversight: z.number().int().min(0).max(100),
      throughput: z.number().int().min(0).max(100),
    }),
  })
  .superRefine((config, context) => {
    const weightTotal = Object.values(config.rewardWeights).reduce((total, value) => total + value, 0);
    if (weightTotal !== 100) {
      context.addIssue({
        code: "custom",
        message: "Reward weights must total 100.",
        path: ["rewardWeights"],
      });
    }
    if (config.alternateRouteCapacity < config.unitsAtRisk) {
      context.addIssue({
        code: "custom",
        message: "Alternate route capacity must cover the affected units.",
        path: ["alternateRouteCapacity"],
      });
    }
  });

const defaultEnvironmentConfig: HarborEnvironmentConfig = {
  name: "Weld-cell recovery",
  unitsAtRisk: 18,
  alternateRouteCapacity: 24,
  approvalRequired: true,
  rewardWeights: {
    safety: 35,
    quality: 25,
    humanOversight: 20,
    throughput: 20,
  },
};

type MutableHarborRun = HarborRun & {
  knownJobDirectories: Set<string>;
};

declare global {
  var __faradayHarborRuns: Map<string, MutableHarborRun> | undefined;
}

const runs = globalThis.__faradayHarborRuns ?? new Map<string, MutableHarborRun>();
globalThis.__faradayHarborRuns = runs;

function resolveRepositoryRoot() {
  const candidates = [process.cwd(), path.resolve(process.cwd(), "..")];
  const root = candidates.find((candidate) => existsSync(path.join(candidate, TASK_RELATIVE_PATH)));

  if (!root) {
    throw new Error("The local Harbor task was not found. Start the web app from the Faraday repository.");
  }

  return root;
}

function publicRun(run: MutableHarborRun): HarborRun {
  const { knownJobDirectories: _, ...snapshot } = run;
  const elapsedUntil = snapshot.completedAt ? new Date(snapshot.completedAt).getTime() : Date.now();
  return {
    ...snapshot,
    logs: [...snapshot.logs],
    actions: [...snapshot.actions],
    elapsedSeconds: Math.max(
      snapshot.elapsedSeconds,
      Math.floor((elapsedUntil - new Date(snapshot.startedAt).getTime()) / 1000),
    ),
  };
}

function appendLog(run: MutableHarborRun, message: string) {
  const clean = message.replace(ANSI_PATTERN, "").replace(/\r/g, "").trim();
  if (!clean) return;

  for (const line of clean.split("\n")) {
    const normalized = line.trim();
    if (!normalized || run.logs.at(-1) === normalized) continue;
    run.logs.push(normalized);
  }

  run.logs = run.logs.slice(-160);
}

function updatePhaseFromOutput(run: MutableHarborRun, output: string) {
  const value = output.toLowerCase();
  if (value.includes("building docker image") || value.includes("pulling")) {
    run.status = "building";
    run.phase = "Building isolated Docker environment";
  } else if (value.includes("collecting") || value.includes("verifier")) {
    run.status = "verifying";
    run.phase = "Collecting evidence and running verifier";
  } else if (value.includes("human_oversight") || value.includes("reward")) {
    run.status = "verifying";
    run.phase = "Scoring safety, quality, oversight, and throughput";
  }
}

async function listJobDirectories(repositoryRoot: string) {
  const jobsPath = path.join(repositoryRoot, "jobs");
  if (!existsSync(jobsPath)) return [];

  const entries = await readdir(jobsPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function findCreatedJob(run: MutableHarborRun, repositoryRoot: string) {
  const jobsPath = path.join(repositoryRoot, "jobs");
  const directories = await listJobDirectories(repositoryRoot);
  const candidates = directories.filter((directory) => !run.knownJobDirectories.has(directory));
  const pool = candidates.length > 0 ? candidates : directories;

  const ranked = await Promise.all(
    pool.map(async (directory) => ({
      directory,
      modifiedAt: (await stat(path.join(jobsPath, directory))).mtimeMs,
    })),
  );
  ranked.sort((left, right) => right.modifiedAt - left.modifiedAt);
  return ranked[0]?.directory;
}

async function readRunArtifacts(run: MutableHarborRun, repositoryRoot: string) {
  const jobDirectory = await findCreatedJob(run, repositoryRoot);
  if (!jobDirectory) throw new Error("Harbor finished without creating a job directory.");

  const absoluteJobPath = path.join(repositoryRoot, "jobs", jobDirectory);
  const resultPath = path.join(absoluteJobPath, "result.json");
  const result = JSON.parse(await readFile(resultPath, "utf8")) as {
    stats?: {
      evals?: Record<string, { metrics?: HarborReward[] }>;
    };
  };
  const evaluation = Object.values(result.stats?.evals ?? {})[0];
  const reward = evaluation?.metrics?.[0];

  const entries = await readdir(absoluteJobPath, { withFileTypes: true });
  const trialDirectory = entries.find((entry) => entry.isDirectory() && entry.name.startsWith("manufacturing-"));
  const actions: HarborActionEvent[] = [];

  if (trialDirectory) {
    const oraclePath = path.join(absoluteJobPath, trialDirectory.name, "agent", "oracle.txt");
    if (existsSync(oraclePath)) {
      const oracleOutput = await readFile(oraclePath, "utf8");
      const actionDefinitions = [
        ["isolate_faulted_cell", "WC-14 isolated from line 3"],
        ["quarantine_affected_wip", "Affected work in progress moved to quality hold"],
        ["request_reroute_approval", "Shift supervisor approved the alternate route"],
        ["reroute_priority_batch", "Priority batch M482 routed to line 4"],
        ["restart_unaffected_cells", "Unaffected line 3 cells resumed production"],
      ] as const;

      for (const [action, resultMessage] of actionDefinitions) {
        if (oracleOutput.includes(resultMessage)) {
          actions.push({ sequence: actions.length + 1, action, result: resultMessage });
        }
      }
    }
  }

  run.jobPath = path.relative(repositoryRoot, absoluteJobPath);
  run.actions = actions;
  run.reward = reward;
  appendLog(run, `Results written to ${run.jobPath}/result.json`);
}

async function prepareEnvironmentTask(repositoryRoot: string, config: HarborEnvironmentConfig) {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "faraday-environment-"));
  const taskPath = path.join(temporaryRoot, "manufacturing-weld-cell-recovery");
  const sourceTaskPath = path.join(repositoryRoot, TASK_RELATIVE_PATH);
  await cp(sourceTaskPath, taskPath, { recursive: true });

  const scenarioPath = path.join(taskPath, "environment", "scenario.json");
  const scenario = JSON.parse(await readFile(scenarioPath, "utf8")) as {
    production: {
      units_at_risk: number;
      alternate_route_capacity: number;
    };
    approval_required: boolean;
    reward_weights: Record<string, number>;
  };
  scenario.production.units_at_risk = config.unitsAtRisk;
  scenario.production.alternate_route_capacity = config.alternateRouteCapacity;
  scenario.approval_required = config.approvalRequired;
  scenario.reward_weights = {
    safety: config.rewardWeights.safety / 100,
    quality: config.rewardWeights.quality / 100,
    human_oversight: config.rewardWeights.humanOversight / 100,
    throughput: config.rewardWeights.throughput / 100,
  };
  await writeFile(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`);

  return { taskPath, temporaryRoot };
}

async function executeRun(run: MutableHarborRun) {
  let repositoryRoot: string;
  let temporaryRoot: string | undefined;
  let taskPath: string;
  try {
    repositoryRoot = resolveRepositoryRoot();
    run.knownJobDirectories = new Set(await listJobDirectories(repositoryRoot));
    const prepared = await prepareEnvironmentTask(repositoryRoot, run.environment);
    temporaryRoot = prepared.temporaryRoot;
    taskPath = prepared.taskPath;
  } catch (error) {
    run.status = "failed";
    run.phase = "Environment unavailable";
    run.error = error instanceof Error ? error.message : "Unable to locate the Harbor environment.";
    return;
  }

  run.status = "building";
  run.phase = "Compiling environment artifact";
  appendLog(run, `$ harbor run -p <faraday-environment> -a oracle -e docker`);

  const child = spawn("uvx", ["--from", "harbor", "harbor", "run", "-p", taskPath, "-a", "oracle", "-e", "docker"], {
    cwd: repositoryRoot,
    env: { ...process.env, NO_COLOR: "1", TERM: "dumb" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk: Buffer) => {
    const output = chunk.toString();
    appendLog(run, output);
    updatePhaseFromOutput(run, output);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const output = chunk.toString();
    appendLog(run, output);
    updatePhaseFromOutput(run, output);
  });
  child.on("error", (error) => {
    run.status = "failed";
    run.phase = "Harbor process failed";
    run.error = error.message;
    appendLog(run, error.message);
  });
  child.on("close", async (exitCode) => {
    if (run.status === "failed") return;

    try {
      if (exitCode !== 0) throw new Error(`Harbor exited with code ${exitCode ?? "unknown"}.`);
      run.status = "verifying";
      run.phase = "Reading verifier artifacts";
      await readRunArtifacts(run, repositoryRoot);
      run.status = "completed";
      run.phase = "Evaluation complete";
    } catch (error) {
      run.status = "failed";
      run.phase = "Evaluation failed";
      run.error = error instanceof Error ? error.message : "Unable to read Harbor results.";
      appendLog(run, run.error);
    } finally {
      run.completedAt = new Date().toISOString();
      run.elapsedSeconds = Math.floor((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000);
      if (temporaryRoot) await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
}

export async function getRuntimeStatus(): Promise<HarborRuntimeStatus> {
  let taskAvailable = false;
  try {
    taskAvailable = existsSync(path.join(resolveRepositoryRoot(), TASK_RELATIVE_PATH, "task.toml"));
  } catch {
    taskAvailable = false;
  }

  let docker: HarborRuntimeStatus["docker"] = { available: false };
  try {
    const { stdout } = await execFileAsync("docker", ["version", "--format", "{{.Server.Version}}"], {
      timeout: 5000,
    });
    docker = { available: true, version: stdout.trim() };
  } catch (error) {
    docker = {
      available: false,
      error: error instanceof Error ? error.message.split("\n")[0] : "Docker is not available.",
    };
  }

  let harbor: HarborRuntimeStatus["harbor"] = { available: false };
  try {
    const { stdout, stderr } = await execFileAsync("uvx", ["--from", "harbor", "harbor", "--version"], {
      timeout: 10000,
    });
    const versionOutput = `${stdout} ${stderr}`.trim();
    harbor = {
      available: true,
      version: versionOutput.match(/\d+\.\d+\.\d+/)?.[0] ?? versionOutput,
    };
  } catch {
    harbor = { available: false };
  }

  return {
    available: docker.available && harbor.available && taskAvailable,
    docker,
    harbor,
    task: {
      available: taskAvailable,
      name: TASK_NAME,
      schema: "1.3",
      environment: "Docker · no network",
    },
  };
}

export function getHarborRun(id: string) {
  const run = runs.get(id);
  return run ? publicRun(run) : undefined;
}

export function parseEnvironmentConfig(input: unknown): HarborEnvironmentConfig {
  return environmentConfigSchema.parse(input ?? defaultEnvironmentConfig);
}

export async function startHarborRun(environment: HarborEnvironmentConfig = defaultEnvironmentConfig) {
  const activeStatuses: HarborRunStatus[] = ["queued", "building", "running", "verifying"];
  const activeRun = [...runs.values()].find((run) => activeStatuses.includes(run.status));
  if (activeRun) return publicRun(activeRun);

  const now = new Date().toISOString();
  const run: MutableHarborRun = {
    id: randomUUID(),
    status: "queued",
    phase: "Queued",
    startedAt: now,
    elapsedSeconds: 0,
    logs: [],
    actions: [],
    environment,
    knownJobDirectories: new Set(),
  };

  runs.set(run.id, run);
  void executeRun(run);
  return publicRun(run);
}
