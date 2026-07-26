<script lang="ts">
  import type { Snippet } from "svelte";
  import { Timeline, setTimeline } from "./timeline.svelte";

  let {
    duration = 12,
    width = 1280,
    height = 720,
    children,
  }: { duration: number; width?: number; height?: number; children: Snippet } = $props();

  const tl = new Timeline();
  setTimeline(tl);

  let host: HTMLDivElement | undefined = $state();
  let scale = $state(1);

  $effect(() => {
    let raf = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      tl.time = ((now - startedAt) / 1000) % duration;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  $effect(() => {
    if (!host) return;
    const parent = host.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(() => {
      const r = parent.getBoundingClientRect();
      scale = Math.min(r.width / width, r.height / height);
    });
    ro.observe(parent);
    return () => ro.disconnect();
  });
</script>

<div
  class="faraday-demo-stage"
  bind:this={host}
  style:width="{width}px"
  style:height="{height}px"
  style:transform="translate(-50%, -50%) scale({scale})"
>
  {@render children()}
</div>

<style>
  .faraday-demo-stage {
    position: absolute;
    left: 50%;
    top: 50%;
    transform-origin: center;
    background: #0c0c0c;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  }
</style>
