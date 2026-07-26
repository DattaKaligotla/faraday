<script lang="ts">
  import type { VolumeSeries } from "$lib/dashboard/analytics-types";
  import AreaChart from "./AreaChart.svelte";

  interface Props {
    volume: VolumeSeries;
    rangeLabel: string;
    total: number;
    deltaPct: number | null;
  }
  let { volume, rangeLabel, total, deltaPct }: Props = $props();

  const peak = $derived(Math.max(0, ...volume.buckets));
  const priorTotal = $derived(volume.priorPeriod.reduce((a, b) => a + b, 0));
  const unitLabel = $derived(volume.unit === "hour" ? "hr" : volume.unit);
</script>

<div class="fa-card fa-col-8">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Request volume</h3>
      <span class="fa-mono-sub">
        total · {total.toLocaleString()}
        {#if deltaPct !== null}
          ·
          <span style="color: var({deltaPct >= 0 ? '--fa-green' : '--fa-red'})">
            {deltaPct >= 0 ? "▲" : "▼"}
            {Math.abs(deltaPct)}%
          </span>
          vs prior {rangeLabel}
        {/if}
      </span>
    </div>
    <div class="fa-card-actions">
      <button class="fa-card-tab on" type="button">volume</button>
    </div>
  </div>
  <div class="fa-card-body">
    <div class="fa-series-legend">
      <div class="fa-item">
        <span class="fa-swatch" style="background: var(--fa-accent)"></span>
        this {rangeLabel}
        <span class="fa-v" style="margin-left: 6px">{total.toLocaleString()}</span>
      </div>
      <div class="fa-item">
        <span class="fa-swatch fa-swatch-dashed"></span>
        prior {rangeLabel}
        <span class="fa-v" style="margin-left: 6px">{priorTotal.toLocaleString()}</span>
      </div>
      <div class="fa-item fa-dot" style="margin-left: auto">
        <span class="fa-swatch" style="background: var(--fa-green)"></span>
        peak <span class="fa-v" style="margin-left: 4px">{peak}/{unitLabel}</span>
      </div>
    </div>
    <div class="fa-chart-frame">
      <div class="fa-chart-yaxis">
        <span>0</span><span>{Math.round(peak * 0.5)}</span><span>{peak}</span>
      </div>
      <AreaChart data={volume.buckets} compare={volume.priorPeriod} />
    </div>
    <div class="fa-chart-xaxis">
      {#each volume.xLabels as label, i (i)}
        <span>{label}</span>
      {/each}
    </div>
  </div>
</div>
