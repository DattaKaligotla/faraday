<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import ArrowLeft from "phosphor-svelte/lib/ArrowLeft";
  import ArrowsClockwise from "phosphor-svelte/lib/ArrowsClockwise";
  import Brain from "phosphor-svelte/lib/Brain";
  import CaretRight from "phosphor-svelte/lib/CaretRight";
  import ChartLineUp from "phosphor-svelte/lib/ChartLineUp";
  import Check from "phosphor-svelte/lib/Check";
  import CheckCircle from "phosphor-svelte/lib/CheckCircle";
  import Database from "phosphor-svelte/lib/Database";
  import Factory from "phosphor-svelte/lib/Factory";
  import FlowArrow from "phosphor-svelte/lib/FlowArrow";
  import Gauge from "phosphor-svelte/lib/Gauge";
  import Link from "phosphor-svelte/lib/Link";
  import Play from "phosphor-svelte/lib/Play";
  import Robot from "phosphor-svelte/lib/Robot";
  import ShieldCheck from "phosphor-svelte/lib/ShieldCheck";
  import Target from "phosphor-svelte/lib/Target";
  import Trophy from "phosphor-svelte/lib/Trophy";
  import Warning from "phosphor-svelte/lib/Warning";
  import Logo from "$lib/components/Logo.svelte";
  import type { HarborEnvironmentConfig, HarborRun, HarborRuntimeStatus } from "$lib/demo/harbor-types";
  import "./demo.css";

  type View = "harness" | "training" | "champion";
  type TrainingState = "idle" | "training" | "verifying" | "complete" | "failed";

  const views: { id: View; label: string }[] = [
    { id: "harness", label: "RLE environment" },
    { id: "training", label: "Train agent" },
    { id: "champion", label: "Validated agent" },
  ];

  const systems = [
    { code: "ERP", name: "ERP", role: "Orders, inventory, cost" },
    { code: "OM", name: "CRM + OMS", role: "Demand and priority orders" },
    { code: "ME", name: "MES / MOM", role: "Routing, WIP, work orders" },
    { code: "AP", name: "APS", role: "Schedules and capacity" },
    { code: "QM", name: "QMS", role: "Inspections, holds, defects" },
    { code: "WM", name: "WMS", role: "Material location and movement" },
    { code: "PL", name: "PLM", role: "BOMs, revisions, process plans" },
    { code: "EA", name: "EAM / CMMS", role: "Assets, maintenance, work history" },
    { code: "SC", name: "SCADA + historian", role: "Process state and time series" },
    { code: "OT", name: "PLC + robots", role: "Machine state, faults, commands" },
    { code: "SR", name: "SRM + procurement", role: "Suppliers, POs, lead times" },
    { code: "TM", name: "TMS + logistics", role: "Inbound and outbound movement" },
    { code: "WF", name: "Workforce", role: "Skills, shifts, certifications" },
    { code: "SO", name: "SOPs + policy", role: "Procedures, authority, limits" },
  ];

  const observations = [
    "Orders + priorities",
    "Production + WIP",
    "Equipment + process",
    "Quality + genealogy",
    "Materials + logistics",
    "People + authority",
  ];

  const actions = [
    "isolate_cell",
    "hold_affected_wip",
    "request_approval",
    "reroute_batch",
    "resume_production",
  ];

  const scenarios = [
    { name: "Weld-cell outage", detail: "Priority batch at risk", difficulty: "Hard" },
    { name: "Quality drift", detail: "Inspection threshold breach", difficulty: "Hard" },
    { name: "Material shortage", detail: "Alternate stock available", difficulty: "Medium" },
    { name: "Rush order", detail: "Schedule conflict detected", difficulty: "Medium" },
    { name: "Labor constraint", detail: "Reduced shift coverage", difficulty: "Hard" },
  ];

  const candidates = [
    { version: "v0", score: 0.42, safety: 0.61, quality: 0.48, judgment: 0.32, throughput: 0.27, change: "Baseline" },
    { version: "v1", score: 0.56, safety: 0.72, quality: 0.58, judgment: 0.44, throughput: 0.49, change: "Safer recovery order" },
    { version: "v2", score: 0.64, safety: 0.79, quality: 0.66, judgment: 0.51, throughput: 0.57, change: "Better hold selection" },
    { version: "v3", score: 0.73, safety: 0.86, quality: 0.75, judgment: 0.64, throughput: 0.66, change: "Earlier escalation" },
    { version: "v4", score: 0.84, safety: 0.94, quality: 0.88, judgment: 0.77, throughput: 0.76, change: "Capacity-aware rerouting" },
    { version: "v5", score: 0.94, safety: 1, quality: 0.97, judgment: 0.91, throughput: 0.86, change: "Champion policy" },
  ];

  const environmentConfig: HarborEnvironmentConfig = {
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

  let view = $state<View>("harness");
  let runtime = $state<HarborRuntimeStatus | null>(null);
  let run = $state<HarborRun | null>(null);
  let runError = $state("");
  let trainingState = $state<TrainingState>("idle");
  let activeGeneration = $state(0);
  let activeScenario = $state(0);
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let climbTimer: ReturnType<typeof setInterval> | undefined;

  const runtimeReady = $derived(runtime?.available === true);
  const currentCandidate = $derived(candidates[activeGeneration] ?? candidates[0]);
  const trainingProgress = $derived(((activeGeneration + 1) / candidates.length) * 100);
  const finalValidationScore = $derived(run?.reward?.overall ?? null);

  async function loadRuntimeStatus() {
    try {
      const response = await fetch("/api/demo/harbor/status");
      runtime = (await response.json()) as HarborRuntimeStatus;
    } catch {
      runtime = null;
    }
  }

  function reconcileTrainingState() {
    if (activeGeneration !== candidates.length - 1) return;
    if (run?.status === "completed") trainingState = "complete";
    else if (run?.status === "failed") trainingState = "failed";
    else trainingState = "verifying";
  }

  async function pollRun(id: string) {
    try {
      const response = await fetch(`/api/demo/harbor/runs/${id}`);
      if (!response.ok) throw new Error("The final validation state could not be read.");
      run = (await response.json()) as HarborRun;

      if (run.status === "completed" || run.status === "failed") {
        if (run.status === "failed") runError = run.error ?? "Final validation failed.";
        reconcileTrainingState();
        return;
      }
      pollTimer = setTimeout(() => void pollRun(id), 700);
    } catch (error) {
      runError = error instanceof Error ? error.message : "The final validation state could not be read.";
      trainingState = "failed";
    }
  }

  async function launchFinalValidation() {
    try {
      const response = await fetch("/api/demo/harbor/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(environmentConfig),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "The champion could not be validated.");
      run = payload as HarborRun;
      void pollRun(run.id);
    } catch (error) {
      runError = error instanceof Error ? error.message : "The champion could not be validated.";
      trainingState = "failed";
    }
  }

  function startHillClimb() {
    if (!runtimeReady || trainingState === "training" || trainingState === "verifying") return;

    if (pollTimer) clearTimeout(pollTimer);
    if (climbTimer) clearInterval(climbTimer);
    view = "training";
    run = null;
    runError = "";
    activeGeneration = 0;
    activeScenario = 0;
    trainingState = "training";
    void launchFinalValidation();

    climbTimer = setInterval(() => {
      activeScenario = (activeScenario + 1) % scenarios.length;
      if (activeGeneration < candidates.length - 1) {
        activeGeneration += 1;
      } else {
        if (climbTimer) clearInterval(climbTimer);
        climbTimer = undefined;
        reconcileTrainingState();
      }
    }, 1050);
  }

  function showChampion() {
    view = "champion";
  }

  onMount(() => {
    void loadRuntimeStatus();
  });

  onDestroy(() => {
    if (pollTimer) clearTimeout(pollTimer);
    if (climbTimer) clearInterval(climbTimer);
  });
</script>

<div class="agent-lab">
  <header class="lab-header">
    <div class="header-brand">
      <a href="/" aria-label="Faraday homepage"><Logo size={22} variant="lockup" /></a>
      <span></span>
      <strong>RLE Studio</strong>
    </div>

    <div class="program-name">
      <Factory size={15} weight="fill" />
      <span>Assembly operations</span>
      <small>Training run 014</small>
    </div>

    <a class="back-link" href="/">
      <ArrowLeft size={15} />
      Back to site
    </a>
  </header>

  <section class="product-definition">
    <div class="definition-copy">
      <span class="eyebrow">Reinforcement learning environments for enterprise operations</span>
      <h1>Train agents against a living model of your enterprise.</h1>
      <p>
        Faraday turns systems of record into a resettable RLE environment. Your agent runs separately and
        learns by acting inside that environment before it touches production.
      </p>
    </div>

    <div class="definition-flow" aria-label="Faraday training flow">
      <div>
        <Database size={18} />
        <span>Systems of record</span>
      </div>
      <CaretRight size={15} />
      <div>
        <Factory size={18} />
        <span>Faraday RLE environment</span>
      </div>
      <ArrowsClockwise size={15} />
      <div class="flow-agent">
        <Brain size={18} />
        <span>Separate agent runner</span>
      </div>
    </div>
  </section>

  <nav class="lab-tabs" aria-label="Agent training workflow">
    {#each views as item, index}
      <button
        class:active={view === item.id}
        type="button"
        onclick={() => (view = item.id)}
        aria-current={view === item.id ? "step" : undefined}
      >
        <span>{String(index + 1).padStart(2, "0")}</span>
        {item.label}
        {#if item.id === "champion" && trainingState === "complete"}
          <CheckCircle size={14} weight="fill" />
        {/if}
      </button>
    {/each}

    <div class:ready={runtimeReady} class="runtime-state">
      <i></i>
      {runtimeReady ? "Training runtime ready" : "Connecting runtime"}
    </div>
  </nav>

  {#if view === "harness"}
    <main class="harness-view">
      <div class="view-heading">
        <div>
          <span>Environment architecture</span>
          <h2>First build the world the agent will learn inside.</h2>
        </div>
        <p>
          Enterprise data defines the state, dynamics, tools, constraints, scenarios, and rewards. The agent
          remains a separate runtime connected only through the RLE interface.
        </p>
      </div>

      <section class="harness-map">
        <div class="systems-column">
          <div class="column-label">
            <Database size={16} />
            <span>Systems of record</span>
            <small>{systems.length} connected</small>
          </div>

          <div class="system-list">
            {#each systems as system}
              <div class="system-row">
                <div class="system-mark">{system.code}</div>
                <div>
                  <strong>{system.name}</strong>
                  <span>{system.role}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <div class="connection-lane" aria-hidden="true">
          <span></span>
          <FlowArrow size={24} />
          <small>sync + compile</small>
        </div>

        <div class="harness-core">
          <div class="core-heading">
            <div>
              <span>Faraday RLE environment</span>
              <strong>Assembly operations v0.1</strong>
            </div>
            <Factory size={24} weight="fill" />
          </div>

          <div class="environment-stack">
            <div class="environment-layer">
              <span class="layer-index">01</span>
              <div>
                <strong>State model</strong>
                <span>Orders, WIP, assets, quality, materials, people, and authority</span>
              </div>
              <small>Resettable</small>
            </div>
            <div class="environment-layer">
              <span class="layer-index">02</span>
              <div>
                <strong>Operational dynamics</strong>
                <span>Cycle times, routing, capacity, failures, queues, and dependencies</span>
              </div>
              <small>Stateful</small>
            </div>
            <div class="environment-layer">
              <span class="layer-index">03</span>
              <div>
                <strong>Scenario generator</strong>
                <span>Equipment, quality, supply, scheduling, labor, and compound disruptions</span>
              </div>
              <small>Variable</small>
            </div>
            <div class="environment-layer">
              <span class="layer-index">04</span>
              <div>
                <strong>Reward + constraints</strong>
                <span>Safety, quality, human authority, throughput, and termination rules</span>
              </div>
              <small>Enforced</small>
            </div>
          </div>

          <div class="environment-interface">
            <div>
              <div class="interface-label">
                <Gauge size={15} />
                <span>Observations</span>
              </div>
              <div class="tag-grid">
                {#each observations as observation}
                  <small>{observation}</small>
                {/each}
              </div>
            </div>
            <div>
              <div class="interface-label">
                <Link size={15} />
                <span>Action API</span>
              </div>
              <div class="tag-grid action-tags">
                {#each actions as action}
                  <small>{action}</small>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <div class="connection-lane output-lane" aria-hidden="true">
          <span></span>
          <ArrowsClockwise size={24} />
          <small>observe ↔ act</small>
        </div>

        <aside class="agent-seed">
          <div class="runner-boundary">Separate runtime</div>
          <div class="seed-visual">
            <div class="agent-orbit orbit-one"></div>
            <div class="agent-orbit orbit-two"></div>
            <Brain size={46} weight="duotone" />
          </div>
          <span>Agent runner</span>
          <h3>Operations agent <em>v0</em></h3>
          <p>The model, memory, planner, and tool harness run outside the RLE environment and can be swapped independently.</p>

          <div class="runner-modules">
            <span>Model</span>
            <span>Memory</span>
            <span>Planner</span>
            <span>Tool harness</span>
          </div>

          <div class="seed-objective">
            <Target size={17} />
            <div>
              <span>Training objective</span>
              <strong>Recover production without violating safety, quality, or human authority.</strong>
            </div>
          </div>

          <button class="primary-action" type="button" onclick={startHillClimb} disabled={!runtimeReady}>
            <Play size={17} weight="fill" />
            Run agent in RLE
          </button>
        </aside>
      </section>

      <section class="training-contract">
        <div>
          <span>RLE environment</span>
          <strong>Resettable assembly operation synthesized from {systems.length} enterprise systems</strong>
        </div>
        <div>
          <span>Agent runtime</span>
          <strong>Separate model, memory, planner, and tool harness connected through the RLE API</strong>
        </div>
        <div>
          <span>Training contract</span>
          <strong>Hill-climb fitness · zero violations · promotion at ≥ 0.90</strong>
        </div>
      </section>
    </main>
  {:else if view === "training"}
    <main class="training-view">
      <div class="training-heading">
        <div>
          <span>Agent optimization inside the RLE</span>
          <h2>Run the agent in the environment. Keep the policy that performs best.</h2>
        </div>

        <div class="training-status">
          {#if trainingState === "training"}
            <ArrowsClockwise size={17} class="spin" />
            <span>Exploring generation {activeGeneration + 1} of {candidates.length}</span>
          {:else if trainingState === "verifying"}
            <ShieldCheck size={17} />
            <span>Champion selected · running final verification</span>
          {:else if trainingState === "complete"}
            <CheckCircle size={17} weight="fill" />
            <span>Champion verified</span>
          {:else if trainingState === "failed"}
            <Warning size={17} weight="fill" />
            <span>Validation needs attention</span>
          {:else}
            <span>Ready to train</span>
          {/if}
        </div>
      </div>

      <div class="progress-track"><span style={`width: ${trainingProgress}%`}></span></div>

      <section class="optimization-grid">
        <div class="fitness-panel">
          <div class="panel-heading">
            <div>
              <ChartLineUp size={18} />
              <span>Fitness by generation</span>
            </div>
            <small>Composite reward</small>
          </div>

          <div class="fitness-chart">
            <div class="chart-threshold"><span>promotion threshold</span></div>
            {#each candidates as candidate, index}
              <div class:visible={index <= activeGeneration} class:active={index === activeGeneration} class="fitness-column">
                <div class="score-label">{index <= activeGeneration ? candidate.score.toFixed(2) : "—"}</div>
                <div class="bar-track">
                  <span style={`height: ${index <= activeGeneration ? candidate.score * 100 : 0}%`}></span>
                </div>
                <strong>{candidate.version}</strong>
              </div>
            {/each}
          </div>

          <div class="candidate-change">
            <span>Selected improvement</span>
            <strong>{currentCandidate.change}</strong>
            <small>+{Math.round((currentCandidate.score - candidates[0].score) * 100)} pts from baseline</small>
          </div>
        </div>

        <aside class="rollout-panel">
          <div class="panel-heading">
            <div>
              <ArrowsClockwise size={18} />
              <span>RLE environment rollout</span>
            </div>
            <small>Scenario {activeScenario + 1} / {scenarios.length}</small>
          </div>

          <div class="rollout-scenario">
            <span>{scenarios[activeScenario].difficulty} scenario</span>
            <h3>{scenarios[activeScenario].name}</h3>
            <p>{scenarios[activeScenario].detail}</p>
          </div>

          <div class="rollout-path">
            <div class="done"><Check size={14} weight="bold" /><span>RLE resets scenario state</span></div>
            <div class="done"><Check size={14} weight="bold" /><span>Agent observes environment</span></div>
            <div class="active"><ArrowsClockwise size={14} /><span>Agent acts · RLE transitions</span></div>
            <div><span></span><span>RLE scores the outcome</span></div>
          </div>

          <div class="harness-signal">
            <ShieldCheck size={17} />
            <span>RLE constraints enforced</span>
            <strong>0 violations</strong>
          </div>
        </aside>
      </section>

      <section class="candidate-lineage">
        <div class="lineage-heading">
          <span>Candidate lineage</span>
          <small>Each generation inherits the strongest policy and explores a better one.</small>
        </div>

        <div class="lineage-row">
          {#each candidates as candidate, index}
            <div class:reached={index <= activeGeneration} class:current={index === activeGeneration} class="lineage-node">
              <div>
                {#if index < activeGeneration}
                  <Check size={16} weight="bold" />
                {:else if index === activeGeneration}
                  <Brain size={17} weight="fill" />
                {:else}
                  <span>{index}</span>
                {/if}
              </div>
              <strong>{candidate.version}</strong>
              <small>{Math.round(candidate.score * 100)}</small>
            </div>
            {#if index < candidates.length - 1}
              <CaretRight class={index < activeGeneration ? "reached" : ""} size={15} />
            {/if}
          {/each}
        </div>
      </section>

      <div class="training-footer">
        <div>
          <strong>{activeGeneration + 1} generations</strong>
          <span>{(activeGeneration + 1) * 32} agent runs</span>
          <span>{(activeGeneration + 1) * 5} RLE scenario variants</span>
        </div>

        {#if trainingState === "complete"}
          <button class="primary-action compact" type="button" onclick={showChampion}>
            <Trophy size={17} weight="fill" />
            Inspect champion
          </button>
        {:else if trainingState === "failed"}
          <button class="secondary-action" type="button" onclick={startHillClimb}>
            <ArrowsClockwise size={17} />
            Retry training
          </button>
        {/if}
      </div>
    </main>
  {:else}
    <main class="champion-view">
      <section class="champion-hero">
        <div class="champion-identity">
          <div class="champion-mark">
            <Trophy size={30} weight="fill" />
          </div>
          <span>Promoted candidate</span>
          <h2>Operations agent <em>v5</em></h2>
          <p>
            Trained inside the assembly RLE environment and selected from six generations for safe, high-quality
            recovery decisions.
          </p>

          <div class="champion-badges">
            <span><CheckCircle size={15} weight="fill" /> Constraints passed</span>
            <span><ShieldCheck size={15} weight="fill" /> Human gates preserved</span>
            <span><Database size={15} weight="fill" /> {systems.length} systems modeled</span>
          </div>
        </div>

        <div class="champion-score">
          <span>Training fitness</span>
          <strong>0.94</strong>
          <small>Promotion threshold 0.90</small>
          <div class="score-ring" aria-hidden="true"><i></i></div>
        </div>
      </section>

      <section class="scorecard">
        <div class="scorecard-heading">
          <div>
            <Gauge size={18} />
            <span>Behavior scorecard</span>
          </div>
          <small>Held-out scenario set</small>
        </div>

        <div class="score-dimensions">
          {#each [
            { name: "Safety", value: 1 },
            { name: "Quality", value: 0.97 },
            { name: "Human judgment", value: 0.91 },
            { name: "Throughput", value: 0.86 },
          ] as dimension}
            <div>
              <span>{dimension.name}</span>
              <strong>{dimension.value.toFixed(2)}</strong>
              <div><i style={`width: ${dimension.value * 100}%`}></i></div>
            </div>
          {/each}
        </div>
      </section>

      <section class="evidence-grid">
        <div class="validation-evidence">
          <div class="panel-heading">
            <div>
              <ShieldCheck size={18} />
              <span>Held-out RLE validation</span>
            </div>
            {#if trainingState === "complete"}
              <small class="success-label">Verified</small>
            {:else}
              <small>Awaiting run</small>
            {/if}
          </div>

          <div class="validation-result">
            <div>
              <span>Isolated runtime reward</span>
              <strong>{finalValidationScore === null ? "—" : finalValidationScore.toFixed(2)}</strong>
            </div>
            <div>
              <span>State transitions</span>
              <strong>{run?.actions.length ?? 5}</strong>
            </div>
            <div>
              <span>Constraint violations</span>
              <strong>0</strong>
            </div>
          </div>

          <div class="verification-path">
            {#each ["Fault isolated", "WIP protected", "Approval received", "Batch rerouted", "Line recovered"] as step}
              <span><CheckCircle size={15} weight="fill" />{step}</span>
            {/each}
          </div>
        </div>

        <div class="deployment-boundary">
          <div class="panel-heading">
            <div>
              <Robot size={18} />
              <span>Production boundary</span>
            </div>
            <small>Controlled autonomy</small>
          </div>

          <div class="boundary-list">
            <div><span>Can execute</span><strong>Low-risk recovery actions</strong></div>
            <div><span>Must escalate</span><strong>Cross-line moves and quality exceptions</strong></div>
            <div><span>Cannot change</span><strong>Safety rules, quality limits, authority model</strong></div>
            <div><span>Monitored by</span><strong>Production harness and human operator</strong></div>
          </div>
        </div>
      </section>

      <div class="champion-footer">
        <div>
          <CheckCircle size={20} weight="fill" />
          <span><strong>Ready for supervised deployment</strong> The RLE stays the proving ground; only the validated agent is deployed.</span>
        </div>
        <button class="secondary-action" type="button" onclick={startHillClimb}>
          <ArrowsClockwise size={17} />
          Run another climb
        </button>
      </div>
    </main>
  {/if}
</div>
