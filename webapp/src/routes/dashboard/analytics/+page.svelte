<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import { RANGE_KEYS, type RangeKey } from "$lib/dashboard/analytics-types";
  import KpiTile from "$lib/components/dashboard/analytics/KpiTile.svelte";
  import VolumeArea from "$lib/components/dashboard/analytics/VolumeArea.svelte";
  import OutcomesStack from "$lib/components/dashboard/analytics/OutcomesStack.svelte";
  import LatencyLines from "$lib/components/dashboard/analytics/LatencyLines.svelte";
  import RecurringList from "$lib/components/dashboard/analytics/RecurringList.svelte";
  import ToolBars from "$lib/components/dashboard/analytics/ToolBars.svelte";
  import ActivityHeatmap from "$lib/components/dashboard/analytics/ActivityHeatmap.svelte";
  import Funnel from "$lib/components/dashboard/analytics/Funnel.svelte";
  import OrgsTable from "$lib/components/dashboard/analytics/OrgsTable.svelte";
  import TopUsersTable from "$lib/components/dashboard/analytics/TopUsersTable.svelte";
  import FooterStrip from "$lib/components/dashboard/analytics/FooterStrip.svelte";
  import "./analytics.css";

  let { data }: { data: PageData } = $props();

  function selectRange(key: RangeKey) {
    const url = new URL(page.url);
    url.searchParams.set("range", key);
    goto(url.pathname + url.search, { keepFocus: true, noScroll: true });
  }

  function deltaLabel(deltaPct: number | null, mode: "pct" | "points"): string {
    if (deltaPct === null) return "—";
    const prefix = deltaPct >= 0 ? "+" : "";
    return mode === "pct" ? `${prefix}${deltaPct}%` : `${prefix}${deltaPct}pt`;
  }

  function direction(deltaPct: number | null, inverted: boolean): "up" | "down" | "muted" {
    if (deltaPct === null) return "muted";
    if (deltaPct === 0) return "muted";
    const positive = deltaPct > 0;
    return positive === !inverted ? "up" : "down";
  }

  function fmtLatencyValue(ms: number): string {
    if (ms === 0) return "—";
    if (ms < 1000) return `${Math.round(ms)}`;
    return (ms / 1000).toFixed(1);
  }

  function fmtLatencyUnit(ms: number): string {
    if (ms === 0) return "";
    return ms < 1000 ? "ms" : "s";
  }

  const rangeLabel = $derived(data.range);
  const latencySpark = $derived(data.latency.p95.map((v) => v ?? 0));
</script>

<div data-faraday-analytics>
  <header class="fa-page-head">
    <div class="fa-page-title">
      <h1>Analytics<span class="fa-title-mono">/dashboard/analytics</span></h1>
    </div>
    <div class="fa-page-actions">
      <div class="fa-range-pills">
        {#each RANGE_KEYS as key (key)}
          <button type="button" class:on={key === data.range} onclick={() => selectRange(key)}>
            {key}
          </button>
        {/each}
      </div>
      <button class="fa-hd-btn" type="button" disabled aria-disabled="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
        Export CSV
      </button>
      <button class="fa-hd-btn fa-hd-btn-primary" type="button" disabled aria-disabled="true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New report
      </button>
    </div>
  </header>

  <div class="fa-kpi-row">
    <KpiTile
      label="Total requests"
      value={data.kpis.totalRequests.value.toLocaleString()}
      delta={deltaLabel(data.kpis.totalRequests.deltaPct, "pct")}
      direction={direction(data.kpis.totalRequests.deltaPct, false)}
      sub="vs prior period"
      spark={data.volume.buckets}
      sparkColor="var(--fa-accent)"
    />
    <KpiTile
      label="Success rate"
      value={data.kpis.successRatePct.value.toString()}
      unit="%"
      delta={deltaLabel(data.kpis.successRatePct.deltaPct, "points")}
      direction={direction(data.kpis.successRatePct.deltaPct, false)}
      sub="applied / total"
      spark={[]}
      sparkColor="var(--fa-green)"
    />
    <KpiTile
      label="p95 latency"
      value={fmtLatencyValue(data.kpis.p95LatencyMs.value)}
      unit={fmtLatencyUnit(data.kpis.p95LatencyMs.value)}
      delta={deltaLabel(data.kpis.p95LatencyMs.deltaPct, "pct")}
      direction={direction(data.kpis.p95LatencyMs.deltaPct, true)}
      sub="end-to-end · agent + tool"
      spark={latencySpark}
      sparkColor="var(--fa-blue)"
    />
    <KpiTile
      label="PRs opened"
      value={data.kpis.prOpened.value.toString()}
      delta={deltaLabel(data.kpis.prOpened.deltaPct, "pct")}
      direction={direction(data.kpis.prOpened.deltaPct, false)}
      sub="from complex prompts"
      spark={[]}
      sparkColor="var(--fa-accent)"
    />
  </div>

  <div class="fa-analytics-grid">
    <VolumeArea
      volume={data.volume}
      {rangeLabel}
      total={data.kpis.totalRequests.value}
      deltaPct={data.kpis.totalRequests.deltaPct}
    />
    <OutcomesStack statusMix={data.statusMix} {rangeLabel} />
    <LatencyLines latency={data.latency} xLabels={data.volume.xLabels} />
    <RecurringList recurring={data.recurring} {rangeLabel} />
    <ToolBars tools={data.tools} {rangeLabel} />
    <ActivityHeatmap heatmap={data.heatmap} />
    <Funnel funnel={data.funnel} {rangeLabel} />
    <OrgsTable orgs={data.orgs} />
    <TopUsersTable users={data.topUsers} />
  </div>

  <FooterStrip {rangeLabel} generatedAtMs={data.generatedAtMs} />
</div>
