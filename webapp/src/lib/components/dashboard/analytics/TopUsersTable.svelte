<script lang="ts">
  import type { UserRow } from "$lib/dashboard/analytics-types";

  interface Props {
    users: UserRow[];
  }
  let { users }: Props = $props();

  function ago(ms: number): string {
    const diff = Date.now() - ms;
    const minutes = Math.round(diff / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }
</script>

<div class="fa-card fa-col-4">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Top end-users</h3>
      <span class="fa-mono-sub">by request count</span>
    </div>
  </div>
  <div class="fa-card-body" style="padding-top: 0">
    {#if users.length === 0}
      <div class="fa-empty">No end-user activity yet.</div>
    {:else}
      <table class="fa-data-table">
        <thead>
          <tr>
            <th>User</th>
            <th class="num">Req</th>
            <th class="num">Last</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user, i (i)}
            <tr>
              <td style="color: var(--fa-text)">
                <span style="font-family: var(--fa-mono); font-size: 11.5px">
                  {user.email ?? user.endUserId ?? "(anon)"}
                </span>
              </td>
              <td class="num"><span class="fa-cell-num">{user.count}</span></td>
              <td class="num" style="font-family: var(--fa-mono); font-size: 10.5px; color: var(--fa-text-3)">
                {ago(user.lastSeenMs)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
