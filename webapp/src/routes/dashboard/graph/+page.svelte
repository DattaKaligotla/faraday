<script lang="ts">
  import { enhance } from "$app/forms";
  import type { PageProps } from "./$types";
  import GraphPanel from "./GraphPanel.svelte";

  const { data, form }: PageProps = $props();
  const github = $derived(data.github);

  let selectedRepoId = $state<string | null>(null);
  let refreshing = $state(false);

  $effect(() => {
    if (selectedRepoId !== null) return;
    const first = github?.linkedRepos?.[0];
    if (first) selectedRepoId = String(first.id);
  });
</script>

<div class="header">
  <h1>Context Graph</h1>
  <div class="sub">
    Per-repo map of React components and their render relationships. The agent's view of what it can touch. Modifiable
    components are highlighted.
  </div>
</div>

{#if !github || !github.linkedRepos?.length}
  <div class="empty-state">
    <h3>No tracked repos</h3>
    <p>Link a GitHub repo on the Integration page to build a graph.</p>
    <a class="btn-primary" href="/dashboard/integration" style="text-decoration: none;">Go to Integration</a>
  </div>
{:else}
  <div class="toolbar">
    <label>
      Repo
      <select bind:value={selectedRepoId}>
        {#each github.linkedRepos as repo (repo.id)}
          <option value={String(repo.id)}>{repo.fullName}</option>
        {/each}
      </select>
    </label>

    <form
      method="POST"
      action="?/refresh"
      use:enhance={() => {
        refreshing = true;
        return async ({ update }) => {
          await update();
          refreshing = false;
        };
      }}
    >
      <input type="hidden" name="repoId" value={selectedRepoId ?? ""} />
      <button class="btn-primary" type="submit" disabled={refreshing || !selectedRepoId}>
        {refreshing ? "Building…" : "Refresh"}
      </button>
    </form>
  </div>

  {#if form && "message" in form}
    <div class="alert error">{form.message}</div>
  {/if}

  {#await data.graphs}
    <div class="canvas-skeleton">Loading graphs…</div>
  {:then graphs}
    {@const current = selectedRepoId ? (graphs[selectedRepoId] ?? null) : null}
    <div class="status-row">
      {#if current}
        <span class="chip status-{current.status}">{current.status}</span>
        {#if current.graphRef}
          <span class="chip">ref {current.graphRef.slice(0, 7)}</span>
        {/if}
        {#if current.generatedAt}
          <span class="chip dim">generated {new Date(current.generatedAt).toLocaleString()}</span>
        {/if}
        {#if current.error}
          <span class="chip error">{current.error}</span>
        {/if}
      {:else}
        <span class="chip dim">no graph yet</span>
      {/if}
    </div>
    <GraphPanel graph={current} />
  {:catch error}
    <div class="alert error">Failed to load graphs: {error.message}</div>
  {/await}
{/if}

<style>
  .header h1 {
    font-size: 22px;
    margin: 0 0 4px;
  }
  .header .sub {
    color: var(--text-dim, #888);
    font-size: 13px;
    margin-bottom: 16px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .toolbar label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-dim, #888);
  }
  .toolbar select {
    padding: 4px 8px;
    border: 1px solid var(--border, #ddd);
    border-radius: 4px;
    background: var(--bg, white);
    font-family: var(--mono);
    font-size: 12px;
  }
  .toolbar form {
    margin-left: auto;
  }
  .status-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .chip {
    font-family: var(--mono);
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 99px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--text);
  }
  .chip.dim {
    color: var(--text-dim, #888);
  }
  .chip.error {
    background: #fee;
    color: #b91c1c;
  }
  .chip.status-building {
    background: #fef3c7;
    color: #92400e;
  }
  .chip.status-failed {
    background: #fee;
    color: #b91c1c;
  }
  .chip.status-idle {
    background: rgba(0, 0, 0, 0.05);
  }
  .canvas-skeleton {
    height: 70vh;
    min-height: 480px;
    border: 1px dashed var(--border, #e5e7eb);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim, #888);
    font-size: 13px;
  }
  .alert.error {
    background: #fee;
    color: #b91c1c;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 12px;
  }
</style>
