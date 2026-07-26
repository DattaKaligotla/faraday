<script lang="ts">
  import type { StatusMix } from "$lib/dashboard/analytics-types";

  interface Props {
    statusMix: StatusMix;
    rangeLabel: string;
  }
  let { statusMix, rangeLabel }: Props = $props();

  function pct(n: number): string {
    if (statusMix.total === 0) return "0";
    return ((n / statusMix.total) * 100).toFixed(1);
  }
</script>

<div class="fa-card fa-col-5">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Outcomes</h3>
      <span class="fa-mono-sub">{statusMix.total.toLocaleString()} req · {rangeLabel}</span>
    </div>
    <div class="fa-card-actions">
      <button class="fa-card-tab on" type="button">share</button>
    </div>
  </div>
  <div class="fa-card-body">
    <div class="fa-stacked-row">
      <div class="fa-stacked-bar">
        <div class="fa-seg applied" style="width: {pct(statusMix.applied)}%"></div>
        <div class="fa-seg responded" style="width: {pct(statusMix.responded)}%"></div>
        <div class="fa-seg failed" style="width: {pct(statusMix.failed)}%"></div>
      </div>
    </div>
    <div class="fa-stacked-legend">
      <div class="fa-cell">
        <div class="fa-head"><span class="fa-dot" style="background: var(--fa-green)"></span>Applied</div>
        <div class="fa-num">{statusMix.applied.toLocaleString()}</div>
        <div class="fa-pct">{pct(statusMix.applied)}%</div>
      </div>
      <div class="fa-cell">
        <div class="fa-head"><span class="fa-dot" style="background: var(--fa-amber)"></span>Responded</div>
        <div class="fa-num">{statusMix.responded.toLocaleString()}</div>
        <div class="fa-pct">{pct(statusMix.responded)}%</div>
      </div>
      <div class="fa-cell">
        <div class="fa-head"><span class="fa-dot" style="background: var(--fa-red)"></span>Failed</div>
        <div class="fa-num">{statusMix.failed.toLocaleString()}</div>
        <div class="fa-pct">{pct(statusMix.failed)}%</div>
      </div>
    </div>
    {#if statusMix.topErrors.length > 0}
      <div class="fa-outcomes-errors">
        {#each statusMix.topErrors as err, i (i)}
          <div class="fa-outcomes-error-row">
            <span class="fa-outcomes-error-key">{err.key}</span>
            <span class="fa-outcomes-error-count">{err.count}×</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
