<script lang="ts">
  interface Props {
    data: number[];
    width?: number;
    height?: number;
    accent?: string;
    fill?: boolean;
  }
  let { data, width = 100, height = 24, accent = "var(--fa-accent)", fill = true }: Props = $props();

  const computed = $derived.by(() => {
    if (!data.length) return null;
    const max = Math.max(1, ...data);
    const step = data.length > 1 ? width / (data.length - 1) : width;
    const points: Array<[number, number]> = data.map((v, i) => [i * step, height - (v / max) * (height - 2) - 1]);
    const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
    const fillPath = `${path} L${width},${height} L0,${height} Z`;
    return { path, fillPath };
  });
</script>

{#if computed}
  <svg {width} {height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
    {#if fill}
      <path d={computed.fillPath} fill={accent} fill-opacity="0.10" />
    {/if}
    <path
      d={computed.path}
      fill="none"
      stroke={accent}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
{/if}
