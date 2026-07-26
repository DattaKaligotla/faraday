<script lang="ts">
  import { ControlButton, useSvelteFlow } from "@xyflow/svelte";

  // useSvelteFlow() requires a SvelteFlow ancestor; this component is rendered
  // inside <Controls> which sits inside <SvelteFlow>, so context is available.
  const flow = useSvelteFlow();

  // One node-width per click feels right for stepping through the graph
  // without losing your place.
  const PAN_STEP = 80;

  function pan(deltaX: number, deltaY: number) {
    const viewport = flow.getViewport();
    void flow.setViewport({ x: viewport.x + deltaX, y: viewport.y + deltaY, zoom: viewport.zoom }, { duration: 150 });
  }
</script>

<ControlButton aria-label="pan up" onclick={() => pan(0, PAN_STEP)}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    ><polyline points="18 15 12 9 6 15" /></svg
  >
</ControlButton>
<ControlButton aria-label="pan down" onclick={() => pan(0, -PAN_STEP)}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    ><polyline points="6 9 12 15 18 9" /></svg
  >
</ControlButton>
<ControlButton aria-label="pan left" onclick={() => pan(PAN_STEP, 0)}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    ><polyline points="15 18 9 12 15 6" /></svg
  >
</ControlButton>
<ControlButton aria-label="pan right" onclick={() => pan(-PAN_STEP, 0)}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    ><polyline points="9 18 15 12 9 6" /></svg
  >
</ControlButton>
