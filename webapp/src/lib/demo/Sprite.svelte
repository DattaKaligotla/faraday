<script lang="ts">
  import type { Snippet } from "svelte";
  import { getTimeline } from "./timeline.svelte";

  type Args = { localTime: number; progress: number; t: number };

  let { start, end, children }: { start: number; end: number; children: Snippet<[Args]> } = $props();

  const tl = getTimeline();

  let visible = $derived(tl.time >= start && tl.time <= end);
  let localTime = $derived(Math.max(0, tl.time - start));
  let p = $derived(Math.min(1, localTime / Math.max(0.0001, end - start)));
</script>

{#if visible}
  {@render children({ localTime, progress: p, t: tl.time })}
{/if}
