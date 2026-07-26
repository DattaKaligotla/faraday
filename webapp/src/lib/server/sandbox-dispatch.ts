import { Writable } from "node:stream";
import { Sandbox } from "@vercel/sandbox";
import { env as dynamicEnv } from "$env/dynamic/private";
import type { JobEvent, JobInput, RunnerEnvironment } from "$runner/types";
import {
  AWS_REGION,
  BLOB_READ_WRITE_TOKEN,
  FARADAY_AGENT_REF,
  FARADAY_SOURCE_TOKEN,
  FIREBASE_PROJECT_ID,
  FIREBASE_SERVICE_ACCOUNT_BASE64,
} from "$env/static/private";
import { child } from "./logger";
import { mintBedrockToken } from "./bedrock-token";

/** Decode a Vercel Sandbox APIError into a loggable shape. */
function decodeApiError(error: unknown): { message: string; statusCode?: number; body: string } {
  const err = error as { message?: string; response?: { statusCode?: number }; json?: unknown; text?: string };
  return {
    message: err.message ?? String(error),
    statusCode: err.response?.statusCode,
    body: JSON.stringify(err.json ?? err.text ?? null).slice(0, 2000),
  };
}

/** Writable that buffers partial chunks and emits one log call per `\n`. */
function lineSink(emit: (line: string) => void): Writable {
  let buf = "";
  return new Writable({
    write(chunk, _encoding, callback) {
      buf += Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk);
      let newLineIndex;
      while ((newLineIndex = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, newLineIndex);
        buf = buf.slice(newLineIndex + 1);
        if (line.length) emit(line);
      }
      callback();
    },
    final(callback) {
      if (buf.length) emit(buf);
      buf = "";
      callback();
    },
  });
}

export interface DispatchInput {
  jobInput: JobInput;
  githubToken: string;
}

const SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;
const FARADAY_REPO_URL = "https://github.com/oscjac/faraday.git";
// Vercel Sandbox clones a `type: "git"` source into /vercel/sandbox by default
// and that's the only path the sandbox user can write to. Pick the runner workdir
// from inside it; root paths like /work are read-only.
const RUNNER_ROOT = "/vercel/sandbox";
const WORKDIR = `${RUNNER_ROOT}/.faraday-work`;

function faradayRef(): string {
  // FARADAY_AGENT_REF is set at build time. VERCEL_GIT_COMMIT_SHA is injected
  // by the Vercel runtime per-deploy and is read dynamically — it's a platform
  // variable, not project config.
  return FARADAY_AGENT_REF || dynamicEnv.VERCEL_GIT_COMMIT_SHA || "main";
}

/**
 * Boot a Vercel Sandbox, install agent-runner, exec the entrypoint, and stream
 * stdout back as parsed JobEvents.
 *
 * The sandbox keeps running independently if the caller stops iterating —
 * Firestore is the durable record. We don't `await` the command's completion
 * here; iteration ends when `logs()` does.
 */
