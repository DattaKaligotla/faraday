<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { relTime } from "$lib/utils";
  import type { PageProps } from "./$types";

  interface Integration {
    publishableKey: string;
    ownerEmail?: string | null;
    allowedOrigins?: string[];
    plan?: string;
    createdAt?: string | null;
  }
  interface LinkedRepoLite {
    id: number;
    owner: string;
    name: string;
    fullName: string;
    private?: boolean;
    defaultBranch?: string | null;
  }
  interface Github {
    installationId: number | null;
    account: { id: number | null; login: string | null; type: string | null } | null;
    linkedRepo: LinkedRepoLite | null;
    linkedRepos: LinkedRepoLite[];
    installedAt: string | null;
  }
  interface Repo {
    id: number;
    owner: string;
    name: string;
    fullName: string;
    private: boolean;
    defaultBranch: string | null;
    pushedAt: string | null;
  }

  const { data }: PageProps = $props();

  let integration = $state<Integration | null>(data.integration);
  let intState = $state<"empty" | "ready" | "error">(data.integration ? "ready" : "empty");
  let intError = $state("");
  let copyState = $state(false);

  let gh = $state<Github | null>(data.github);
  let ghState = $state<"loading" | "disconnected" | "installed" | "error">(
    data.github ? "installed" : data.integration ? "disconnected" : "loading",
  );
  let ghError = $state("");
  $effect(() => {
    integration = data.integration;
    gh = data.github;
  });

  let allRepos = $state<Repo[]>([]);
  let selectedRepoId = $state<number | null>(data.github?.linkedRepo?.id ?? data.github?.linkedRepos?.[0]?.id ?? null);
  let repoSearch = $state("");
  let repoSaveState = $state<"idle" | "saving" | "saved">("idle");
  let repoLoadError = $state("");

  const filteredRepos = $derived(
    repoSearch ? allRepos.filter((r) => r.fullName.toLowerCase().includes(repoSearch.toLowerCase())) : allRepos,
  );

  onMount(() => {
    const params = page.url.searchParams;
    const status = params.get("github");
    if (status === "error") {
      const reason = params.get("reason") || "unknown";
      setTimeout(() => alert(`GitHub install failed: ${reason}`), 50);
    }
    if (status === "request_pending") {
      setTimeout(() => alert("Install requested — an organization owner must approve it on github.com."), 50);
    }
    if (status) {
      const cleanUrl = page.url.pathname;
      goto(cleanUrl, { replaceState: true });
    }
    if (data.github) void loadRepos();
  });

  async function createIntegration() {
    try {
      const r = await fetch("/api/integration", { method: "POST" });
      if (!r.ok) {
        intState = "error";
        intError = `Failed to create key (${r.status})`;
        return;
      }
      integration = await r.json();
      intState = "ready";
      void loadGithub();
    } catch {
      intState = "error";
      intError = "Backend unreachable.";
    }
  }

  async function regenerate() {
    if (
      !confirm(
        "Regenerate the API key? The current key will stop working immediately and any apps using it will break until updated.",
      )
    )
      return;
    await createIntegration();
  }

  async function copyKey() {
    if (!integration) return;
    await navigator.clipboard.writeText(integration.publishableKey);
    copyState = true;
    setTimeout(() => (copyState = false), 1500);
  }

  async function loadGithub() {
    ghState = "loading";
    try {
      const r = await fetch("/api/integration/github");
      if (r.status === 404) {
        ghState = "disconnected";
        return;
      }
      if (!r.ok) {
        ghState = "error";
        ghError = `Failed to load GitHub (${r.status})`;
        return;
      }
      gh = await r.json();
      selectedRepoId = gh?.linkedRepo?.id ?? gh?.linkedRepos?.[0]?.id ?? null;
      ghState = "installed";
      void loadRepos();
    } catch {
      ghState = "error";
      ghError = "Backend unreachable.";
    }
  }

  async function installGithub() {
    try {
      const r = await fetch("/api/integration/github/install", { method: "POST" });
      if (!r.ok) {
        if (r.status === 500) {
          alert(
            "GitHub App is not configured. Set GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / GITHUB_APP_SLUG in webapp/.env and restart.",
          );
        } else {
          alert(`Failed to start GitHub install (${r.status})`);
        }
        return;
      }
      const { installUrl } = await r.json();
      window.location.href = installUrl;
    } catch {
      alert("Backend unreachable.");
    }
  }

  async function disconnectGithub() {
    if (
      !confirm(
        "Clear local GitHub link? Tracked repos will be cleared. To fully revoke access, also uninstall FaradayStack on github.com.",
      )
    )
      return;
    try {
      const r = await fetch("/api/integration/github", { method: "DELETE" });
      if (!r.ok) {
        alert(`Disconnect failed (${r.status})`);
        return;
      }
      gh = null;
      allRepos = [];
      selectedRepoId = null;
      ghState = "disconnected";
    } catch {
      alert("Backend unreachable.");
    }
  }

  async function loadRepos() {
    repoLoadError = "";
    try {
      const r = await fetch("/api/integration/github/repos");
      if (!r.ok) {
        repoLoadError = `Failed to load repos (${r.status})`;
        return;
      }
      allRepos = await r.json();
    } catch {
      repoLoadError = "Failed to load repos.";
    }
  }

  async function saveSelectedRepo() {
    const r = allRepos.find((x) => x.id === selectedRepoId);
    const repo = r
      ? {
          id: r.id,
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          private: r.private,
          defaultBranch: r.defaultBranch ?? null,
        }
      : null;
    repoSaveState = "saving";
    try {
      const res = await fetch("/api/integration/github/repos", {
        method: "PUT",
        body: JSON.stringify({ repo }),
      });
      if (!res.ok) {
        alert(`Save failed (${res.status})`);
        repoSaveState = "idle";
        return;
      }
      repoSaveState = "saved";
      setTimeout(() => (repoSaveState = "idle"), 1200);
    } catch {
      alert("Backend unreachable.");
      repoSaveState = "idle";
    }
  }
