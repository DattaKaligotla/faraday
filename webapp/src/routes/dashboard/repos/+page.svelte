<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const gh = $derived(data.github);
  let errorMsg = $state("");

  async function removeRepo(repoId: number, fullName: string) {
    if (!confirm(`Stop tracking ${fullName}?`)) return;
    const remaining = (gh?.linkedRepos ?? []).filter((r) => r.id !== repoId);
    try {
      const r = await fetch("/api/integration/github/repos", {
        method: "PUT",
        body: JSON.stringify({ repos: remaining }),
      });
      if (!r.ok) {
        alert(`Failed to remove (${r.status})`);
        return;
      }
      await invalidateAll();
    } catch {
      alert("Backend unreachable.");
    }
  }
</script>

<div class="header">
  <h1>Tracked Repos</h1>
  <div class="sub">Repos linked to this workspace — change history and PR generation will target these</div>
</div>

{#if errorMsg}
  <div class="alert error">{errorMsg}</div>
{:else if !gh}
  <div class="empty-state">
    <h3>GitHub not installed</h3>
    <p>Install FaradayStack on GitHub from the Integration page to start tracking repos.</p>
    <a class="btn-primary" href="/dashboard/integration" style="text-decoration: none;">Go to Integration →</a>
  </div>
{:else if gh.linkedRepos.length === 0}
  <div class="empty-state">
    <h3>No repos tracked yet</h3>
    <p>
      Connected as <strong>@{gh.account?.login || ""}</strong>. Pick repos on the Integration page to start tracking.
    </p>
    <a class="btn-primary" href="/dashboard/integration" style="text-decoration: none;">Pick repos →</a>
  </div>
{:else}
  <div class="key-card">
    <div class="row-h">
      <h3>{gh.linkedRepos.length} {gh.linkedRepos.length === 1 ? "repo" : "repos"} tracked</h3>
      <a class="btn-ghost" href="/dashboard/integration" style="text-decoration: none;"
        >+ Add or remove on Integration</a
      >
    </div>
    <div class="gh-meta" style="margin-bottom: 4px;">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
        ><path
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.69-.01-1.36-2.22.48-2.69-1.07-2.69-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82A7.6 7.6 0 0 1 8 4.06c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
        /></svg
      >
      <span class="login">@{gh.account?.login || ""}</span>
    </div>
    <div class="tracked-list">
      {#each gh.linkedRepos as repo (repo.id)}
        <div class="tracked-row">
          <div class="tracked-name">
            <a
              href="https://github.com/{encodeURIComponent(repo.owner)}/{encodeURIComponent(repo.name)}"
              target="_blank"
              rel="noopener">{repo.fullName}</a
            >
            {#if repo.private}<span class="private">private</span>{/if}
          </div>
          <span class="tracked-branch">{repo.defaultBranch || "main"}</span>
          <button class="btn-danger" onclick={() => removeRepo(repo.id, repo.fullName)}>Remove</button>
        </div>
      {/each}
    </div>
  </div>
{/if}
