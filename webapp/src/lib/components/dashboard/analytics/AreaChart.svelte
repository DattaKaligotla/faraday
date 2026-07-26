<script lang="ts">
  interface Props {
    data: number[];
    height?: number;
    accent?: string;
    compare?: number[] | null;
  }
  let { data, height = 220, accent = "var(--fa-accent)", compare = null }: Props = $props();

  const W = 700;

  const computed = $derived.by(() => {
    if (!data.length) return null;
    const padTop = 8;
    const padBot = 20;
    const innerH = height - padTop - padBot;
    const max = Math.max(1, ...data, ...(compare ?? []));
    const step = data.length > 1 ? W / (data.length - 1) : W;
    const pt = (v: number, i: number): [number, number] => [i * step, padTop + innerH - (v / max) * innerH];

    const points: Array<[number, number]> = data.map(pt);
    const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
    const fillPath = `${path} L${W},${padTop + innerH} L0,${padTop + innerH} Z`;
    const comparePath = compare
      ? compare
          .map((v, i) => {
            const [x, y] = pt(v, i);
            return i === 0 ? `M${x},${y}` : `L${x},${y}`;
          })
          .join(" ")
      : null;
    const gridY = [0.25, 0.5, 0.75].map((f) => padTop + innerH * (1 - f));
    const peakIdx = data.indexOf(Math.max(...data));
    const peak = points[peakIdx];
    const last = points[points.length - 1];
    return { path, fillPath, comparePath, gridY, peak, last };
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
    {#if computed.comparePath}
      <path
        d={computed.comparePath}
        fill="none"
        stroke="var(--fa-text-4)"
        stroke-width="1.25"
        stroke-dasharray="3 3"
        opacity="0.8"
      />
    {/if}
    <path d={computed.fillPath} fill={accent} fill-opacity="0.10" />
    <path
      d={computed.path}
      fill="none"
      stroke={accent}
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx={computed.peak[0]} cy={computed.peak[1]} r="3" fill={accent} />
    <circle cx={computed.peak[0]} cy={computed.peak[1]} r="6" fill={accent} fill-opacity="0.18" />
    <circle cx={computed.last[0]} cy={computed.last[1]} r="3" fill={accent} />
  </svg>
{/if}
