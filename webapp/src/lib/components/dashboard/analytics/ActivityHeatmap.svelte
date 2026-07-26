<script lang="ts">
  interface Props {
    heatmap: number[][];
  }
  let { heatmap }: Props = $props();

  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  const stats = $derived.by(() => {
    let max = 0;
    let peakDay = 0;
    let peakHour = 0;
    for (let d = 0; d < heatmap.length; d++) {
      const row = heatmap[d];
      for (let h = 0; h < row.length; h++) {
        if (row[h] > max) {
          max = row[h];
          peakDay = d;
          peakHour = h;
        }
      }
    }
    return { max, peakDay, peakHour };
  });

  function shade(v: number): string {
    if (stats.max === 0 || v === 0) return "var(--fa-bg-2)";
    const t = v / stats.max;
    const alpha = 0.1 + t * 0.85;
    return `rgba(249, 115, 22, ${alpha.toFixed(3)})`;
  }
</script>

<div class="fa-card fa-col-8">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Activity by hour × day</h3>
      <span class="fa-mono-sub">requests · last 7d · UTC</span>
    </div>
    <div class="fa-card-actions">
      {#if stats.max > 0}
        <span style="color: var(--fa-text-4)">peak</span>
        <span style="color: var(--fa-accent)">
          {days[stats.peakDay]}
          {String(stats.peakHour).padStart(2, "0")}:00 · {stats.max} req
        </span>
      {/if}
    </div>
  </div>
  <div class="fa-card-body">
    <div class="fa-heatmap">
      <div class="fa-hm-corner"></div>
      {#each Array.from({ length: 24 }, (_, h) => h) as h (h)}
        <div class="fa-hm-hour">{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</div>
      {/each}
      {#each heatmap as row, d (d)}
        <div class="fa-hm-day">{days[d]}</div>
        {#each row as v, h (h)}
          <div
            class="fa-hm-cell"
            style="background: {shade(v)}"
            title="{days[d]} {String(h).padStart(2, '0')}:00 · {v} req"
          ></div>
        {/each}
      {/each}
    </div>
    <div class="fa-hm-scale">
      less
      <span class="fa-swatches">
        <span style="background: var(--fa-bg-2)"></span>
        <span style="background: rgba(249,115,22,0.20)"></span>
        <span style="background: rgba(249,115,22,0.45)"></span>
        <span style="background: rgba(249,115,22,0.70)"></span>
        <span style="background: rgba(249,115,22,0.95)"></span>
      </span>
      more
      <span style="margin-left: auto">0 — {stats.max} req / cell</span>
    </div>
  </div>
</div>
