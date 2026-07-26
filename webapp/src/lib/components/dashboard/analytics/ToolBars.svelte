<script lang="ts">
  import type { ToolStat } from "$lib/dashboard/analytics-types";

  interface Props {
    tools: ToolStat[];
    rangeLabel: string;
  }
  let { tools, rangeLabel }: Props = $props();

  const colorFor = (idx: number): string => {
    const palette = ["#f97316", "#60a5fa", "#a78bfa", "#22c55e", "#eab308", "#f43f5e", "#94a3b8"];
    return palette[idx % palette.length];
  };

  const max = $derived(tools.length ? tools[0].count : 1);
  const totalCalls = $derived(tools.reduce((a, t) => a + t.count, 0));
</script>

<div class="fa-card fa-col-5">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Tool call distribution</h3>
      <span class="fa-mono-sub">{totalCalls.toLocaleString()} calls · {rangeLabel}</span>
    </div>
    <div class="fa-card-actions"><span style="color: var(--fa-text-4)">share</span></div>
  </div>
  <div class="fa-card-body">
    {#if tools.length === 0}
      <div class="fa-empty">No tool calls in this window yet.</div>
    {:else}
      <div class="fa-tool-grid">
        {#each tools as tool, i (i)}
          <div class="fa-tool-row">
            <div class="fa-tool-name">
              <span class="fa-dot" style="background: {colorFor(i)}"></span>
              {tool.name}
            </div>
            <div class="fa-tool-bar-wrap">
              <div
                class="fa-tool-bar"
                style="width: {(tool.count / max) * 100}%; background: {colorFor(i)}; opacity: 0.85"
              ></div>
            </div>
            <div class="fa-tool-num">{tool.count.toLocaleString()}</div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
