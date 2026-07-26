<script lang="ts">
  import "$lib/components/dashboard/console.css";
  import { onMount, onDestroy } from "svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { deserialize } from "$app/forms";
  import { attachHotkeys, downloadCsv, requestsToCsv } from "$lib/dashboard/utils";
  import type { PrInfo, RequestItem } from "$lib/dashboard/types";
  import type { JobEvent } from "@faraday-stack/agent-runner/types";
  import FiltersSidebar from "$lib/components/dashboard/FiltersSidebar.svelte";
  import Stream from "$lib/components/dashboard/Stream.svelte";
  import Drawer from "$lib/components/dashboard/Drawer.svelte";
  import CommandPalette from "$lib/components/dashboard/CommandPalette.svelte";
  import Toast from "$lib/components/dashboard/Toast.svelte";
  import ModeToggle from "$lib/components/ModeToggle.svelte";
  import { QUICK_VIEWS } from "$lib/dashboard/views";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  // Local state seeded from the server load. Optimistic mid-stream patches
  // (applyEventToRow) mutate this; invalidateAll() after terminal events
  // re-runs load and the $effect below resyncs.
  let allRequests = $state<RequestItem[]>(data.requests);
  $effect(() => {
    allRequests = data.requests;
  });
  const linkedRepo = $derived(data.linkedRepo);

  let search = $state("");
  let view = $state("all");
  let orgFilter = $state("__all__");
  let statusFilter = $state("all");
  let selectedId = $state<string | null>(null);
  let cmdOpen = $state(false);
  let toastMsg = $state("");
  let searchEl = $state<HTMLInputElement | null>(null);

  let prEventsById = $state<Record<string, JobEvent[]>>({});
  let prMaxSeqById = $state<Record<string, number>>({});
  let prInFlightById = $state<Record<string, boolean>>({});
  let prPollerById: Record<string, ReturnType<typeof setInterval>> = {};

  const filtered = $derived.by(() => {
    const viewObj = QUICK_VIEWS.find((v) => v.id === view) ?? QUICK_VIEWS[0];
    const ql = search.toLowerCase().trim();
    return allRequests
      .filter((request) => viewObj.filter(request))
      .filter((request) => statusFilter === "all" || request.status === statusFilter)
      .filter((request) => orgFilter === "__all__" || (request.orgId ?? "__none__") === orgFilter)
      .filter(
        (request) =>
          !ql ||
          request.prompt.toLowerCase().includes(ql) ||
          (request.endUserEmail ?? "").toLowerCase().includes(ql) ||
          (request.orgName ?? "").toLowerCase().includes(ql),
      )
      .sort((a, b) => {
        const ax = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bx = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bx - ax;
      });
  });

  const selected = $derived(selectedId ? (allRequests.find((r) => r.id === selectedId) ?? null) : null);
  const selectedEvents = $derived(selectedId ? (prEventsById[selectedId] ?? []) : []);
  const selectedInFlight = $derived(selectedId ? (prInFlightById[selectedId] ?? false) : false);

  async function hydrateEvents(id: string, after = -1) {
    try {
      const r = await fetch(`/api/requests/${encodeURIComponent(id)}/events${after >= 0 ? `?after=${after}` : ""}`);
      if (!r.ok) return;
      const body = (await r.json()) as { events: Array<{ seq: number; event: JobEvent }> };
      if (!body.events.length) return;
      const cur = after < 0 ? [] : (prEventsById[id] ?? []);
      const next = [...cur, ...body.events.map((e) => e.event)];
      prEventsById = { ...prEventsById, [id]: next };
      prMaxSeqById = { ...prMaxSeqById, [id]: body.events[body.events.length - 1].seq };
      // Incremental polls reflect a still-running job; apply each new event to
      // the in-memory row so the pipeline visualization updates without a
      // full reload. Initial hydration (after < 0) replays the entire history
      // and would flicker a completed row through historical phases.
      if (after >= 0) {
        for (const e of body.events) applyEventToRow(id, e.event);
      }
    } catch {}
  }

  function startPolling(id: string) {
    stopPolling(id);
    prPollerById[id] = setInterval(() => {
      const after = prMaxSeqById[id] ?? -1;
      void hydrateEvents(id, after).then(() => {
        const r = allRequests.find((x) => x.id === id);
        if (r?.pr?.status !== "running") {
          stopPolling(id);
        }
      });
    }, 2000);
  }

  function stopPolling(id: string) {
    const t = prPollerById[id];
    if (t) {
      clearInterval(t);
      delete prPollerById[id];
    }
  }

  function appendEvent(id: string, ev: JobEvent) {
    const cur = prEventsById[id] ?? [];
    prEventsById = { ...prEventsById, [id]: [...cur, ev] };
  }

  function applyEventToRow(id: string, ev: JobEvent) {
    const i = allRequests.findIndex((x) => x.id === id);
    if (i < 0) return;
    const cur = allRequests[i].pr;
    if (!cur) return;
    let patch: Partial<PrInfo> | null = null;
    switch (ev.type) {
      case "prepare:start":
        patch = { phase: "preparing" };
        break;
      case "prepare:done":
      case "agent:start":
        patch = { phase: "agent_running" };
        break;
      case "agent:done":
      case "pr:opening":
        patch = { phase: "opening_pr" };
        break;
      case "snapshot:upload_start":
        patch = { phase: "uploading_snapshot" };
        break;
      case "pr:opened":
        patch = {
          status: "pr_opened",
          phase: "done",
          url: ev.url,
          number: ev.number,
          branch: ev.branch,
          summary: ev.summary,
          error: null,
        };
        break;
      case "pr:no_changes":
        patch = {
          status: "failed",
          phase: "done",
          error: "Agent produced no edits.",
          summary: ev.summary,
        };
        break;
      case "failed":
        patch = { status: "failed", phase: "failed", error: ev.error };
        break;
    }
    if (!patch) return;
    const next = [...allRequests];
    next[i] = { ...next[i], pr: { ...cur, ...patch } };
    allRequests = next;
  }

  function selectRow(id: string) {
    const wasOpen = selectedId === id;
    selectedId = wasOpen ? null : id;
    if (!wasOpen) {
      void hydrateEvents(id);
      const r = allRequests.find((x) => x.id === id);
      if (r?.pr?.status === "running" && !prInFlightById[id]) startPolling(id);
    } else {
      stopPolling(id);
    }
  }

  async function createPR(id: string) {
    if (prInFlightById[id]) return;
    prInFlightById = { ...prInFlightById, [id]: true };
    prEventsById = { ...prEventsById, [id]: [] };
    prMaxSeqById = { ...prMaxSeqById, [id]: -1 };
    stopPolling(id);
    // Optimistically replace the row's pr with a fresh running stub so a
    // prior `failed` status and error message clear immediately. The SSE
    // stream below will overwrite phase as events arrive; invalidateAll()
    // reconciles server-only fields on terminal events.
    {
      const idx = allRequests.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const cur = allRequests[idx].pr;
        const next = [...allRequests];
        next[idx] = {
          ...next[idx],
          pr: {
            jobId: cur?.jobId ?? "pending",
            status: "running",
            phase: "preparing",
            repoFullName: cur?.repoFullName ?? linkedRepo ?? "",
            branch: null,
            url: null,
            number: null,
            summary: null,
            error: null,
            startedAt: new Date().toISOString(),
            openedAt: null,
            mergedAt: null,
            closedAt: null,
            lastEventAt: null,
          },
        };
        allRequests = next;
      }
    }
    try {
      const r = await fetch(`/api/requests/${encodeURIComponent(id)}/pr`, {
        method: "POST",
      });
      if (!r.ok || !r.body) {
        const ev: JobEvent = { type: "failed", error: `dispatch failed (${r.status})` };
        appendEvent(id, ev);
        applyEventToRow(id, ev);
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;
            try {
              const parsed = JSON.parse(json) as JobEvent;
              appendEvent(id, parsed);
              applyEventToRow(id, parsed);
              if (
                parsed.type === "pr:opened" ||
                parsed.type === "pr:no_changes" ||
                parsed.type === "failed" ||
                parsed.type === "done"
              ) {
                void invalidateAll();
              }
            } catch {}
          }
        }
      }
    } catch (e) {
      const ev: JobEvent = { type: "failed", error: (e as Error).message };
      appendEvent(id, ev);
      applyEventToRow(id, ev);
    } finally {
      prInFlightById = { ...prInFlightById, [id]: false };
    }
  }

  async function deleteRequest(id: string) {
    if (!confirm("Delete this request? This cannot be undone.")) return;
    try {
      const fd = new FormData();
      fd.set("id", id);
      const r = await fetch("?/delete", { method: "POST", body: fd });
      const result = deserialize(await r.text());
      if (result.type === "failure" || result.type === "error") {
        toastMsg = `Delete failed (${r.status})`;
        return;
      }
      if (selectedId === id) selectedId = null;
      toastMsg = `Deleted ${id}`;
      await invalidateAll();
    } catch {
      toastMsg = "Backend unreachable.";
    }
  }

  function doAction(kind: "create-pr" | "retry-pr" | "copy-id" | "delete", r: RequestItem) {
    if (kind === "create-pr" || kind === "retry-pr") {
      if (linkedRepo === null) {
        toastMsg = "Link a GitHub repo in Integration settings first.";
        return;
      }
      void createPR(r.id);
      toastMsg = `PR job dispatched for ${r.id}`;
    } else if (kind === "copy-id") {
      void navigator.clipboard?.writeText(r.id);
      toastMsg = `Copied ${r.id}`;
    } else if (kind === "delete") {
      void deleteRequest(r.id);
    }
  }

  function onCmdAction(id: string) {
    if (id.startsWith("view-")) {
      view = id.slice(5);
    } else if (id === "export") {
      if (!filtered.length) {
        toastMsg = "Nothing to export — current filter has no rows.";
        return;
      }
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadCsv(`faraday-requests-${stamp}.csv`, requestsToCsv(filtered));
      toastMsg = `Exported ${filtered.length} ${filtered.length === 1 ? "row" : "rows"} to CSV`;
    } else if (id === "copy-key") {
      toastMsg = "Open Settings to copy your publishable key.";
      void goto("/dashboard/settings");
    } else if (id === "go-integration") {
      void goto("/dashboard/integration");
    } else if (id === "go-repos") {
      void goto("/dashboard/repos");
    }
  }

  function selectByOffset(off: number) {
    const list = filtered;
    if (!list.length) return;
    const i = list.findIndex((r) => r.id === selectedId);
    let next: number;
    if (i < 0) next = off > 0 ? 0 : list.length - 1;
    else next = Math.max(0, Math.min(list.length - 1, i + off));
    selectedId = list[next].id;
    setTimeout(() => {
      const el = document.querySelector(".stream-row.selected");
      if (el) el.scrollIntoView({ block: "nearest" });
    }, 0);
  }

  let detachHotkeys: (() => void) | null = null;

  onMount(() => {
    detachHotkeys = attachHotkeys({
      j: () => selectByOffset(1),
      k: () => selectByOffset(-1),
      arrowdown: () => selectByOffset(1),
      arrowup: () => selectByOffset(-1),
      escape: () => {
        if (cmdOpen) cmdOpen = false;
        else if (selectedId) selectedId = null;
      },
      "/": () => searchEl?.focus(),
      "mod+k": () => (cmdOpen = true),
      p: () => {
        const r = selected;
        if (!r) return;
        if (r.pr?.status === "failed") doAction("retry-pr", r);
        else if (r.status === "responded" && (!r.pr || r.pr.status !== "pr_opened")) doAction("create-pr", r);
      },
      g: () => {
        if (filtered.length) selectedId = filtered[0].id;
      },
    });
  });

  onDestroy(() => {
    detachHotkeys?.();
    for (const id of Object.keys(prPollerById)) stopPolling(id);
  });
