<script lang="ts">
  interface Series {
    data: Array<number | null>;
    color: string;
    strong?: boolean;
    dash?: string;
  }
  interface Props {
    series: Series[];
    height?: number;
  }
  let { series, height = 200 }: Props = $props();

  const W = 700;

  const computed = $derived.by(() => {
    const padTop = 8;
    const padBot = 20;
    const innerH = height - padTop - padBot;
    // Flatten and drop null buckets so the y-scale isn't dragged to zero by
    // empty buckets in the latency series.
    const allVals = series.flatMap((s) => s.data).filter((v): v is number => v != null);
    if (allVals.length === 0) return null;
    const max = Math.max(1, ...allVals) * 1.05;
    const firstLen = series[0]?.data.length ?? 0;
    const step = firstLen > 1 ? W / (firstLen - 1) : W;
    const gridY = [0.25, 0.5, 0.75].map((f) => padTop + innerH * (1 - f));

    function pathFor(data: Series["data"]): { d: string; last: [number, number] | null } {
      // Skip over null buckets by ending the path segment and starting a new
      // one. Otherwise a single missing point breaks the whole line.
      let d = "";
      let last: [number, number] | null = null;
      let opening = true;
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        if (v == null) {
          opening = true;
          continue;
        }
        const x = i * step;
        const y = padTop + innerH - (v / max) * innerH;
        d += `${opening ? "M" : "L"}${x},${y} `;
        opening = false;
        last = [x, y];
      }
      return { d: d.trim(), last };
    }
    return { series: series.map((s) => ({ ...s, ...pathFor(s.data) })), gridY };
  });
</script>

{#if computed}
  <svg
    viewBox={`0 0 ${W} ${height}`}
    preserveAspectRatio="none"
    class="fa-chart-svg"
    style="height: {height}px"
    aria-hidden="true"
  >
    {#each computed.gridY as y, i (i)}
      <line class="fa-gridline" x1="0" x2={W} y1={y} y2={y} />
    {/each}
    <line class="fa-axis-line" x1="0" x2={W} y1={height - 20} y2={height - 20} />
    {#each computed.series as s, si (si)}
      <g>
        <path
          d={s.d}
          fill="none"
          stroke={s.color}
          stroke-width={s.strong ? 1.75 : 1.4}
          stroke-dasharray={s.dash ?? null}
          opacity={s.strong ? 1 : 0.9}
        />
        {#if s.last}
          <circle cx={s.last[0]} cy={s.last[1]} r={s.strong ? 3 : 2.5} fill={s.color} />
        {/if}
      </g>
    {/each}
  </svg>
{/if}
