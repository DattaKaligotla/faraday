<script lang="ts">
  import type { LatencySeries } from "$lib/dashboard/analytics-types";
  import MultiLine from "./MultiLine.svelte";

  interface Props {
    latency: LatencySeries;
    xLabels: string[];
  }
  let { latency, xLabels }: Props = $props();

  function fmtMs(value: number | null): string {
    if (value == null) return "—";
    if (value < 1000) return `${Math.round(value)}ms`;
    return `${(value / 1000).toFixed(1)}s`;
  }

  const allMaxMs = $derived.by(() => {
    const all = [...latency.p50, ...latency.p95, ...latency.p99].filter((v): v is number => v != null);
    return all.length ? Math.max(...all) : 0;
  });
</script>

<div class="fa-card fa-col-7">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Response latency</h3>
      <span class="fa-mono-sub">end-to-end · save click time</span>
    </div>
    <div class="fa-card-actions">
      <span style="color: var(--fa-text-4)">seconds</span>
    </div>
  </div>
  <div class="fa-card-body">
    <div class="fa-series-legend">
      <div class="fa-item">
        <span class="fa-swatch" style="background: var(--fa-accent)"></span>
        p50<span class="fa-v" style="margin-left: 6px">{fmtMs(latency.current.p50)}</span>
      </div>
      <div class="fa-item">
        <span class="fa-swatch" style="background: var(--fa-blue)"></span>
        p95<span class="fa-v" style="margin-left: 6px">{fmtMs(latency.current.p95)}</span>
      </div>
      <div class="fa-item">
        <span class="fa-swatch" style="background: var(--fa-red)"></span>
        p99<span class="fa-v" style="margin-left: 6px">{fmtMs(latency.current.p99)}</span>
      </div>
      <div class="fa-item" style="margin-left: auto; color: var(--fa-text-4)">SLO p95 &lt; 10s</div>
    </div>
    <div class="fa-chart-frame">
      <div class="fa-chart-yaxis">
        <span>0s</span><span>{(allMaxMs / 1000).toFixed(0)}s</span>
      </div>
      <MultiLine
        series={[
          { data: latency.p99, color: "#ef4444" },
          { data: latency.p95, color: "#60a5fa" },
          { data: latency.p50, color: "#f97316", strong: true },
        ]}
      />
    </div>
    <div class="fa-chart-xaxis">
      {#each xLabels as label, i (i)}
        <span>{label}</span>
      {/each}
    </div>
  </div>
</div>