</script>

<div class="faraday-console">
  <header class="page-head">
    <div class="page-title">
      <h1>User requests</h1>
      <span class="title-mono">/dashboard/requests</span>
    </div>
    <div class="page-actions">
      <ModeToggle />
      <button type="button" class="hd-btn" onclick={() => (cmdOpen = true)}>
        <span class="hd-btn-label">command</span>
        <kbd>⌘K</kbd>
      </button>
      <a class="hd-btn hd-btn-primary" href="/dashboard/integration">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          ><path d="M12 5v14M5 12h14" /></svg
        >
        New integration
      </a>
    </div>
  </header>

  <div class="three-pane">
    <FiltersSidebar
      requests={allRequests}
      {search}
      {view}
      {orgFilter}
      {statusFilter}
      onSearchChange={(v) => (search = v)}
      onView={(v) => (view = v)}
      onOrg={(v) => (orgFilter = v)}
      onStatus={(v) => (statusFilter = v)}
      onCommand={() => (cmdOpen = true)}
      bind:searchEl
    />

    <Stream requests={filtered} {selectedId} onSelect={selectRow} />

    <Drawer
      r={selected}
      events={selectedEvents}
      inFlight={selectedInFlight}
      onClose={() => (selectedId = null)}
      onAction={doAction}
    />
  </div>
</div>

<CommandPalette
  open={cmdOpen}
  requests={allRequests}
  onClose={() => (cmdOpen = false)}
  onSelectRequest={(id) => {
    selectRow(id);
    cmdOpen = false;
  }}
  onAction={onCmdAction}
/>

<Toast msg={toastMsg} onDone={() => (toastMsg = "")} />
