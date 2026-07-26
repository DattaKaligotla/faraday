<script lang="ts">
  import type { FunnelSnapshot } from "$lib/dashboard/analytics-types";

  interface Props {
    funnel: FunnelSnapshot;
    rangeLabel: string;
  }
  let { funnel, rangeLabel }: Props = $props();

  const steps = $derived([
    { label: "Complex prompts", count: funnel.complexPrompts },
    { label: "Agent run started", count: funnel.agentRunStarted },
    { label: "Diff generated", count: funnel.diffGenerated },
    { label: "PR opened", count: funnel.prOpened },
    { label: "PR merged", count: funnel.prMerged },
  ]);

  const max = $derived(steps[0]?.count ?? 0);
  const endToEnd = $derived(steps[0].count === 0 ? 0 : (steps[steps.length - 1].count / steps[0].count) * 100);
</script>

<div class="fa-card fa-col-4">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>PR pipeline funnel</h3>
      <span class="fa-mono-sub">complex prompts → merged</span>
    </div>
    <div class="fa-card-actions"><span style="color: var(--fa-text-4)">{rangeLabel}</span></div>
  </div>
  <div class="fa-card-body">
    <div class="fa-funnel">
      {#each steps as step, i (i)}
        {@const drop = i > 0 && steps[i - 1].count > 0 ? Math.round((1 - step.count / steps[i - 1].count) * 100) : 0}
        <div class="fa-funnel-row">
          <div class="fa-funnel-label">
            <span class="fa-step-no">{String(i + 1).padStart(2, "0")}</span>{step.label}
          </div>
          <div class="fa-funnel-bar-wrap">
            <div
              class="fa-funnel-bar"
              style="width: {max > 0 ? (step.count / max) * 100 : 0}%; opacity: {1 - i * 0.12}"
            ></div>
          </div>
          <div class="fa-funnel-count">{step.count}</div>
          <div class="fa-funnel-conv {drop > 20 ? 'warn' : ''}">
            {i === 0 ? "—" : `−${drop}%`}
          </div>
        </div>
      {/each}
    </div>
    <div class="fa-funnel-summary">
      <span>end-to-end conversion</span>
      <span style="color: var(--fa-accent)">
        {endToEnd.toFixed(1)}% · {steps[steps.length - 1].count} merged
      </span>
    </div>
  </div>
</div>
