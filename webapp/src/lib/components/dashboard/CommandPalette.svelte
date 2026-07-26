<script lang="ts">
  import { statusColor } from "$lib/dashboard/utils";
  import type { RequestItem } from "$lib/dashboard/types";

  type ActionId =
    | "view-all"
    | "view-failed"
    | "view-live"
    | "view-complex"
    | "view-opened"
    | "export"
    | "copy-key"
    | "go-integration"
    | "go-repos";

  interface Props {
    open: boolean;
    requests: RequestItem[];
    onClose: () => void;
    onSelectRequest: (id: string) => void;
    onAction: (id: ActionId) => void;
  }
  let { open, requests, onClose, onSelectRequest, onAction }: Props = $props();

  let q = $state("");
  let sel = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const ACTIONS: { id: ActionId; label: string; icon: string }[] = [
    { id: "view-all", label: "View: All requests", icon: "▸" },
    { id: "view-failed", label: "View: Failed (24h)", icon: "✕" },
    { id: "view-live", label: "View: Live PR jobs", icon: "●" },
    { id: "view-complex", label: "View: Needs PR", icon: "⤴" },
    { id: "view-opened", label: "View: PR opened", icon: "✓" },
    { id: "export", label: "Export filtered as CSV", icon: "↓" },
    { id: "copy-key", label: "Copy publishable key", icon: "⎘" },
    { id: "go-integration", label: "Go to Integration", icon: "→" },
    { id: "go-repos", label: "Go to Tracked Repos", icon: "→" },
  ];

  type Item =
    | { kind: "header"; label: string }
    | { kind: "action"; id: ActionId; label: string; icon: string }
    | { kind: "request"; req: RequestItem };

  const items = $derived.by<Item[]>(() => {
    const ql = q.toLowerCase().trim();
    const filteredActions = ql ? ACTIONS.filter((a) => a.label.toLowerCase().includes(ql)) : ACTIONS;
    const reqMatches = ql
      ? requests
          .filter(
            (r) =>
              r.prompt.toLowerCase().includes(ql) ||
              (r.endUserEmail ?? "").toLowerCase().includes(ql) ||
              (r.orgName ?? "").toLowerCase().includes(ql),
          )
          .slice(0, 8)
      : requests.slice(0, 5);

    const out: Item[] = [];
    if (filteredActions.length) {
      out.push({ kind: "header", label: "Actions" });
      for (const a of filteredActions) out.push({ kind: "action", ...a });
    }
    if (reqMatches.length) {
      out.push({ kind: "header", label: ql ? "Matching requests" : "Recent" });
      for (const r of reqMatches) out.push({ kind: "request", req: r });
    }
    return out;
  });

  const runnable = $derived(items.filter((i) => i.kind !== "header"));

  $effect(() => {
    void q;
    sel = 0;
  });

  $effect(() => {
    if (open) {
      q = "";
      sel = 0;
      setTimeout(() => inputEl?.focus(), 10);
    }
  });

  function runIdx(i: number) {
    const it = runnable[i];
    if (!it) return;
    if (it.kind === "request") onSelectRequest(it.req.id);
    else if (it.kind === "action") onAction(it.id);
    onClose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      sel = Math.min(runnable.length - 1, sel + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      sel = Math.max(0, sel - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runIdx(sel);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  function runnableIndexOf(itemIdx: number): number {
    let count = -1;
    for (let i = 0; i <= itemIdx; i++) {
      if (items[i].kind !== "header") count++;
    }
    return count;
  }
</script>

{#if open}
  <div class="cmd-overlay" role="presentation" onclick={onClose} onkeydown={(e) => e.key === "Escape" && onClose()}>
    <div
      class="cmd-panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="cmd-input-wrap">
        <span class="cmd-icon">⌘</span>
        <input
          bind:this={inputEl}
          class="cmd-input"
          bind:value={q}
          onkeydown={onKey}
          placeholder="Type a command, prompt, user, org, or target id…"
        />
        <kbd class="cmd-esc">esc</kbd>
      </div>
      <div class="cmd-list">
        {#each items as it, i (i)}
          {#if it.kind === "header"}
            <div class="cmd-header">{it.label}</div>
          {:else}
            {@const myIdx = runnableIndexOf(i)}
            {@const isSel = myIdx === sel}
            {#if it.kind === "request"}
              <div
                class="cmd-item cmd-req"
                class:sel={isSel}
                role="option"
                aria-selected={isSel}
                tabindex="-1"
                onmouseenter={() => (sel = myIdx)}
                onclick={() => runIdx(myIdx)}
                onkeydown={(e) => e.key === "Enter" && runIdx(myIdx)}
              >
                <span class="cmd-item-icon" style:color={statusColor(it.req.status)}>›</span>
                <span class="cmd-item-label">{it.req.prompt}</span>
                <span class="cmd-item-tail">{it.req.orgName ?? ""}</span>
              </div>
            {:else}
              <div
                class="cmd-item"
                class:sel={isSel}
                role="option"
                aria-selected={isSel}
                tabindex="-1"
                onmouseenter={() => (sel = myIdx)}
                onclick={() => runIdx(myIdx)}
                onkeydown={(e) => e.key === "Enter" && runIdx(myIdx)}
              >
                <span class="cmd-item-icon">{it.icon}</span>
                <span class="cmd-item-label">{it.label}</span>
              </div>
            {/if}
          {/if}
        {/each}
        {#if !runnable.length}
          <div class="cmd-empty">No matches.</div>
        {/if}
      </div>
      <div class="cmd-foot">
        <span><kbd>↑↓</kbd> navigate</span>
        <span><kbd>↵</kbd> run</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>
  </div>
{/if}
