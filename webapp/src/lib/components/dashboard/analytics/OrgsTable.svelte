<script lang="ts">
  import type { OrgRow } from "$lib/dashboard/analytics-types";
  import Sparkline from "./Sparkline.svelte";

  interface Props {
    orgs: OrgRow[];
  }
  let { orgs }: Props = $props();

  function orgMark(name: string | null, id: string | null): string {
    const source = name ?? id ?? "—";
    const cleaned = source.replace(/[^A-Za-z0-9 ]/g, "").trim();
    if (!cleaned) return "—";
    const parts = cleaned.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function failPct(row: OrgRow): number {
    const t = row.outcomeMix.applied + row.outcomeMix.responded + row.outcomeMix.failed;
    return t === 0 ? 0 : Math.round((row.outcomeMix.failed / t) * 100);
  }

  function sharePct(part: number, total: number): number {
    return total === 0 ? 0 : (part / total) * 100;
  }
</script>

<div class="fa-card fa-col-8">
  <div class="fa-card-head">
    <div class="fa-card-title">
      <h3>Organizations</h3>
      <span class="fa-mono-sub">{orgs.length} active · sorted by volume</span>
    </div>
    <div class="fa-card-actions"><button class="fa-card-tab on" type="button">all</button></div>
  </div>
  <div class="fa-card-body" style="padding-top: 0">
    {#if orgs.length === 0}
      <div class="fa-empty">No organizations have requests in this window.</div>
    {:else}
      <table class="fa-data-table">
        <thead>
          <tr>
            <th>Org</th>
            <th class="num">Requests</th>
            <th>Trend</th>
            <th>Outcome mix</th>
            <th class="num">p95</th>
            <th class="num">PRs</th>
          </tr>
        </thead>
        <tbody>
          {#each orgs as org, i (i)}
            {@const totalOutcome = org.outcomeMix.applied + org.outcomeMix.responded + org.outcomeMix.failed}
            <tr>
              <td>
                <div class="fa-org-cell">
                  <div class="fa-org-mark">{orgMark(org.orgName, org.orgId)}</div>
                  <div class="fa-org-info">
                    <div class="fa-n">{org.orgName ?? org.orgId ?? "(unassigned)"}</div>
                    {#if org.orgId}<div class="fa-h">{org.orgId}</div>{/if}
                  </div>
                </div>
              </td>
              <td class="num"><span class="fa-cell-num">{org.count.toLocaleString()}</span></td>
              <td><Sparkline data={org.sparkline} width={84} height={20} /></td>
              <td>
                <div style="display:flex; align-items:center; gap:8px">
                  <div class="fa-stacked-bar" style="width:120px; height:8px">
                    <div class="fa-seg applied" style="width: {sharePct(org.outcomeMix.applied, totalOutcome)}%"></div>
                    <div
                      class="fa-seg responded"
                      style="width: {sharePct(org.outcomeMix.responded, totalOutcome)}%"
                    ></div>
                    <div class="fa-seg failed" style="width: {sharePct(org.outcomeMix.failed, totalOutcome)}%"></div>
                  </div>
                  <span
                    style="font-family: var(--fa-mono); font-size: 10px; color: {failPct(org) > 6
                      ? 'var(--fa-red)'
                      : 'var(--fa-text-3)'}"
                  >
                    {failPct(org)}% fail
                  </span>
                </div>
              </td>
              <td class="num">
                <span
                  class="fa-cell-num"
                  style={org.p95LatencyMs != null && org.p95LatencyMs > 10000 ? "color: var(--fa-amber)" : ""}
                >
                  {org.p95LatencyMs == null ? "—" : (org.p95LatencyMs / 1000).toFixed(1)}
                  {#if org.p95LatencyMs != null}<span class="fa-unit-sm">s</span>{/if}
                </span>
              </td>
              <td class="num"><span class="fa-cell-num">{org.prCount}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</div>
