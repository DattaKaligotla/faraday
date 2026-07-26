<script lang="ts">
  import { onMount } from "svelte";
  import { relTime } from "$lib/utils";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import type { PageProps } from "./$types";

  type TenantSource = "manual" | "generated";

  interface Tenant {
    orgId: string;
    orgName: string | null;
    tenantName: string;
    website: string;
    productDescription: string;
    memory: string;
    source: TenantSource;
    currentVersionId: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    generatedAt: string | null;
  }

  interface KnownOrg {
    orgId: string;
    orgName: string | null;
    lastSeenAt: string | null;
    requestCount: number;
  }

  interface Version {
    id: string;
    memory: string;
    source: TenantSource;
    authorUid: string;
    note: string | null;
    createdAt: string | null;
  }

  type AnthropicContentBlock =
    | { type: "text"; text: string }
    | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
    | { type: "tool_result"; tool_use_id: string; content: string };

  interface AnthropicMessage {
    role: "user" | "assistant";
    content: string | AnthropicContentBlock[];
  }

  interface ListRow {
    orgId: string;
    orgName: string | null;
    hasMemory: boolean;
    source: TenantSource | null;
    lastSeenAt: string | null;
    requestCount: number;
  }

  const { data }: PageProps = $props();

  // ── master list ────────────────────────────────────────────────────────────
  let listState = $state<"ready" | "error">("ready");
  let listError = $state("");
  let tenants = $state<Tenant[]>(data.tenants);
  let knownOrgs = $state<KnownOrg[]>(data.knownOrgIds);
  let selectedOrgId = $state<string | null>(null);
  $effect(() => {
    tenants = data.tenants;
    knownOrgs = data.knownOrgIds;
  });

  const rows: ListRow[] = $derived.by(() => {
    const byOrg = new Map<string, ListRow>();
    for (const k of knownOrgs) {
      byOrg.set(k.orgId, {
        orgId: k.orgId,
        orgName: k.orgName,
        hasMemory: false,
        source: null,
        lastSeenAt: k.lastSeenAt,
        requestCount: k.requestCount,
      });
    }
    for (const c of tenants) {
      const existing = byOrg.get(c.orgId);
      byOrg.set(c.orgId, {
        orgId: c.orgId,
        orgName: c.orgName ?? existing?.orgName ?? null,
        hasMemory: !!c.memory,
        source: c.source,
        lastSeenAt: existing?.lastSeenAt ?? null,
        requestCount: existing?.requestCount ?? 0,
      });
    }
    return [...byOrg.values()].sort((a, b) => {
      if (a.hasMemory !== b.hasMemory) return a.hasMemory ? -1 : 1;
      const aTime = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
      const bTime = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
      return bTime - aTime;
    });
  });

  // ── detail editor ──────────────────────────────────────────────────────────
  let detailState = $state<"idle" | "loading" | "ready" | "creating" | "error">("idle");
  let detailError = $state("");
  let editor = $state({
    orgName: "",
    tenantName: "",
    website: "",
    productDescription: "",
    memory: "",
  });
  let editorLoadedFromOrgId = $state<string | null>(null);
  let editorLoadedSource = $state<TenantSource | null>(null);
  let editorBaseline = $state({ memory: "", tenantName: "", website: "", productDescription: "" });
  const editorDirty = $derived(
    editor.memory !== editorBaseline.memory ||
      editor.tenantName !== editorBaseline.tenantName ||
      editor.website !== editorBaseline.website ||
      editor.productDescription !== editorBaseline.productDescription,
  );
  let saveState = $state<"idle" | "saving" | "saved">("idle");

  // ── auto-generation streaming ──────────────────────────────────────────────
  let genState = $state<"idle" | "streaming" | "asking" | "done" | "error">("idle");
  let genError = $state("");
  let messages = $state<AnthropicMessage[]>([]);
  let streamingText = $state("");
  let finalBrief = $state("");
  let pendingQuestion = $state<{ id: string; question: string } | null>(null);
  let questionAnswer = $state("");

  // ── history drawer ─────────────────────────────────────────────────────────
  let historyOpen = $state(false);
  let versionsState = $state<"idle" | "loading" | "ready" | "error">("idle");
  let versions = $state<Version[]>([]);
  let viewingVersion = $state<Version | null>(null);

  // ── add-tenant form ────────────────────────────────────────────────────────
  let addingNew = $state(false);
  let newOrgIdInput = $state("");

  onMount(() => {
    if (!selectedOrgId && rows.length > 0) {
      void selectOrg(rows[0].orgId);
    }
  });

  async function loadList() {
    try {
      const r = await fetch("/api/tenants");
      if (!r.ok) return;
      const body = (await r.json()) as { tenants: Tenant[]; knownOrgIds: KnownOrg[] };
      tenants = body.tenants;
      knownOrgs = body.knownOrgIds;
    } catch {
      /* noop — keep current data on transient failure */
    }
  }

  async function selectOrg(orgId: string) {
    if (selectedOrgId === orgId && editorLoadedFromOrgId === orgId) return;
    if (editorDirty && editorLoadedFromOrgId) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    selectedOrgId = orgId;
    resetGeneration();
    detailState = "loading";
    detailError = "";
    try {
      const r = await fetch(`/api/tenants/${encodeURIComponent(orgId)}`);
      if (r.status === 404) {
        const known = knownOrgs.find((k) => k.orgId === orgId);
        editor = {
          orgName: known?.orgName ?? "",
          tenantName: "",
          website: "",
          productDescription: "",
          memory: "",
        };
        editorBaseline = { memory: "", tenantName: "", website: "", productDescription: "" };
        editorLoadedFromOrgId = orgId;
        editorLoadedSource = null;
        detailState = "creating";
        return;
      }
      if (!r.ok) {
        detailState = "error";
        detailError = `Failed to load (${r.status})`;
        return;
      }
      const c = (await r.json()) as Tenant;
      editor = {
        orgName: c.orgName ?? "",
        tenantName: c.tenantName,
        website: c.website,
        productDescription: c.productDescription,
        memory: c.memory,
      };
      editorBaseline = {
        memory: c.memory,
        tenantName: c.tenantName,
        website: c.website,
        productDescription: c.productDescription,
      };
      editorLoadedFromOrgId = orgId;
      editorLoadedSource = c.source;
      detailState = "ready";
    } catch {
      detailState = "error";
      detailError = "Backend unreachable.";
    }
  }

  async function save(opts: { source?: TenantSource } = {}) {
    if (!selectedOrgId) return;
    saveState = "saving";
    try {
      const body: Record<string, unknown> = {
        orgName: editor.orgName || null,
        tenantName: editor.tenantName,
        website: editor.website,
        productDescription: editor.productDescription,
        memory: editor.memory,
      };
      if (opts.source) body.source = opts.source;
      const r = await fetch(`/api/tenants/${encodeURIComponent(selectedOrgId)}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        alert(`Save failed (${r.status})`);
        saveState = "idle";
        return;
      }
      const c = (await r.json()) as Tenant;
      editorBaseline = {
        memory: c.memory,
        tenantName: c.tenantName,
        website: c.website,
        productDescription: c.productDescription,
      };
      editorLoadedSource = c.source;
      detailState = "ready";
      saveState = "saved";
      setTimeout(() => (saveState = "idle"), 1200);
      // refresh list so badges update
      void loadList();
    } catch {
      alert("Backend unreachable.");
      saveState = "idle";
    }
  }

  function formatSeed(): AnthropicMessage {
    const orgId = selectedOrgId ?? "";
    const orgName = editor.orgName.trim() || orgId;
    const lines = [
      `Generate a tenant memory for the org "${orgName}" (orgId: ${orgId}).`,
      "",
      "Seed fields from the customer:",
      `- Tenant name: ${editor.tenantName.trim() || "(not provided)"}`,
      `- Website: ${editor.website.trim() || "(not provided)"}`,
      `- What we sell them: ${editor.productDescription.trim() || "(not provided)"}`,
    ];
    return { role: "user", content: lines.join("\n") };
  }

  function resetGeneration() {
    genState = "idle";
    genError = "";
    messages = [];
    streamingText = "";
    finalBrief = "";
    pendingQuestion = null;
    questionAnswer = "";
  }

  async function startGenerate() {
    if (!selectedOrgId) return;
    if (!editor.tenantName.trim() && !editor.website.trim() && !editor.productDescription.trim()) {
      alert("Fill at least one seed field (tenant name, website, or what we sell them) before generating.");
      return;
    }
    messages = [formatSeed()];
    streamingText = "";
    finalBrief = "";
    pendingQuestion = null;
    questionAnswer = "";
    await runTurn();
  }

  async function submitQuestionAnswer() {
    if (!pendingQuestion || !questionAnswer.trim()) return;
    const q = pendingQuestion;
    const answer = questionAnswer.trim();
    messages = [
      ...messages,
      {
        role: "assistant",
        content: [{ type: "tool_use", id: q.id, name: "ask_user", input: { question: q.question } }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: q.id, content: answer }],
      },
    ];
    pendingQuestion = null;
    questionAnswer = "";
    await runTurn();
  }

  async function runTurn() {
    if (!selectedOrgId) return;
    streamingText = "";
    genState = "streaming";
    genError = "";
    try {
      const r = await fetch(`/api/tenants/${encodeURIComponent(selectedOrgId)}/generate`, {
        method: "POST",
        body: JSON.stringify({ messages }),
      });
      if (!r.ok || !r.body) {
        genState = "error";
        genError = `Stream failed (${r.status})`;
        return;
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let askedThisTurn: { id: string; question: string } | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }
          if (event.type === "text_delta" && typeof event.delta === "string") {
            streamingText += event.delta;
          } else if (event.type === "tool_use" && event.name === "ask_user") {
            const input = (event.input ?? {}) as { question?: unknown };
            const q = typeof input.question === "string" ? input.question : "";
            const id = typeof event.id === "string" ? event.id : "";
            if (q && id) askedThisTurn = { id, question: q };
          } else if (event.type === "error" && typeof event.message === "string") {
            genState = "error";
            genError = event.message;
            return;
          }
        }
      }
      if (askedThisTurn) {
        pendingQuestion = askedThisTurn;
        genState = "asking";
      } else {
        finalBrief = streamingText.trim();
        genState = finalBrief ? "done" : "error";
        if (!finalBrief) genError = "Agent produced no text.";
      }
    } catch (e) {
      genState = "error";
      genError = e instanceof Error ? e.message : "Stream failed.";
    }
  }

  function acceptBrief() {
    editor.memory = finalBrief;
    resetGeneration();
  }

  function discardBrief() {
    resetGeneration();
  }

  // ── history ────────────────────────────────────────────────────────────────
  async function openHistory() {
    if (!selectedOrgId) return;
    historyOpen = true;
    versionsState = "loading";
    viewingVersion = null;
    try {
      const r = await fetch(`/api/tenants/${encodeURIComponent(selectedOrgId)}/versions`);
      if (!r.ok) {
        versionsState = "error";
        return;
      }
      const data = (await r.json()) as { versions: Version[] };
      versions = data.versions;
      versionsState = "ready";
    } catch {
      versionsState = "error";
    }
  }

  function copyVersionToEditor(v: Version) {
    editor.memory = v.memory;
    historyOpen = false;
  }

  async function restoreVersion(v: Version) {
    if (!selectedOrgId) return;
    if (
      !confirm(
        "Restore this version? It will become the current memory (a new history entry is appended — old versions remain).",
      )
    )
      return;
    editor.memory = v.memory;
    await save({ source: v.source });
    historyOpen = false;
  }

  // ── add new tenant ─────────────────────────────────────────────────────────
  function startAddNew() {
    addingNew = true;
    newOrgIdInput = "";
  }

  async function confirmAddNew() {
    const orgId = newOrgIdInput.trim();
    if (!orgId) return;
    if (rows.some((r) => r.orgId === orgId)) {
      alert(`An entry for "${orgId}" already exists.`);
      return;
    }
    addingNew = false;
    newOrgIdInput = "";
    await selectOrg(orgId);
  }
</script>

<div class="header">
  <h1>Tenants</h1>
  <div class="sub">Per-org memory the agents read when working on requests for that org</div>
</div>

{#if listState === "error"}
  <div class="alert error">{listError}</div>
{:else}
  <div class="tenants-shell">
    <!-- LEFT: master list -->
    <aside class="list-card">
      <div class="list-head">
        <span class="key-label">Orgs</span>
        <button class="btn-ghost btn-xs" onclick={startAddNew}>+ Add</button>
      </div>
      {#if addingNew}
        <div class="add-form">
          <input
            class="search"
            type="text"
            placeholder="orgId (e.g. acme-corp)"
            bind:value={newOrgIdInput}
            autocomplete="off"
            onkeydown={(e) => e.key === "Enter" && confirmAddNew()}
          />
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button class="btn-primary btn-xs" onclick={confirmAddNew} disabled={!newOrgIdInput.trim()}>Create</button>
            <button class="btn-ghost btn-xs" onclick={() => (addingNew = false)}>Cancel</button>
          </div>
        </div>
      {/if}
      {#if rows.length === 0}
        <div class="empty-list">
          No orgs yet. End-user orgs appear here once requests come in via the SDK, or add one manually.
        </div>
      {:else}
        <ul class="org-list">
          {#each rows as row (row.orgId)}
            <li>
              <button class="org-row" class:selected={selectedOrgId === row.orgId} onclick={() => selectOrg(row.orgId)}>
                <div class="org-row-main">
                  <span class="org-name">{row.orgName ?? row.orgId}</span>
                  <span class="org-id">{row.orgId}</span>
                </div>
                <div class="org-row-meta">
                  {#if row.hasMemory}
                    <span class="badge" class:badge-gen={row.source === "generated"}>
                      {row.source === "generated" ? "generated" : "memory"}
                    </span>
                  {:else}
                    <span class="badge badge-empty">no memory</span>
                  {/if}
                  {#if row.lastSeenAt}
                    <span class="seen">{relTime(row.lastSeenAt)}</span>
                  {/if}
                </div>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </aside>

    <!-- RIGHT: detail editor -->
    <section class="detail-card">
      {#if !selectedOrgId}
        <div class="empty-detail">Select an org to view or edit its memory.</div>
      {:else if detailState === "loading"}
        <div style="font-family: var(--mono); font-size: 12px; color: var(--text-subtle);">Loading…</div>
      {:else if detailState === "error"}
        <div class="alert error">{detailError}</div>
      {:else}
        <div class="row-h">
          <div>
            <h3>{editor.orgName || selectedOrgId}</h3>
            <div class="org-id-line">{selectedOrgId}{detailState === "creating" ? " · new" : ""}</div>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-ghost" onclick={openHistory} disabled={detailState === "creating"}>History</button>
            <button class="btn-primary" onclick={() => save()} disabled={!editorDirty || saveState === "saving"}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        <div class="seed-grid">
          <label>
            <span class="key-label">Display name</span>
            <input type="text" bind:value={editor.orgName} placeholder={selectedOrgId} />
          </label>
          <label>
            <span class="key-label">Tenant name</span>
            <input type="text" bind:value={editor.tenantName} placeholder="e.g. Acme Manufacturing" />
          </label>
          <label>
            <span class="key-label">Website</span>
            <input type="text" bind:value={editor.website} placeholder="acme.example" />
          </label>
          <label class="seed-wide">
            <span class="key-label">What we sell them</span>
            <input
              type="text"
              bind:value={editor.productDescription}
              placeholder="One line: what your product does for this org"
            />
          </label>
        </div>

        <div class="row-h memory-head">
          <span class="key-label">Memory (markdown)</span>
          <button
            class="btn-ghost btn-xs"
            onclick={startGenerate}
            disabled={genState === "streaming" || genState === "asking"}
          >
            {genState === "streaming" ? "Generating…" : "Auto-generate"}
          </button>
        </div>

        <textarea
          class="memory-textarea"
          bind:value={editor.memory}
          placeholder="What an agent making UI changes for this org's users should know — industry, scale, terminology, common workflows, pain points."
          rows="14"
        ></textarea>

        {#if genState !== "idle"}
          <div class="gen-card">
            <div class="row-h">
              <span class="key-label">Auto-generation</span>
              <div style="display:flex; gap:6px;">
                {#if genState === "done"}
                  <button class="btn-primary btn-xs" onclick={acceptBrief}>Accept → editor</button>
                  <button class="btn-ghost btn-xs" onclick={discardBrief}>Discard</button>
                {:else if genState === "error"}
                  <button class="btn-ghost btn-xs" onclick={discardBrief}>Close</button>
                {/if}
              </div>
            </div>
            {#if genState === "streaming"}
              <div class="gen-status">Researching… (streaming)</div>
            {:else if genState === "asking"}
              <div class="gen-status">Agent has a clarifying question.</div>
            {:else if genState === "done"}
              <div class="gen-status">Draft ready. Review and accept to copy into the editor.</div>
            {:else if genState === "error"}
              <div class="gen-status err">Error: {genError}</div>
            {/if}

            {#if streamingText || finalBrief}
              <pre class="gen-preview">{finalBrief || streamingText}</pre>
            {/if}

            {#if genState === "asking" && pendingQuestion}
              <div class="ask-block">
                <div class="ask-q">{pendingQuestion.question}</div>
                <textarea class="ask-input" bind:value={questionAnswer} placeholder="Your answer…" rows="2"></textarea>
                <div style="display:flex; gap:6px; margin-top:6px;">
                  <button class="btn-primary btn-xs" onclick={submitQuestionAnswer} disabled={!questionAnswer.trim()}>
                    Send answer
                  </button>
                  <button class="btn-ghost btn-xs" onclick={discardBrief}>Cancel</button>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      {/if}
    </section>
  </div>
{/if}

<Sheet.Root bind:open={historyOpen}>
  <Sheet.Content side="right" class="w-120 sm:max-w-120">
    <Sheet.Header>
      <Sheet.Title>Memory history</Sheet.Title>
      <Sheet.Description>
        Every save with a memory change appends a new version. Restore writes a new entry — history is append-only.
      </Sheet.Description>
    </Sheet.Header>
    <div class="history-body">
      {#if versionsState === "loading"}
        <div style="font-family: var(--mono); font-size: 12px; color: var(--text-subtle);">Loading…</div>
      {:else if versionsState === "error"}
        <div class="alert error">Failed to load versions.</div>
      {:else if versions.length === 0}
        <div class="empty-detail">No versions yet.</div>
      {:else}
        <ul class="version-list">
          {#each versions as v (v.id)}
            <li>
              <button
                class="version-row"
                class:selected={viewingVersion?.id === v.id}
                onclick={() => (viewingVersion = v)}
              >
                <span class="badge" class:badge-gen={v.source === "generated"}>{v.source}</span>
                <span class="version-time">{v.createdAt ? relTime(v.createdAt) : "—"}</span>
              </button>
            </li>
          {/each}
        </ul>
        {#if viewingVersion}
          <div class="version-preview">
            <div class="row-h" style="margin-bottom: 8px;">
              <span class="key-label"
                >{viewingVersion.source} · {viewingVersion.createdAt
                  ? new Date(viewingVersion.createdAt).toLocaleString()
                  : ""}</span
              >
              <div style="display:flex; gap:6px;">
                <button class="btn-ghost btn-xs" onclick={() => copyVersionToEditor(viewingVersion!)}>
                  Copy to editor
                </button>
                <button class="btn-primary btn-xs" onclick={() => restoreVersion(viewingVersion!)}> Restore </button>
              </div>
            </div>
            <pre class="version-text">{viewingVersion.memory}</pre>
          </div>
        {/if}
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

<style>
  .tenants-shell {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 18px;
    align-items: start;
  }
  .list-card,
  .detail-card {
    background: var(--dash-bg-card);
    border: 1px solid var(--dash-border);
    border-radius: 12px;
    padding: 14px 14px 18px;
  }
  .detail-card {
    padding: 22px 24px;
  }
  .list-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 4px 8px;
  }
  .add-form {
    padding: 8px 4px 4px;
  }
  .add-form .search {
    width: 100%;
    border: 1px solid var(--dash-border);
    background: var(--dash-bg-elevated);
    border-radius: 6px;
    padding: 6px 8px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text);
  }
  .org-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .org-row {
    display: flex;
    flex-direction: column;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 8px 10px;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
    color: var(--text);
  }
  .org-row:hover {
    background: var(--dash-bg-elevated);
  }
  .org-row.selected {
    background: var(--dash-bg-elevated);
    border-color: var(--dash-border);
  }
  .org-row-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .org-name {
    font-size: 13px;
    font-weight: 500;
  }
  .org-id {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-subtle);
  }
  .org-row-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .badge {
    font-family: var(--mono);
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--dash-bg-elevated);
    color: var(--text-muted);
    border: 1px solid var(--dash-border);
  }
  .badge.badge-gen {
    color: var(--accent);
    border-color: var(--accent);
  }
  .badge.badge-empty {
    color: var(--text-subtle);
  }
  .seen {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-subtle);
  }
  .empty-list,
  .empty-detail {
    padding: 18px 12px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-subtle);
    text-align: center;
  }
  .row-h {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .org-id-line {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-subtle);
    margin-top: 2px;
  }
  .seed-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin: 18px 0;
  }
  .seed-grid label {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .seed-grid .seed-wide {
    grid-column: 1 / -1;
  }
  .seed-grid input {
    border: 1px solid var(--dash-border);
    background: var(--dash-bg-elevated);
    border-radius: 6px;
    padding: 7px 9px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
  }
  .seed-grid input:focus {
    outline: none;
    border-color: var(--accent);
  }
  .memory-head {
    margin-top: 6px;
    margin-bottom: 6px;
  }
  .memory-textarea {
    width: 100%;
    border: 1px solid var(--dash-border);
    background: var(--dash-bg-elevated);
    border-radius: 8px;
    padding: 12px 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
    line-height: 1.5;
    resize: vertical;
  }
  .memory-textarea:focus {
    outline: none;
    border-color: var(--accent);
  }
  .gen-card {
    margin-top: 18px;
    border: 1px solid var(--dash-border);
    border-radius: 10px;
    padding: 14px 16px;
    background: var(--dash-bg-elevated);
  }
  .gen-status {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-muted);
    margin: 8px 0;
  }
  .gen-status.err {
    color: var(--red);
  }
  .gen-preview {
    background: var(--dash-bg);
    border: 1px solid var(--dash-border);
    border-radius: 6px;
    padding: 10px 12px;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.5;
    color: var(--text);
    white-space: pre-wrap;
    max-height: 260px;
    overflow-y: auto;
    margin: 6px 0 0;
  }
  .ask-block {
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px dashed var(--accent);
    border-radius: 6px;
    background: var(--dash-bg);
  }
  .ask-q {
    font-size: 12px;
    color: var(--text);
    margin-bottom: 6px;
  }
  .ask-input {
    width: 100%;
    border: 1px solid var(--dash-border);
    background: var(--dash-bg-elevated);
    border-radius: 6px;
    padding: 6px 8px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text);
    resize: vertical;
  }
  .btn-xs {
    padding: 4px 8px;
    font-size: 11px;
  }
  .history-body {
    padding: 12px 6px;
  }
  .version-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .version-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 6px 8px;
    cursor: pointer;
    color: var(--text);
  }
  .version-row:hover {
    background: var(--dash-bg-elevated);
  }
  .version-row.selected {
    background: var(--dash-bg-elevated);
    border-color: var(--dash-border);
  }
  .version-time {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text-subtle);
  }
  .version-preview {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--dash-border);
  }
  .version-text {
    background: var(--dash-bg);
    border: 1px solid var(--dash-border);
    border-radius: 6px;
    padding: 10px 12px;
    font-family: var(--mono);
    font-size: 11px;
    line-height: 1.5;
    color: var(--text);
    white-space: pre-wrap;
    max-height: 360px;
    overflow-y: auto;
    margin: 0;
  }
</style>
