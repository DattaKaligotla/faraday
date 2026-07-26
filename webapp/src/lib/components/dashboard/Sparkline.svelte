<script lang="ts">
  interface Props {
    data: number[];
    width?: number;
    height?: number;
    accent?: string;
  }
  let { data, width = 180, height = 28, accent = "var(--accent)" }: Props = $props();

  const view = $derived.by(() => {
    if (!data.length) return null;
    const max = Math.max(1, ...data);
    const step = data.length > 1 ? width / (data.length - 1) : width;
    const points = data.map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 2) - 1;
      return [x, y] as const;
    });
    const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
    const fill = `${path} L${width},${height} L0,${height} Z`;
    const last = points[points.length - 1];
    return { path, fill, last };
  });
</script>

{#if view}
  <svg {width} {height} viewBox={`0 0 ${width} ${height}`}>
    <path d={view.fill} fill={accent} fill-opacity="0.12" />
    <path d={view.path} fill="none" stroke={accent} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx={view.last[0]} cy={view.last[1]} r="2.5" fill={accent} />
  </svg>
{/if}
