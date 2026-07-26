<script lang="ts">
  import { QUICK_VIEWS } from "$lib/dashboard/views";
  import type { RequestItem } from "$lib/dashboard/types";

  interface Props {
    requests: RequestItem[];
    search: string;
    view: string;
    orgFilter: string;
    statusFilter: string;
    onSearchChange: (v: string) => void;
    onView: (v: string) => void;
    onOrg: (v: string) => void;
    onStatus: (v: string) => void;
    onCommand: () => void;
    searchEl?: HTMLInputElement | null;
  }

  let {
    requests,
    search,
    view,
    orgFilter,
    statusFilter,
    onSearchChange,
    onView,
    onOrg,
    onStatus,
    onCommand,
    searchEl = $bindable(null),
  }: Props = $props();

  const orgs = $derived.by(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const r of requests) {
      const id = r.orgId ?? "__none__";
      const name = r.orgName ?? "— no org —";
      const cur = map.get(id);
      if (cur) cur.count++;
      else map.set(id, { id, name, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  });

  const viewCounts = $derived.by(() => {
    const out: Record<string, number> = {};
    for (const v of QUICK_VIEWS) out[v.id] = requests.filter(v.filter).length;
    return out;
  });

  const STATUS_CHIPS = [
    { id: "all", label: "all" },
    { id: "applied", label: "applied", color: "#22c55e" },
    { id: "responded", label: "responded", color: "#f59e0b" },
    { id: "failed", label: "failed", color: "#ef4444" },
  ] as const;
</script>

<aside class="filters">
  <div class="search-wrap">
    <span class="search-icon">⌕</span>
    <input
      bind:this={searchEl}
      class="search"
      type="text"
      value={search}
      oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
      placeholder="search prompts, users, targets…"
    />
    <kbd class="search-kbd">/</kbd>
  </div>

  <button class="cmd-btn" type="button" onclick={onCommand}>
    <span>Command palette</span>
    <kbd>⌘K</kbd>
  </button>

  <div class="section-label">Quick views</div>
  <div class="quick-views">
    {#each QUICK_VIEWS as v (v.id)}
      <button
        type="button"
        class="qv-row"
        class:active={view === v.id}
        class:danger={v.danger}
        class:live={v.live}
        onclick={() => onView(v.id)}
      >
        <span class="qv-icon">{v.icon}</span>
        <span class="qv-label">{v.label}</span>
        <span class="qv-count">{viewCounts[v.id]}</span>
      </button>
    {/each}
  </div>

  <div class="section-label">Status</div>
  <div class="filter-chips">
    {#each STATUS_CHIPS as s (s.id)}
      <button type="button" class="chip" class:active={statusFilter === s.id} onclick={() => onStatus(s.id)}>
        {#if "color" in s}
          <span class="chip-dot" style:background={s.color}></span>
        {/if}
        {s.label}
      </button>
    {/each}
  </div>

  <div class="section-label">Orgs</div>
  <div class="org-list">
    <button type="button" class="org-row" class:active={orgFilter === "__all__"} onclick={() => onOrg("__all__")}>
      <span class="org-name">All orgs</span>
      <span class="org-count">{requests.length}</span>
    </button>
    {#each orgs as o (o.id)}
      <button type="button" class="org-row" class:active={orgFilter === o.id} onclick={() => onOrg(o.id)}>
        <span class="org-dot"></span>
        <span class="org-name">{o.name}</span>
        <span class="org-count">{o.count}</span>
      </button>
    {/each}
  </div>

  <div class="filters-foot">
    <div class="foot-row">
      <span class="k">stream</span>
      <span class="v"><span class="live-dot"></span> connected</span>
    </div>
    <div class="foot-row">
      <span class="k">last sync</span>
      <span class="v">just now</span>
    </div>
  </div>
</aside>
