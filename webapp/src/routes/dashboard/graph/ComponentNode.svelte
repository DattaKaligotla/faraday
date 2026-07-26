<script lang="ts">
  import { Handle, Position, type NodeProps } from "@xyflow/svelte";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  interface NodeData {
    name: string;
    file: string;
    line: number;
    modifiableCount: number;
    isModifiable: boolean;
  }

  let { data }: NodeProps & { data: NodeData } = $props();

  // Tooltip.Provider sits at the dashboard root via Sidebar.Provider, so we
  // only need Root/Trigger/Content here.
</script>

<Handle type="target" position={Position.Top} />

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <div class="node" class:modifiable={data.isModifiable} {...props}>
        <div class="name">{data.name}</div>
        {#if data.modifiableCount > 0}
          <span class="badge">{data.modifiableCount}</span>
        {/if}
      </div>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content side="top" class="tooltip">
    <div class="tt-name">{data.name}</div>
    <div class="tt-file">{data.file}:{data.line}</div>
    {#if data.modifiableCount > 0}
      <div class="tt-modifiable">
        {data.modifiableCount} modifiable {data.modifiableCount === 1 ? "id" : "ids"}
      </div>
    {/if}
  </Tooltip.Content>
</Tooltip.Root>

<Handle type="source" position={Position.Bottom} />

<style>
  .node {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.14);
    border-radius: 6px;
    padding: 8px 12px;
    min-width: 160px;
    text-align: center;
    position: relative;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    cursor: default;
    color: rgba(0, 0, 0, 0.9);
  }
  .node.modifiable {
    border-color: var(--accent, #3b82f6);
    border-width: 2px;
    background: linear-gradient(180deg, white 60%, rgba(59, 130, 246, 0.1));
  }
  .name {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    color: inherit;
  }
  :global(:root.dark) .node {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.14);
    color: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }
  :global(:root.dark) .node.modifiable {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 60%, rgba(59, 130, 246, 0.18));
  }
  .badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--accent, #3b82f6);
    color: white;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 99px;
    line-height: 1;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  }
  :global(.tooltip) {
    max-width: 360px;
  }
  .tt-name {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .tt-file {
    font-family: var(--mono);
    font-size: 11px;
    opacity: 0.85;
    word-break: break-all;
  }
  .tt-modifiable {
    margin-top: 4px;
    font-size: 11px;
  }
</style>
