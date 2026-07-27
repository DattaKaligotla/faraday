<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import ArrowCounterClockwise from "phosphor-svelte/lib/ArrowCounterClockwise";
  import ArrowLeft from "phosphor-svelte/lib/ArrowLeft";
  import ArrowsClockwise from "phosphor-svelte/lib/ArrowsClockwise";
  import Brain from "phosphor-svelte/lib/Brain";
  import Broadcast from "phosphor-svelte/lib/Broadcast";
  import CaretRight from "phosphor-svelte/lib/CaretRight";
  import ChartLineUp from "phosphor-svelte/lib/ChartLineUp";
  import Check from "phosphor-svelte/lib/Check";
  import CheckCircle from "phosphor-svelte/lib/CheckCircle";
  import Clock from "phosphor-svelte/lib/Clock";
  import Cube from "phosphor-svelte/lib/Cube";
  import Database from "phosphor-svelte/lib/Database";
  import Eye from "phosphor-svelte/lib/Eye";
  import Factory from "phosphor-svelte/lib/Factory";
  import FlowArrow from "phosphor-svelte/lib/FlowArrow";
  import Gauge from "phosphor-svelte/lib/Gauge";
  import Lightning from "phosphor-svelte/lib/Lightning";
  import Link from "phosphor-svelte/lib/Link";
  import Package from "phosphor-svelte/lib/Package";
  import Pause from "phosphor-svelte/lib/Pause";
  import Play from "phosphor-svelte/lib/Play";
  import ShieldCheck from "phosphor-svelte/lib/ShieldCheck";
  import SkipForward from "phosphor-svelte/lib/SkipForward";
  import Stack from "phosphor-svelte/lib/Stack";
  import Target from "phosphor-svelte/lib/Target";
  import Trophy from "phosphor-svelte/lib/Trophy";
  import User from "phosphor-svelte/lib/User";
  import Warning from "phosphor-svelte/lib/Warning";
  import Wrench from "phosphor-svelte/lib/Wrench";
  import Logo from "$lib/components/Logo.svelte";
  import type { HarborEnvironmentConfig, HarborRun, HarborRuntimeStatus } from "$lib/demo/harbor-types";
  import "./demo.css";

  type DemoState = "ready" | "running" | "paused" | "complete";
  type ValidationState = "unavailable" | "available" | "running" | "verified";

  const sourceGroups = [
    {
      name: "Business planning",
      systems: [
        { code: "ERP", name: "SAP S/4HANA", signal: "Order M482 · priority 1" },
        { code: "OMS", name: "Order management", signal: "Ship by 16:30" },
        { code: "APS", name: "Production planning", signal: "Line 4 · 24 units spare" },
      ],
    },
    {
      name: "Manufacturing operations",
      systems: [
        { code: "MES", name: "Siemens Opcenter", signal: "18 units in operation 40" },
        { code: "QMS", name: "Quality system", signal: "No active hold" },
        { code: "WMS", name: "Warehouse system", signal: "Material lot A-17 staged" },
        { code: "EAM", name: "IBM Maximo", signal: "WC-14 · 812 runtime hrs" },
      ],
    },
    {
      name: "Engineering + plant",
      systems: [
        { code: "PLM", name: "Teamcenter", signal: "Process rev. C.14" },
        { code: "HIS", name: "SCADA + historian", signal: "Torque signal nominal" },
        { code: "PLC", name: "PLC + robot cells", signal: "12 cells online" },
      ],
    },
    {
      name: "Supply + workforce",
      systems: [
        { code: "SRM", name: "Procurement", signal: "Supplier lots released" },
        { code: "TMS", name: "Transportation", signal: "Dock pickup 17:10" },
        { code: "WFM", name: "Workforce", signal: "Supervisor J. Chen online" },
        { code: "SOP", name: "SOP + policy", signal: "Recovery procedure 7.2" },
      ],
    },
  ];

  const lineThree = [
    { id: "BUF-3", label: "Input buffer", type: "buffer" },
    { id: "WC-11", label: "Weld cell", type: "cell" },
    { id: "WC-12", label: "Weld cell", type: "cell" },
    { id: "WC-13", label: "Weld cell", type: "cell" },
    { id: "WC-14", label: "Weld cell", type: "cell" },
    { id: "QG-3", label: "Quality gate", type: "quality" },
  ];

  const lineFour = [
    { id: "BUF-4", label: "Input buffer", type: "buffer" },
    { id: "WC-21", label: "Weld cell", type: "cell" },
    { id: "WC-22", label: "Weld cell", type: "cell" },
    { id: "WC-23", label: "Weld cell", type: "cell" },
    { id: "WC-24", label: "Weld cell", type: "cell" },
    { id: "QG-4", label: "Quality gate", type: "quality" },
  ];

  const stages = [
    {
      label: "Scenario reset",
      action: "No action",
      observation: "Torque excursion detected at WC-14. Batch M482 has 18 units at risk.",
      rationale: "The RLE has injected a weld-cell failure into a clean copy of plant state.",
      transition: "Nominal → fault detected",
      reward: 0,
    },
    {
      label: "Contain equipment",
      action: "isolate_faulted_cell",
      observation: "WC-14 reports 48.7 Nm against a 42 Nm upper control limit.",
      rationale: "Prevent the faulted cell from processing additional units before moving work.",
      transition: "WC-14 faulted → isolated",
      reward: 0.14,
    },
    {
      label: "Protect product",
      action: "quarantine_affected_wip",
      observation: "Serials M482-031 through M482-048 share the affected process window.",
      rationale: "Move all potentially affected units into a quality-controlled hold state.",
      transition: "18 units at risk → quality hold",
      reward: 0.31,
    },
    {
      label: "Preserve authority",
      action: "request_reroute_approval",
      observation: "Line 4 has capacity, but cross-line movement requires shift-supervisor approval.",
      rationale: "The agent cannot bypass the human gate encoded by the RLE environment.",
      transition: "Reroute proposed → approval pending",
      reward: 0.48,
    },
    {
      label: "Recover flow",
      action: "reroute_priority_batch",
      observation: "J. Chen approved the move. Line 4 has capacity for 24 units.",
      rationale: "Move the priority batch while preserving traceability and the quality hold.",
      transition: "Approval granted → M482 on line 4",
      reward: 0.76,
    },
    {
      label: "Stabilize operation",
      action: "restart_unaffected_cells",
      observation: "Line 3 cells WC-11 through WC-13 are healthy and the alternate route is active.",
      rationale: "Restore unaffected capacity while maintenance retains control of WC-14.",
      transition: "Constrained operation → recovered",
      reward: 1,
    },
  ];

  const candidates = [
    { version: "v0", score: 0.42, note: "Baseline policy" },
    { version: "v1", score: 0.56, note: "Safer action order" },
    { version: "v2", score: 0.64, note: "Complete WIP hold" },
    { version: "v3", score: 0.73, note: "Earlier escalation" },
    { version: "v4", score: 0.84, note: "Capacity-aware routing" },
    { version: "v5", score: 0.94, note: "Champion policy" },
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

  let demoState = $state<DemoState>("ready");
  let validationState = $state<ValidationState>("unavailable");
  let activeStage = $state(0);
  let activeGeneration = $state(0);
  let activeScenario = $state(0);
  let demoTick = $state(0);
  let runtime = $state<HarborRuntimeStatus | null>(null);
  let harborRun = $state<HarborRun | null>(null);
  let demoTimer: ReturnType<typeof setInterval> | undefined;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;

  const currentStage = $derived(stages[activeStage]);
  const currentCandidate = $derived(candidates[activeGeneration]);
  const simClock = $derived(`14:${String(22 + activeStage * 2).padStart(2, "0")}:${activeStage % 2 === 0 ? "08" : "41"}`);
  const episodeProgress = $derived(demoState === "complete" ? 100 : Math.round(((activeStage + activeGeneration) / 10) * 100));

  function systemSignal(code: string, fallback: string) {
    if (code === "HIS") {
      if (activeStage === 0) return "WC-14 torque 48.7 Nm";
      if (activeStage >= 1) return "WC-14 isolated · signal frozen";
    }
    if (code === "PLC") return activeStage >= 1 ? "WC-14 isolated · 11 online" : "WC-14 fault · 11 online";
    if (code === "MES") {
      if (activeStage >= 4) return "M482 rerouted to line 4";
      if (activeStage >= 2) return "18 units held at operation 40";
    }
    if (code === "QMS") return activeStage >= 2 ? "Hold QH-2204 · 18 units" : fallback;
    if (code === "EAM") return activeStage >= 1 ? "WO-8831 created for WC-14" : fallback;
    if (code === "WFM") return activeStage >= 4 ? "J. Chen · reroute approved" : fallback;
    if (code === "APS") return activeStage >= 4 ? "Line 4 reserved · 18 / 24" : fallback;
    if (code === "ERP" && activeStage >= 5) return "Order M482 · recovery on plan";
    return fallback;
  }

  function stationState(id: string) {
    if (id === "WC-14") return activeStage >= 1 ? "isolated" : "fault";
    if (id.startsWith("WC-2")) return activeStage >= 4 ? "running" : "standby";
    if (id === "QG-4") return activeStage >= 4 ? "running" : "standby";
    return "running";
  }

  function resetDemo() {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = undefined;
    demoState = "ready";
    activeStage = 0;
    activeGeneration = 0;
    activeScenario = 0;
    demoTick = 0;
  }

  function finishDemo() {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = undefined;
    activeStage = stages.length - 1;
    activeGeneration = candidates.length - 1;
    activeScenario = 4;
    demoState = "complete";
  }

  function advanceDemo() {
      demoTick += 1;
      if (demoTick <= 5) {
        activeStage = demoTick;
        return;
      }

      const generation = Math.min(candidates.length - 1, demoTick - 5);
      activeGeneration = generation;
      activeScenario = Math.min(4, generation - 1);
      activeStage = stages.length - 1;

      if (generation === candidates.length - 1) finishDemo();
  }

  function runTimer() {
    if (demoTimer) clearInterval(demoTimer);
    demoState = "running";
    demoTimer = setInterval(advanceDemo, 900);
  }

  function startDemo() {
    resetDemo();
    runTimer();
  }

  function pauseDemo() {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = undefined;
    demoState = "paused";
  }

  function stepDemo() {
    if (demoState === "complete") return;
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = undefined;
    demoState = "paused";
    advanceDemo();
  }

  function jumpToStage(index: number) {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = undefined;
    demoState = "paused";
    activeStage = index;
    demoTick = index;
  }

  async function loadRuntime() {
    try {
      const response = await fetch("/api/demo/harbor/status");
      runtime = (await response.json()) as HarborRuntimeStatus;
      validationState = runtime.available ? "available" : "unavailable";
    } catch {
      validationState = "unavailable";
    }
  }

  async function launchOptionalValidation() {
    validationState = "running";
    try {
      const response = await fetch("/api/demo/harbor/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(environmentConfig),
      });
      if (!response.ok) {
        validationState = "available";
        return;
      }
      harborRun = (await response.json()) as HarborRun;
      void pollValidation(harborRun.id);
    } catch {
      validationState = "available";
    }
  }

  async function pollValidation(id: string) {
    try {
      const response = await fetch(`/api/demo/harbor/runs/${id}`);
      if (!response.ok) throw new Error("Validation unavailable");
      harborRun = (await response.json()) as HarborRun;
      if (harborRun.status === "completed") {
        validationState = "verified";
        return;
      }
      if (harborRun.status === "failed") {
        validationState = "available";
        return;
      }
      pollTimer = setTimeout(() => void pollValidation(id), 800);
    } catch {
      validationState = "available";
    }
  }

  onMount(() => {
    void loadRuntime();
  });

  onDestroy(() => {
    if (demoTimer) clearInterval(demoTimer);
    if (pollTimer) clearTimeout(pollTimer);
  });