export async function* dispatchJob(input: DispatchInput): AsyncGenerator<JobEvent, void, void> {
  const jobId = input.jobInput.jobId;
  // Single LogLayer instance for everything written by this dispatcher.
  // Output captured from the sandbox itself goes through `sandboxLog` so it can
  // be filtered by `component=sandbox-output` (vs the dispatcher's own
  // `component=sandbox-dispatch`).
  const log = child("sandbox-dispatch", { jobId });
  const sandboxLog = child("sandbox-output", { jobId });
  const t0 = Date.now();

  const ref = faradayRef();
  const source = {
    type: "git" as const,
    url: FARADAY_REPO_URL,
    revision: ref,
    depth: 1,
    username: "x-access-token",
    password: FARADAY_SOURCE_TOKEN,
  };

  log
    .withMetadata({
      repo: input.jobInput.repoFullName,
      ref,
      snapshotKey: input.jobInput.snapshotKey ?? null,
    })
    .info("dispatch start");

  // `phase` describes which step we're currently in; the single outer catch
  // uses it to label the failure event + log line.
  let phase = "Sandbox.create";
  let phaseContext: Record<string, unknown> = { ref };

  try {
    const tCreate = Date.now();
    const sandbox = await Sandbox.create({ runtime: "node22", timeout: SANDBOX_TIMEOUT_MS, source });
    log
      .withMetadata({
        sandboxId: (sandbox as { sandboxId?: string }).sandboxId ?? null,
        durationMs: Date.now() - tCreate,
      })
      .info("Sandbox.create ok");

    // ─── install ─────────────────────────────────────────────────────────────
    phase = "install runCommand";
    phaseContext = { cwd: RUNNER_ROOT };
    log.withMetadata(phaseContext).info("running install");
    const tInstall = Date.now();
    const install = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        "corepack enable && pnpm install --filter @faraday-stack/agent-runner... --frozen-lockfile && pnpm --filter @faraday-stack/agent-runner build",
      ],
      cwd: RUNNER_ROOT,
      stdout: lineSink((l) => sandboxLog.withMetadata({ phase: "install", stream: "stdout" }).info(l)),
      stderr: lineSink((l) => sandboxLog.withMetadata({ phase: "install", stream: "stderr" }).error(l)),
    });
    log.withMetadata({ exitCode: install.exitCode, durationMs: Date.now() - tInstall }).info("install finished");
    if (install.exitCode !== 0) {
      // Funnel non-zero exit into the same catch path as API/runtime failures.
      throw new Error(`agent-runner install exited ${install.exitCode} — see preceding install stderr log lines`);
    }

    phase = "sandbox.mkDir";
    phaseContext = { workdir: WORKDIR };
    await sandbox.mkDir(WORKDIR);

    // ─── runner kickoff ─────────────────────────────────────────────────────
    // Mint a short-term Bedrock API token from the webapp's static AWS
    // credentials (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY). The bearer is the ONLY AWS credential that ever enters
    // the sandbox — raw access keys stay on the host. Token TTL (~12h) comfortably covers SANDBOX_TIMEOUT_MS.
    phase = "mintBedrockToken";
    const bedrockToken = await mintBedrockToken();
    phase = "runner runCommand";

    // Build the runner's process.env as one literal that exactly matches
    // RunnerEnvironment. Every contributing webapp var is imported via
    // $env/static/private above, so the build fails if any are missing — no
    // runtime fallbacks here.
    const runnerEnv: RunnerEnvironment = {
      JOB_INPUT: JSON.stringify(input.jobInput),
      GITHUB_TOKEN: input.githubToken,
      FARADAY_WORKDIR: WORKDIR,
      AWS_REGION,
      AWS_BEARER_TOKEN_BEDROCK: bedrockToken,
      // Must be set at node startup — the Claude Agent SDK reads it at
      // module-load time, so setting it inside the runner is too late.
      CLAUDE_CODE_USE_BEDROCK: "1",
      BLOB_READ_WRITE_TOKEN,
      FARADAY_SNAPSHOT_MAX_BYTES: "1073741824",
      FIREBASE_PROJECT_ID,
      FARADAY_FIREBASE_SA_BASE64: FIREBASE_SERVICE_ACCOUNT_BASE64,
    };

    log
      .withMetadata({
        envKeys: Object.keys(runnerEnv),
        bedrockRegion: runnerEnv.AWS_REGION,
      })
      .info("starting agent-runner");

    phase = "runner runCommand";
    // Spawn the runner from RUNNER_ROOT, NOT WORKDIR. The runner's prepare step
    // does `rm -rf $WORKDIR` then `mkdir $WORKDIR` to clone the customer repo,
    // and if the process cwd is WORKDIR at that moment, every subprocess
    // (including git) inherits a deleted inode and dies with
    // "Unable to read current working directory: No such file or directory".
    phaseContext = { cwd: RUNNER_ROOT, workdir: WORKDIR };
    const tRun = Date.now();
    let stderrLines = 0;
    const cmd = await sandbox.runCommand({
      cmd: "node",
      args: [`${RUNNER_ROOT}/agent-runner/dist/sandbox-entry.js`],
      cwd: RUNNER_ROOT,
      env: runnerEnv,
      detached: true,
      // Live-tail stderr to the logger as the runner emits it. This is where
      // node crashes, unhandled rejections, and Firestore-mirror warnings show up.
      stderr: lineSink((l) => {
        stderrLines += 1;
        sandboxLog.withMetadata({ phase: "runner", stream: "stderr" }).error(l);
      }),
      // We deliberately don't pipe stdout: it carries structured NDJSON events
      // that we parse below and yield to the caller; double-routing would either
      // duplicate or steal those lines.
    });

    // ─── stream runner stdout as parsed events ──────────────────────────────
    phase = "streaming runner output";
    phaseContext = {};
    let buffer = "";
    let stdoutLines = 0;
    let yielded = 0;
    let lastEventType: string | null = null;
    for await (const entry of cmd.logs()) {
      // stderr is piped to the writable above; entries here will be stdout-only.
      if (entry.stream !== "stdout") continue;
      buffer += entry.data;
      let newLineIndex;
      while ((newLineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newLineIndex).trim();
        buffer = buffer.slice(newLineIndex + 1);
        if (!line) continue;
        stdoutLines += 1;
        try {
          const parsed = JSON.parse(line) as { event: JobEvent };
          if (parsed && typeof parsed === "object" && parsed.event) {
            lastEventType = parsed.event.type;
            yielded += 1;
            yield parsed.event;
          }
        } catch {
          // Non-JSON line — log it once so we don't lose it silently.
          sandboxLog
            .withMetadata({ phase: "runner", stream: "stdout", parseError: true })
            .warn(`non-JSON line: ${line.slice(0, 400)}`);
        }
      }
    }
    log
      .withMetadata({
        runDurationMs: Date.now() - tRun,
        totalDurationMs: Date.now() - t0,
        stdoutLines,
        stderrLines,
        yielded,
        lastEventType,
      })
      .info("dispatch end");
  } catch (error) {
    const decoded = decodeApiError(error);
    log
      .withMetadata({ ...phaseContext, ...decoded })
      .withError(error)
      .error(`${phase} failed`);
    const bodyTail = decoded.body && decoded.body !== "null" ? ` — body: ${decoded.body.slice(0, 600)}` : "";
    yield { type: "failed", error: `${phase} failed: ${decoded.message}${bodyTail}` };
    yield { type: "done" };
  }
}
