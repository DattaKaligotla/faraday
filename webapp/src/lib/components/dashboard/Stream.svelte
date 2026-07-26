<script lang="ts">
  import { absTime, dayLabel, toolMeta, targetIdFromCall } from "$lib/dashboard/utils";
  import { phaseLabel } from "$lib/components/prProgress";
  import { relTime } from "$lib/utils";
  import type { RequestItem, ToolCall, PrInfo } from "$lib/dashboard/types";

  interface Props {
    requests: RequestItem[];
    selectedId: string | null;
    onSelect: (id: string) => void;
  }
  let { requests, selectedId, onSelect }: Props = $props();

  function rowTarget(r: RequestItem): string {
    const first = r.toolCalls[0];
    if (first) {
      const t = targetIdFromCall(first);
      if (t) return t;
    }
    const mod = r.pageContext?.modifiables?.[0];
    return mod?.id ?? "—";
  }

  function chipsFor(calls: ToolCall[]) {
    const visible = calls.slice(0, 2);
    const rest = calls.length - visible.length;
    return { visible, rest };
  }

  const groups = $derived.by(() => {
    const out: { day: string; rows: RequestItem[] }[] = [];
    let cur: { day: string; rows: RequestItem[] } | null = null;
    for (const r of requests) {
      const day = dayLabel(r.createdAt);
      if (!cur || cur.day !== day) {
        cur = { day, rows: [] };
        out.push(cur);
      }
      cur.rows.push(r);
    }
    return out;
  });
</script>

{#if !requests.length}
  <div class="stream-empty">
    <div class="empty-glyph">∅</div>
    <div class="empty-title">No requests match the current filters.</div>
    <div class="empty-sub">Clear filters or check the All view.</div>
  </div>
{:else}
  <div class="stream">
    <div class="stream-head">
      <div class="col-time">time</div>
      <div class="col-prompt">prompt · user</div>
      <div class="col-target">target · tools</div>
      <div class="col-status">status</div>
      <div class="col-pr">pr</div>
    </div>
    {#each groups as g (g.day)}
      <div class="stream-group">
        <div class="group-label">
          <span class="group-line"></span>
          <span class="group-day">{g.day}</span>
          <span class="group-count">{g.rows.length}</span>
          <span class="group-line"></span>
        </div>
        {#each g.rows as r (r.id)}
          {@const target = rowTarget(r)}
          {@const chips = chipsFor(r.toolCalls)}
          {@const pr = r.pr as PrInfo | null}
          <div
            class="stream-row"
            class:selected={selectedId === r.id}
            class:failed={r.status === "failed"}
            role="button"
            tabindex="0"
            onclick={() => onSelect(r.id)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(r.id)}
          >
            <div class="col-time">
              <span class="time-abs">{absTime(r.createdAt)}</span>
              <span class="time-rel">{relTime(r.createdAt)}</span>
            </div>
            <div class="col-prompt">
              <div class="prompt-line">
                <span class="prompt-arrow">›</span>
                <span class="prompt-text">{r.prompt || "(empty)"}</span>
              </div>
              <div class="prompt-meta">
                <span class="meta-user">{r.endUserEmail ?? "—"}</span>
                {#if r.orgName}
                  <span class="meta-sep">·</span>
                  <span class="meta-org">{r.orgName}</span>
                {/if}
              </div>
            </div>
            <div class="col-target">
              {#if target !== "—"}
                <span class="target-tag">
                  <span class="target-hash">#</span>{target}
                </span>
              {:else}
                <span class="target-none">—</span>
              {/if}
            </div>
            <div class="col-status">
              <span class={`pill pill-${r.status}`}>
                <span class="pill-dot"></span>
                {r.status}
              </span>
            </div>
            <div class="col-pr">
              {#if !pr}
                <span class="pr-chip pr-none">—</span>
              {:else if pr.status === "running"}
                <span class="pr-chip pr-running">
                  <span class="spinner"></span>
                  {phaseLabel(pr.phase)}
                </span>
              {:else if pr.status === "pr_opened"}
                <span class="pr-chip pr-opened">
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"
                    ><path
                      d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z"
                    /></svg
                  >
                  #{pr.number}
                </span>
              {:else if pr.status === "failed"}
                <span class="pr-chip pr-failed">✕ pr failed</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/each}
    <div class="stream-foot">
      <span class="foot-mono">— end of stream · {requests.length} request{requests.length !== 1 ? "s" : ""} —</span>
    </div>
  </div>
{/if}