</script>

<div class="rle-console">
  <header class="console-header">
    <div class="console-brand">
      <a href="/" aria-label="Faraday homepage"><Logo size={22} variant="lockup" /></a>
      <span></span>
      <strong>RLE Studio</strong>
    </div>

    <div class="session-crumbs">
      <span>Environments</span>
      <CaretRight size={13} />
      <strong>Assembly Plant 04</strong>
      <CaretRight size={13} />
      <strong>Weld-cell recovery</strong>
    </div>

    <a class="back-link" href="/">
      <ArrowLeft size={15} />
      Back to site
    </a>
  </header>

  <section class="session-bar">
    <div class="session-title">
      <div class="environment-mark"><Factory size={21} weight="fill" /></div>
      <div>
        <span>Faraday RLE · manufacturing</span>
        <h1>Weld-cell recovery</h1>
      </div>
      <div class="version-pill">env v0.14</div>
    </div>

    <div class="session-definition">
      <strong>A resettable model of this factory, built from its systems of record.</strong>
      <span>The agent runs separately and learns through the environment’s observation and action interface.</span>
    </div>

    <div class="session-controls">
      <button class="icon-action" type="button" onclick={resetDemo} title="Reset demo" aria-label="Reset demo">
        <ArrowCounterClockwise size={17} />
      </button>
      {#if demoState === "running"}
        <button class="icon-action" type="button" onclick={pauseDemo} title="Pause episode" aria-label="Pause episode">
          <Pause size={17} weight="fill" />
        </button>
        <button class="secondary-action" type="button" onclick={finishDemo}>
          <Lightning size={16} weight="fill" />
          Fast-forward
        </button>
      {:else if demoState === "paused"}
        <button class="icon-action" type="button" onclick={runTimer} title="Resume episode" aria-label="Resume episode">
          <Play size={17} weight="fill" />
        </button>
        <button class="secondary-action step-action" type="button" onclick={stepDemo}>
          <SkipForward size={16} weight="fill" />
          Next transition
        </button>
        <button class="icon-action" type="button" onclick={finishDemo} title="Finish training" aria-label="Finish training">
          <Lightning size={17} weight="fill" />
        </button>
      {:else}
        <button class="primary-action" type="button" onclick={startDemo}>
          <Play size={16} weight="fill" />
          {demoState === "complete" ? "Run again" : "Run training episode"}
        </button>
      {/if}
    </div>
  </section>

  <main class="workspace">
    <aside class="systems-panel">
      <div class="panel-title">
        <div>
          <Database size={16} />
          <span>Source systems</span>
        </div>
        <small><i></i>14 / 14 synced</small>
      </div>

      <div class="source-groups">
        {#each sourceGroups as group}
          <section class="source-group">
            <h2>{group.name}</h2>
            {#each group.systems as system}
              <div class:changed={systemSignal(system.code, system.signal) !== system.signal} class="source-row">
                <div class="source-code">{system.code}</div>
                <div class="source-detail">
                  <strong>{system.name}</strong>
                  <span>{systemSignal(system.code, system.signal)}</span>
                </div>
                <Broadcast size={11} weight="fill" />
              </div>
            {/each}
          </section>
        {/each}
      </div>

      <div class="compile-status">
        <ArrowsClockwise size={15} />
        <div>
          <span>Environment compiler</span>
          <strong>State synchronized at {simClock}</strong>
        </div>
      </div>
    </aside>

    <section class="environment-panel">
      <div class="panel-title environment-title">
        <div>
          <Cube size={16} weight="fill" />
          <span>RLE environment</span>
          <em>Separate simulation runtime</em>
        </div>
        <div class="environment-stats">
          <span><Clock size={12} />{simClock}</span>
          <span>Episode 014</span>
          <span class:running={demoState === "running"}>{demoState}</span>
        </div>
      </div>

      <div class="episode-rail" aria-label="Episode stages">
        {#each stages as stage, index}
          <button
            class:reached={index <= activeStage}
            class:active={index === activeStage}
            type="button"
            onclick={() => jumpToStage(index)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.label}</strong>
            {#if index < activeStage}<Check size={11} weight="bold" />{/if}
          </button>
        {/each}
      </div>

      <div class="scenario-alert">
        <div class="alert-icon"><Warning size={18} weight="fill" /></div>
        <div>
          <span>Injected scenario · equipment failure</span>
          <strong>WC-14 torque exceeds control limit during priority batch M482</strong>
        </div>
        <dl>
          <div><dt>Units at risk</dt><dd>18</dd></div>
          <div><dt>Alternate capacity</dt><dd>24</dd></div>
          <div><dt>Ship deadline</dt><dd>16:30</dd></div>
        </dl>
      </div>

      <div class="factory-viewport">
        <div class="floor-header">
          <div>
            <Factory size={14} />
            <span>Final assembly · zone C</span>
          </div>
          <div class="floor-legend">
            <span><i class="running-dot"></i>Running</span>
            <span><i class="standby-dot"></i>Standby</span>
            <span><i class="fault-dot"></i>Fault / isolated</span>
          </div>
        </div>

        <div class="plant-floor">
          <div class="floor-zone zone-maintenance">
            <Wrench size={14} />
            <span>Maintenance bay</span>
            {#if activeStage >= 1}<small>WO-8831 active</small>{/if}
          </div>
          <div class="floor-zone zone-quality">
            <ShieldCheck size={14} />
            <span>Quality hold</span>
            {#if activeStage >= 2}<small>18 units · QH-2204</small>{/if}
          </div>

          <div class="plant-line line-three">
            <div class="line-label">
              <span>LINE 3</span>
              <small>{activeStage >= 1 ? "CONSTRAINED" : "FAULT"}</small>
            </div>
            <div class="station-track">
              {#each lineThree as station, index}
                <div class:cell-fault={station.id === "WC-14" && activeStage === 0} class:cell-isolated={station.id === "WC-14" && activeStage >= 1} class="station">
                  <div class="station-top">
                    {#if station.type === "buffer"}<Package size={14} />
                    {:else if station.type === "quality"}<ShieldCheck size={14} />
                    {:else}<Wrench size={14} />{/if}
                    <i class={stationState(station.id)}></i>
                  </div>
                  <strong>{station.id}</strong>
                  <span>{station.label}</span>
                  {#if station.id === "WC-14"}
                    <small>{activeStage >= 1 ? "ISOLATED" : "48.7 Nm"}</small>
                  {/if}
                </div>
                {#if index < lineThree.length - 1}<FlowArrow size={16} />{/if}
              {/each}
            </div>
          </div>

          <div class:active={activeStage >= 4} class="reroute-path">
            <div class="route-line"></div>
            <div class="route-badge">
              <ArrowsClockwise size={13} />
              <span>{activeStage >= 4 ? "M482 rerouted" : "Alternate route"}</span>
            </div>
          </div>

          <div class="plant-line line-four">
            <div class="line-label">
              <span>LINE 4</span>
              <small>{activeStage >= 4 ? "RECOVERY ACTIVE" : "STANDBY · 24 CAPACITY"}</small>
            </div>
            <div class="station-track">
              {#each lineFour as station, index}
                <div class:recovery-active={activeStage >= 4} class="station">
                  <div class="station-top">
                    {#if station.type === "buffer"}<Package size={14} />
                    {:else if station.type === "quality"}<ShieldCheck size={14} />
                    {:else}<Wrench size={14} />{/if}
                    <i class={stationState(station.id)}></i>
                  </div>
                  <strong>{station.id}</strong>
                  <span>{station.label}</span>
                  {#if station.id === "BUF-4" && activeStage >= 4}<small>M482 · 18</small>{/if}
                </div>
                {#if index < lineFour.length - 1}<FlowArrow size={16} />{/if}
              {/each}
            </div>
          </div>

          {#if activeStage <= 1}
            <div class="batch-token batch-risk"><Package size={12} weight="fill" />M482 · 18</div>
          {:else if activeStage <= 3}
            <div class="batch-token batch-hold"><ShieldCheck size={12} weight="fill" />QH-2204 · 18</div>
          {:else}
            <div class="batch-token batch-recovery"><Package size={12} weight="fill" />M482 · 18</div>
          {/if}

          {#if demoState === "complete"}
            <div class="recovery-result">
              <div class="result-icon"><Trophy size={20} weight="fill" /></div>
              <div>
                <span>Champion policy · v5</span>
                <strong>Operation recovered</strong>
                <small>18 units protected · line 4 active · zero violations</small>
              </div>
              <div>
                <span>Episode reward</span>
                <strong>1.00</strong>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="transition-strip">
        <div class="transition-index">{String(activeStage + 1).padStart(2, "0")}</div>
        <div>
          <span>RLE state transition</span>
          <strong>{currentStage.transition}</strong>
        </div>
        <CaretRight size={15} />
        <div>
          <span>Environment reward</span>
          <strong class="reward-value">+{currentStage.reward.toFixed(2)}</strong>
        </div>
        <div class="constraint-result">
          <ShieldCheck size={15} />
          <span>0 constraint violations</span>
        </div>
      </div>
    </section>

    <aside class="agent-panel">
      <div class="agent-boundary">
        <div>
          <Brain size={16} weight="fill" />
          <span>External agent runner</span>
        </div>
        <small>Not part of the RLE</small>
      </div>

      <div class="agent-identity">
        <div class="agent-avatar">
          <Brain size={30} weight="duotone" />
          <i class:active={demoState === "running"}></i>
        </div>
        <div>
          <span>Operations agent</span>
          <strong>{currentCandidate.version}</strong>
        </div>
        <em>{demoState === "complete" ? "champion" : demoState}</em>
      </div>

      <div class="agent-stack">
        <div><Stack size={13} /><span>Model</span><strong>enterprise-ops-7b</strong></div>
        <div><Brain size={13} /><span>Planner</span><strong>receding horizon</strong></div>
        <div><Link size={13} /><span>Tool harness</span><strong>5 RLE actions</strong></div>
        <div><ShieldCheck size={13} /><span>Authority</span><strong>supervised</strong></div>
      </div>

      <section class="agent-observation">
        <div class="agent-section-title">
          <Eye size={14} />
          <span>Observation from RLE</span>
          <small>{simClock}</small>
        </div>
        <p>{currentStage.observation}</p>
        <div class="observation-fields">
          <div><span>batch</span><strong>M482</strong></div>
          <div><span>fault</span><strong>WC-14</strong></div>
          <div><span>risk</span><strong>18 units</strong></div>
          <div><span>gate</span><strong>{activeStage >= 4 ? "approved" : "required"}</strong></div>
        </div>
      </section>

      <section class="agent-decision">
        <div class="agent-section-title">
          <Target size={14} />
          <span>Agent decision</span>
          <small>{activeStage === 0 ? "waiting" : "proposed"}</small>
        </div>
        <div class="decision-action">
          <Lightning size={16} weight="fill" />
          <code>{currentStage.action}</code>
        </div>
        <p>{currentStage.rationale}</p>
        <div class="confidence-row">
          <span>Policy confidence</span>
          <div><i style={`width: ${62 + activeGeneration * 6}%`}></i></div>
          <strong>{62 + activeGeneration * 6}%</strong>
        </div>
      </section>

      <div class="human-gate">
        <User size={15} />
        <div>
          <span>Human approval gate</span>
          <strong>{activeStage >= 4 ? "Approved by J. Chen" : activeStage === 3 ? "Awaiting J. Chen" : "Not yet requested"}</strong>
        </div>
        {#if activeStage >= 4}<CheckCircle size={16} weight="fill" />{:else}<Clock size={16} />{/if}
      </div>

      <div class="agent-connection">
        <Link size={14} />
        <span>Connected only to the RLE observation + action API</span>
      </div>
    </aside>
  </main>

  <section class="training-dock">
    <div class="dock-heading">
      <div>
        <ChartLineUp size={16} />
        <span>Hill-climb training</span>
      </div>
      <small>Keep the strongest policy · mutate · rerun against the RLE</small>
    </div>

    <div class="candidate-track">
      {#each candidates as candidate, index}
        <div class:reached={index <= activeGeneration} class:active={index === activeGeneration} class="candidate">
          <div class="candidate-bar">
            <i style={`height: ${candidate.score * 100}%`}></i>
            <span>{candidate.score.toFixed(2)}</span>
          </div>
          <div>
            <strong>{candidate.version}</strong>
            <span>{candidate.note}</span>
          </div>
          {#if index < activeGeneration}<CheckCircle size={14} weight="fill" />
          {:else if index === activeGeneration && demoState === "complete"}<Trophy size={14} weight="fill" />{/if}
        </div>
        {#if index < candidates.length - 1}<CaretRight size={14} />{/if}
      {/each}
    </div>

    <div class="dock-summary">
      <div>
        <span>Current fitness</span>
        <strong>{currentCandidate.score.toFixed(2)}</strong>
      </div>
      <div>
        <span>Scenario coverage</span>
        <strong>{demoState === "complete" ? "160 / 160" : `${32 + activeGeneration * 26} / 160`}</strong>
      </div>
      <div>
        <span>Safety violations</span>
        <strong class="safe-value">0</strong>
      </div>
      <div>
        <span>Presentation mode</span>
        <strong>Deterministic replay</strong>
      </div>
      <div class="reward-profile">
        <span>Champion reward profile</span>
        <strong>S 1.00 · Q 0.97 · H 0.91 · T 0.86</strong>
      </div>
      <div class="validation-evidence">
        <span>Optional Harbor evidence</span>
        <div>
          <strong class:verified={validationState === "verified"}>
            {validationState === "verified"
              ? `Verified · ${harborRun?.reward?.overall.toFixed(2) ?? "1.00"}`
              : validationState === "running"
                ? "Running in background"
                : validationState === "available"
                  ? "Available"
                  : "Not required"}
          </strong>
          {#if validationState === "available"}
            <button type="button" onclick={launchOptionalValidation}>Run evidence</button>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <div class="demo-progress"><i style={`width: ${episodeProgress}%`}></i></div>
</div>
