<script lang="ts">
  import Sparkline from "./Sparkline.svelte";
  import type { DashboardStats } from "$lib/dashboard/types";

  interface Props {
    stats: DashboardStats | null;
  }
  let { stats }: Props = $props();
</script>

<div class="stat-strip">
  <div class="stat">
    <div class="stat-row">
      <div class="stat-num">{stats?.last24 ?? 0}</div>
      <Sparkline data={stats?.volume24h ?? []} />
    </div>
    <div class="stat-label">requests / 24h</div>
  </div>

  <div class="stat">
    <div class="stat-row">
      <div class="stat-num">
        {stats?.inFlight ?? 0}<span class="stat-num-tail">/{(stats?.opened ?? 0) + (stats?.inFlight ?? 0)}</span>
      </div>
      <div class="stat-pulse">
        <span class="pulse-dot"></span>
        <span class="pulse-text">live</span>
      </div>
    </div>
    <div class="stat-label">PR jobs in flight · {stats?.opened ?? 0} opened</div>
  </div>

  <div class="stat">
    <div class="stat-row">
      <div class="stat-num" style:color={(stats?.failRate ?? 0) > 10 ? "var(--red)" : undefined}>
        {stats?.failRate ?? 0}<span class="stat-num-tail">%</span>
      </div>
      <div class="stat-mini">{stats?.failed24 ?? 0} failed</div>
    </div>
    <div class="stat-label">failure rate / 24h</div>
  </div>

  <div class="stat">
    <div class="stat-row">
      <div class="stat-num-text">{stats?.topOrg?.name ?? "—"}</div>
      <div class="stat-mini">{stats?.topOrg?.count ?? 0} req</div>
    </div>
    <div class="stat-label">noisiest org · 24h</div>
  </div>

  <div class="stat">
    <div class="stat-row">
      <div class="stat-num">{stats?.recurring ?? 0}</div>
      <div class="stat-mini">patterns</div>
    </div>
    <div class="stat-label">recurring prompts (≥3×)</div>
  </div>

  <div class="stat stat-meta">
    <div class="stat-meta-row">
      <span class="k">p50</span><span class="v">{stats?.latency.p50 ?? "—"}</span>
    </div>
    <div class="stat-meta-row">
      <span class="k">p95</span><span class="v">{stats?.latency.p95 ?? "—"}</span>
    </div>
    <div class="stat-meta-row">
      <span class="k">model</span><span class="v">{stats?.model ?? "—"}</span>
    </div>
    <div class="stat-meta-row">
      <span class="k">region</span><span class="v">{stats?.region ?? "—"}</span>
    </div>
  </div>
</div>
