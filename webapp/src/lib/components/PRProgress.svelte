<script lang="ts">
  import type { JobEvent } from "@faraday-stack/agent-runner/types";
  import { PHASE_ORDER, type Phase, formatJobEvent, phaseStates } from "./prProgress";

  interface Props {
    phase: Phase | null;
    events: JobEvent[];
    isLive: boolean;
    error?: string | null;
  }

  let { phase, events, isLive, error }: Props = $props();

  const states = $derived(phaseStates(phase));
  const formatted = $derived(events.map((e) => formatJobEvent(e as JobEvent)).filter((f) => f !== null));
  const lastAgentTextIndex = $derived.by(() => {
    let last = -1;
    for (let i = 0; i < events.length; i++) {
      if (events[i]?.type === "agent:text_delta") last = i;
    }
    return last;
  });

  function iconChar(icon: string): string {
    switch (icon) {
      case "edit":
        return "✎";
      case "read":
        return "▤";
      case "search":
        return "⌕";
      case "shell":
        return "›_";
      case "git":
        return "⎇";
      case "ok":
        return "✓";
      case "error":
        return "!";
      case "agent":
        return "◆";
      default:
        return "·";
    }
  }
</script>

<div class="progress">
  <div class="stepper">
    {#each PHASE_ORDER as step}
      {@const s = states[step.key]}
      <div class="step" class:active={s === "active"} class:complete={s === "complete"}>
        <span class="dot">
          {#if s === "complete"}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="5 12 10 17 19 7" />
            </svg>
          {:else if s === "active" && isLive}
            <span class="pulse"></span>
          {/if}
        </span>
        <span class="lbl">{step.label}</span>
      </div>
    {/each}
    {#if states.failed === "failed"}
      <div class="step failed">
        <span class="dot">!</span>
        <span class="lbl">Failed</span>
      </div>
    {/if}
  </div>

  {#if error}
    <div class="err">{error}</div>
  {/if}

  {#if formatted.length > 0}
    <ul class="timeline">
      {#each formatted as f, i}
        {@const isLatestAgentText = i === lastAgentTextIndex && events[i]?.type === "agent:text_delta"}
        {@const isCollapsedAgentText = events[i]?.type === "agent:text_delta" && !isLatestAgentText}
        <li class="ev tone-{f.tone}" class:collapsed={isCollapsedAgentText}>
          <span class="ev-icon" data-icon={f.icon}>{iconChar(f.icon)}</span>
          <span class="ev-body">
            <span class="ev-label">{f.label}</span>
            {#if f.detail}<span class="ev-detail">{f.detail}</span>{/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .progress {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .stepper {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: center;
  }
  .step {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-family: var(--mono);
    color: var(--text-subtle);
  }
  .step .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid var(--dash-border);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
  }
  .step.complete {
    color: var(--text-muted);
  }
  .step.complete .dot {
    border-color: var(--text-muted);
    color: var(--text);
  }
  .step.active {
    color: var(--text);
  }
  .step.active .dot {
    border-color: var(--text);
  }
  .step.failed {
    color: var(--red);
  }
  .step.failed .dot {
    border-color: var(--red);
    color: var(--red);
  }
  .pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    animation: pulse 1.2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }
  .err {
    font-size: 12px;
    color: var(--red);
    font-family: var(--mono);
  }
  .timeline {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 280px;
    overflow-y: auto;
    border-top: 1px solid var(--dash-border);
    padding-top: 8px;
  }
  .ev {
    display: flex;
    gap: 8px;
    align-items: baseline;
    padding: 3px 0;
    font-size: 12px;
    line-height: 1.45;
  }
  .ev.collapsed {
    opacity: 0.55;
  }
  .ev.collapsed .ev-detail {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .ev-icon {
    width: 16px;
    flex: none;
    text-align: center;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-subtle);
  }
  .ev-body {
    display: flex;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }
  .ev-label {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-subtle);
    white-space: nowrap;
  }
  .ev-detail {
    color: var(--text-muted);
    word-break: break-word;
    min-width: 0;
  }
  .tone-success .ev-icon,
  .tone-success .ev-label {
    color: var(--text);
  }
  .tone-error .ev-icon,
  .tone-error .ev-label,
  .tone-error .ev-detail {
    color: var(--red);
  }
</style>
