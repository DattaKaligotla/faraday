<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import { SvelteFlow, Background, Controls, MiniMap, type Node, type Edge } from "@xyflow/svelte";
  import "@xyflow/svelte/dist/style.css";
  import dagre from "@dagrejs/dagre";
  import type { ComponentGraph } from "$lib/server/schemas";
  import type { SerializedRepoGraph } from "$lib/server/serialize";
  import ComponentNode from "./ComponentNode.svelte";
  import PanControls from "./PanControls.svelte";

  // Track the app's dark-mode class on <html> (`:root.dark`, set by the
  // dashboard's theme toggle). xyflow's colorMode follows it directly so the
  // graph palette matches whatever the rest of the dashboard is showing.
  let isDark = $state(false);
  let observer: MutationObserver | null = null;
  onMount(() => {
    if (!browser) return;
    const root = document.documentElement;
    isDark = root.classList.contains("dark");
    observer = new MutationObserver(() => {
      isDark = root.classList.contains("dark");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  });
  onDestroy(() => observer?.disconnect());
  const colorMode = $derived(isDark ? "dark" : "light");

  interface Props {
    graph: SerializedRepoGraph | null;
  }
  const { graph: record }: Props = $props();
  const nodeTypes = { component: ComponentNode };

  const graph = $derived(record?.graph ?? null);
  const layout = $derived.by(() => layoutGraph(graph));

  const nodes = $derived<Node[]>(
    layout.map((node) => ({
      id: node.id,
      type: "component",
      position: { x: node.x, y: node.y },
      // xyflow's MiniMap only draws nodes that pass nodeHasDimensions (i.e.
      // have measured / explicit / initial width+height). Our Tooltip wrapper
      // was preventing the post-mount ResizeObserver measurement, leaving the
      // minimap blank. Set the dimensions explicitly so the minimap renders
      // immediately and doesn't depend on measurement.
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data: {
        name: node.name,
        file: node.file,
        line: node.line,
        modifiableCount: node.modifiableCount,
        isModifiable: node.modifiableCount > 0,
      },
    })),
  );
  const edges = $derived<Edge[]>(
    (graph?.edges ?? []).map((edge, index) => ({
      id: `e${index}`,
      source: edge.from,
      target: edge.to,
    })),
  );

  interface LayoutNode {
    id: string;
    name: string;
    file: string;
    line: number;
    modifiableCount: number;
    x: number;
    y: number;
  }

  // Dagre's layered top-down layout: parents above, children below, with
  // edge-crossing minimization. The hand-rolled depth heuristic we had before
  // also placed children below parents but didn't minimize crossings, so on
  // realistic graphs (multiple parents per child, fan-out) the rendering
  // looked horizontal even when the depth was correct.
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 56;

  function layoutGraph(input: ComponentGraph | null): LayoutNode[] {
    if (!input) return [];
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 32, ranksep: 80, marginx: 16, marginy: 16 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const component of input.components) {
      g.setNode(component.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    }
    for (const edge of input.edges) {
      // Skip edges whose endpoints aren't both registered (defensive — the
      // parser already filters unresolved imports, but a stale graph blob
      // from an older parser version might slip through).
      if (g.hasNode(edge.from) && g.hasNode(edge.to)) g.setEdge(edge.from, edge.to);
    }
    dagre.layout(g);
    return input.components.map((component) => {
      const positioned = g.node(component.id);
      return {
        id: component.id,
        name: component.name,
        file: component.file,
        line: component.line,
        modifiableCount: component.modifiableIds.length,
        // Dagre positions the node center; SvelteFlow positions the top-left,
        // so subtract half the dimensions.
        x: (positioned?.x ?? 0) - NODE_WIDTH / 2,
        y: (positioned?.y ?? 0) - NODE_HEIGHT / 2,
      };
    });
  }

  function modifiableCount(input: ComponentGraph | null): number {
    if (!input) return 0;
    return input.components.reduce((count, component) => (component.modifiableIds.length > 0 ? count + 1 : count), 0);
  }
</script>

<div class="canvas">
  {#if !graph}
    <div class="canvas-empty">Click <strong>Refresh</strong> to build the graph for this repo.</div>
  {:else if graph.components.length === 0}
    <div class="canvas-empty">No React components found in this repo.</div>
  {:else}
    <SvelteFlow {nodes} {edges} fitView {nodeTypes} {colorMode}>
      <Background />
      <MiniMap
        pannable
        zoomable
        nodeColor={(node) => (node.data?.isModifiable ? "#3b82f6" : "#9ca3af")}
        nodeStrokeWidth={2}
      />
      <Controls>
        <PanControls />
      </Controls>
    </SvelteFlow>
  {/if}
</div>

{#if record}
  <div class="footer-meta">
    <span class="chip">{graph?.components.length ?? 0} components</span>
    <span class="chip">{graph?.edges.length ?? 0} edges</span>
    <span class="chip accent">{modifiableCount(graph)} modifiable</span>
  </div>
{/if}

<style>
  .canvas {
    height: 70vh;
    min-height: 480px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .canvas-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(127, 127, 127, 1);
    font-size: 13px;
  }
  :global(:root.dark) .canvas {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .footer-meta {
    margin-top: 8px;
    display: inline-flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .chip {
    font-family: var(--mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 99px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--text);
  }
  .chip.accent {
    background: var(--accent, #2563eb);
    color: white;
  }
</style>
