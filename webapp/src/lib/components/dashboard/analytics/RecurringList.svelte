<script lang="ts">
  import type { RecurringPrompt } from "$lib/dashboard/analytics-types";

  interface Props {
    recurring: RecurringPrompt[];
    rangeLabel: string;
  }
  let { recurring, rangeLabel }: Props = $props();

  const max = $derived(recurring.length ? recurring[0].count : 1);
</script>

<div class="fa-card fa-col-7">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Recurring prompts</h3>
      <span class="fa-mono-sub">≥2× in last {rangeLabel} · candidates for hard-coded handlers</span>
    </div>
  </div>
  <div class="fa-card-body">
    {#if recurring.length === 0}
      <div class="fa-empty">No recurring prompts in this window yet.</div>
    {:else}
      <div class="fa-pattern-list">
        {#each recurring as p, i (i)}
          <div class="fa-pat-row">
            <div class="fa-pat-prompt" title={p.prompt}>
              <span class="fa-quote">"</span>{p.prompt}<span class="fa-quote">"</span>
            </div>
            <div class="fa-pat-bar-wrap">
              <div
                class="fa-pat-bar"
                style="width: {(p.count / max) * 100}%; background: {p.kind === 'pr'
                  ? 'var(--fa-blue)'
                  : 'var(--fa-accent)'}"
              ></div>
            </div>
            <div class="fa-pat-count">
              {p.count}
              <span class="fa-pat-trend {p.trend > 0 ? 'up' : p.trend < 0 ? 'down' : ''}">
                {p.trend > 0 ? `▲${p.trend}` : p.trend < 0 ? `▼${Math.abs(p.trend)}` : "—"}
              </span>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