</script>

<div class="header">
  <h1>Integrations</h1>
  <div class="sub">SDK key + GitHub connection for tracking repos</div>
</div>

{#if intState === "error"}
  <div class="alert error">{intError}</div>
{:else if intState === "empty"}
  <div class="empty-state">
    <h3>No API key yet</h3>
    <p>Generate a publishable key to start streaming user requests from your app.</p>
    <button class="btn-primary" onclick={createIntegration}>Generate API key</button>
  </div>
{:else if integration}
  {@const created = integration.createdAt ? new Date(integration.createdAt).toLocaleString() : "just now"}
  {@const allowed = integration.allowedOrigins?.length ? integration.allowedOrigins.join(", ") : "—"}
  <div class="key-card">
    <div class="row-h">
      <h3>Publishable key</h3>
      <button class="btn-ghost" onclick={regenerate}>Regenerate</button>
    </div>
    <div class="key-label">key</div>
    <div class="key-display">
      <code>{integration.publishableKey}</code>
      <button class="copy" class:copied={copyState} onclick={copyKey}>{copyState ? "Copied" : "Copy"}</button>
    </div>
    <div class="meta-row">
      <div>
        <div class="k">Plan</div>
        <div class="v">{integration.plan || "free"}</div>
      </div>
      <div>
        <div class="k">Created</div>
        <div class="v">{created}</div>
      </div>
      <div>
        <div class="k">Allowed origins</div>
        <div class="v">{allowed}</div>
      </div>
    </div>
  </div>

  <div class="key-card" style="margin-top: 18px;">
    {#if ghState === "loading"}
      <div style="font-family: var(--mono); font-size: 12px; color: var(--text-subtle);">Loading GitHub…</div>
    {:else if ghState === "error"}
      <div class="alert error">{ghError}</div>
    {:else if ghState === "disconnected"}
      <div class="row-h">
        <h3>GitHub</h3>
        <button class="btn-primary" onclick={installGithub}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
            ><path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.69-.01-1.36-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82A7.6 7.6 0 0 1 8 4.06c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
            /></svg
          >
          Install FaradayStack on GitHub
        </button>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-top: -8px;">
        Install our GitHub App on the repos you want Faraday to manage. We use it to open PRs from approved requests and
        listen for PR/issue events.
      </p>
    {:else if ghState === "installed" && gh}
      <div class="row-h">
        <h3>GitHub</h3>
        <div style="display:flex; gap:6px;">
          <a
            class="btn-ghost"
            href={`https://github.com/settings/installations/${gh.installationId ?? ""}`}
            target="_blank"
            rel="noopener"
            style="text-decoration:none;">Manage on GitHub</a
          >
          <button class="btn-ghost" onclick={disconnectGithub}>Clear</button>
        </div>
      </div>
      <div class="gh-meta">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
          ><path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.69-.01-1.36-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82A7.6 7.6 0 0 1 8 4.06c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
          /></svg
        >
        Installed on <span class="login">@{gh.account?.login || ""}</span>
      </div>
      <div class="key-label" style="margin-top: 18px;">Choose a repo to track</div>
      <p style="font-size: 12px; color: var(--text-subtle); margin: 4px 0 10px;">
        Each publishable key targets one repo. The Faraday agent clones this repo to open PRs from approved requests.
      </p>
      <div class="repo-picker">
        <input class="search" type="text" placeholder="Filter repos…" bind:value={repoSearch} autocomplete="off" />
        <div class="repo-list">
          {#if repoLoadError}
            <div style="padding: 16px; color: var(--red); font-family: var(--mono); font-size: 11px;">
              {repoLoadError}
            </div>
          {:else if allRepos.length === 0}
            <div
              style="padding: 16px; font-family: var(--mono); font-size: 11px; color: var(--text-subtle); text-align: center;"
            >
              Loading repos…
            </div>
          {:else if filteredRepos.length === 0}
            <div
              style="padding: 16px; font-family: var(--mono); font-size: 11px; color: var(--text-subtle); text-align: center;"
            >
              No repos match.
            </div>
          {:else}
            {#each filteredRepos as r (r.id)}
              <label class="repo-row">
                <input
                  type="radio"
                  name="faraday-linked-repo"
                  checked={selectedRepoId === r.id}
                  onchange={() => (selectedRepoId = r.id)}
                />
                <span class="name">{r.fullName}</span>
                {#if r.private}<span class="private">private</span>{/if}
                <span class="pushed">{r.pushedAt ? relTime(r.pushedAt) : ""}</span>
              </label>
            {/each}
          {/if}
        </div>
        <div class="picker-foot">
          <span style="font-family: var(--mono); font-size: 11px; color: var(--text-subtle);"
            >{selectedRepoId ? "1 selected" : "none selected"}</span
          >
          <button class="btn-primary" onclick={saveSelectedRepo} disabled={repoSaveState === "saving"}>
            {repoSaveState === "saving" ? "Saving…" : repoSaveState === "saved" ? "Saved" : "Save selection"}
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="snippet">
    <span style="color:#737373">// install in your React app</span>
    import {"{"} <span class="k">UIAgentProvider</span>
    {"}"} from <span class="s">'@faraday/sdk'</span>; &lt;<span class="k">UIAgentProvider</span> publishableKey=<span
      class="s">"{integration.publishableKey}"</span
    >&gt; &lt;App /&gt; &lt;/<span class="k">UIAgentProvider</span>&gt;
  </div>
{/if}
