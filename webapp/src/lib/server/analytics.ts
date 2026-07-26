import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "./firestore";
import { child } from "./logger";
import type {
  AnalyticsPayload,
  FunnelSnapshot,
  Kpis,
  LatencySeries,
  OrgRow,
  RangeKey,
  RecurringPrompt,
  StatusMix,
  ToolStat,
  UserRow,
  VolumeSeries,
} from "$lib/dashboard/analytics-types";

const log = child("analytics");

// ─── internal row shape ────────────────────────────────────────────────────

/**
 * Projected analytics row. Read defensively from raw doc data so we don't
 * couple the aggregator to the strict `requestRecordSchema` — old docs
 * missing newer required fields (`latencyMs`, `firstTokenMs`) still
 * contribute to volume/status/heatmap aggregations, they just don't move
 * the latency series.
 */
interface AnalyticsRow {
  createdAtMs: number;
  status: string | null;
  error: string | null;
  prompt: string;
  toolCalls: Array<{ name: string }>;
  endUserId: string | null;
  endUserEmail: string | null;
  orgId: string | null;
  orgName: string | null;
  pr: {
    status: string | null;
    phase: string | null;
    openedAtMs: number | null;
    mergedAtMs: number | null;
  } | null;
  latencyMs: number | null;
  firstTokenMs: number | null;
}

function toMs(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && value !== null && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "number") return value;
  return null;
}

function toRow(data: Record<string, unknown>): AnalyticsRow | null {
  const createdAtMs = toMs(data.createdAt);
  if (createdAtMs == null) return null;

  const pr = data.pr && typeof data.pr === "object" ? (data.pr as Record<string, unknown>) : null;
  const projectedPr = pr
    ? {
        status: typeof pr.status === "string" ? pr.status : null,
        phase: typeof pr.phase === "string" ? pr.phase : null,
        openedAtMs: toMs(pr.openedAt),
        mergedAtMs: toMs(pr.mergedAt),
      }
    : null;

  const rawToolCalls = Array.isArray(data.toolCalls) ? (data.toolCalls as Array<Record<string, unknown>>) : [];
  const toolCalls = rawToolCalls
    .filter((call) => typeof call?.name === "string")
    .map((call) => ({ name: call.name as string }));

  return {
    createdAtMs,
    status: typeof data.status === "string" ? data.status : null,
    error: typeof data.error === "string" ? data.error : null,
    prompt: typeof data.prompt === "string" ? data.prompt : "",
    toolCalls,
    endUserId: typeof data.endUserId === "string" ? data.endUserId : null,
    endUserEmail: typeof data.endUserEmail === "string" ? data.endUserEmail : null,
    orgId: typeof data.orgId === "string" ? data.orgId : null,
    orgName: typeof data.orgName === "string" ? data.orgName : null,
    pr: projectedPr,
    latencyMs: typeof data.latencyMs === "number" && data.latencyMs > 0 ? data.latencyMs : null,
    firstTokenMs: typeof data.firstTokenMs === "number" && data.firstTokenMs > 0 ? data.firstTokenMs : null,
  };
}

// ─── range window math ─────────────────────────────────────────────────────

const HOUR_MS = 3600_000;
const DAY_MS = 86400_000;

interface RangeShape {
  windowMs: number;
  bucketMs: number;
  bucketCount: number;
  unit: VolumeSeries["unit"];
}

function rangeShape(range: RangeKey): RangeShape {
  switch (range) {
    case "24h":
      return { windowMs: 24 * HOUR_MS, bucketMs: HOUR_MS, bucketCount: 24, unit: "hour" };
    case "7d":
      return { windowMs: 7 * DAY_MS, bucketMs: 6 * HOUR_MS, bucketCount: 28, unit: "6h" };
    case "30d":
      return { windowMs: 30 * DAY_MS, bucketMs: DAY_MS, bucketCount: 30, unit: "day" };
    case "90d":
      return { windowMs: 90 * DAY_MS, bucketMs: 3 * DAY_MS, bucketCount: 30, unit: "3d" };
  }
}

function formatBucketLabel(ms: number, unit: VolumeSeries["unit"]): string {
  const d = new Date(ms);
  if (unit === "hour" || unit === "6h") {
    const hh = String(d.getUTCHours()).padStart(2, "0");
    return `${hh}:00`;
  }
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${month} ${d.getUTCDate()}`;
}

function xLabelsForRange(range: RangeKey, nowMs: number): string[] {
  const { windowMs, bucketCount, bucketMs, unit } = rangeShape(range);
  const startMs = nowMs - windowMs;
  // Five labels, evenly distributed: 0, 25%, 50%, 75%, 100%.
  const indices = [
    0,
    Math.floor(bucketCount * 0.25),
    Math.floor(bucketCount * 0.5),
    Math.floor(bucketCount * 0.75),
    bucketCount - 1,
  ];
  return indices.map((idx) => formatBucketLabel(startMs + idx * bucketMs, unit));
}

// ─── loader ────────────────────────────────────────────────────────────────

/**
 * Load the request docs needed for analytics over the *current + prior*
 * window. The aggregators split the resulting array internally so we only
 * issue a single Firestore range query per page load.
 */
export async function loadAnalyticsRows(uid: string, range: RangeKey): Promise<AnalyticsRow[]> {
  const { windowMs } = rangeShape(range);
  const nowMs = Date.now();
  const cutoffMs = nowMs - 2 * windowMs;
  const snap = await getDb()
    .collection("integrations")
    .doc(uid)
    .collection("requests")
    .where("createdAt", ">=", Timestamp.fromMillis(cutoffMs))
    .orderBy("createdAt", "desc")
    .limit(20000)
    .get();

  const rows: AnalyticsRow[] = [];
  for (const doc of snap.docs) {
    const row = toRow(doc.data());
    if (row) rows.push(row);
  }
  if (snap.size === 20000) {
    log.withMetadata({ uid, range, fetched: 20000 }).warn("analytics query hit limit — results may be truncated");
  }
  return rows;
}

// ─── window splitting ──────────────────────────────────────────────────────

interface SplitRows {
  current: AnalyticsRow[];
  prior: AnalyticsRow[];
  currentStartMs: number;
  priorStartMs: number;
  nowMs: number;
}

function splitByPeriod(rows: AnalyticsRow[], range: RangeKey, nowMs: number): SplitRows {
  const { windowMs } = rangeShape(range);
  const currentStartMs = nowMs - windowMs;
  const priorStartMs = nowMs - 2 * windowMs;
  const current: AnalyticsRow[] = [];
  const prior: AnalyticsRow[] = [];
  for (const row of rows) {
    if (row.createdAtMs >= currentStartMs) current.push(row);
    else if (row.createdAtMs >= priorStartMs) prior.push(row);
  }
  return { current, prior, currentStartMs, priorStartMs, nowMs };
}

// ─── percentile helper ─────────────────────────────────────────────────────

/**
 * Nearest-rank percentile. Returns `null` when there are < 3 samples — too
 * few points for a meaningful tail estimate, the dashboard renders "—".
 */
function percentile(values: number[], p: number): number | null {
  if (values.length < 3) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1];
}

function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return Math.round(((current - prior) / prior) * 100);
}

// ─── aggregators ───────────────────────────────────────────────────────────

export function getKpis(split: SplitRows): Kpis {
  const totalCurrent = split.current.length;
  const totalPrior = split.prior.length;

  const appliedCurrent = split.current.filter((r) => r.status === "applied").length;
  const successCurrent = totalCurrent === 0 ? 0 : Math.round((appliedCurrent / totalCurrent) * 1000) / 10;
  const appliedPrior = split.prior.filter((r) => r.status === "applied").length;
  const successPrior = totalPrior === 0 ? 0 : Math.round((appliedPrior / totalPrior) * 1000) / 10;

  const latenciesCurrent = split.current.map((r) => r.latencyMs).filter((v): v is number => v != null);
  const latenciesPrior = split.prior.map((r) => r.latencyMs).filter((v): v is number => v != null);
  const p95Current = percentile(latenciesCurrent, 95) ?? 0;
  const p95Prior = percentile(latenciesPrior, 95) ?? 0;

  const prCurrent = split.current.filter((r) => r.pr?.openedAtMs != null).length;
  const prPrior = split.prior.filter((r) => r.pr?.openedAtMs != null).length;

  return {
    totalRequests: { value: totalCurrent, deltaPct: deltaPct(totalCurrent, totalPrior) },
    successRatePct: {
      value: successCurrent,
      deltaPct: totalPrior === 0 ? null : Math.round((successCurrent - successPrior) * 10) / 10,
    },
    p95LatencyMs: { value: Math.round(p95Current), deltaPct: deltaPct(p95Current, p95Prior) },
    prOpened: { value: prCurrent, deltaPct: deltaPct(prCurrent, prPrior) },
  };
}

export function getVolume(split: SplitRows, range: RangeKey): VolumeSeries {
  const shape = rangeShape(range);
  const buckets = new Array(shape.bucketCount).fill(0);
  const priorPeriod = new Array(shape.bucketCount).fill(0);

  for (const row of split.current) {
    const offset = row.createdAtMs - split.currentStartMs;
    const idx = Math.min(shape.bucketCount - 1, Math.max(0, Math.floor(offset / shape.bucketMs)));
    buckets[idx]++;
  }
  for (const row of split.prior) {
    const offset = row.createdAtMs - split.priorStartMs;
    const idx = Math.min(shape.bucketCount - 1, Math.max(0, Math.floor(offset / shape.bucketMs)));
    priorPeriod[idx]++;
  }

  return {
    buckets,
    priorPeriod,
    xLabels: xLabelsForRange(range, split.nowMs),
    unit: shape.unit,
  };
}

export function getLatency(split: SplitRows, range: RangeKey): LatencySeries {
  const shape = rangeShape(range);
  // Per-bucket sample arrays.
  const samples: number[][] = Array.from({ length: shape.bucketCount }, () => []);
  for (const row of split.current) {
    if (row.latencyMs == null) continue;
    const offset = row.createdAtMs - split.currentStartMs;
    const idx = Math.min(shape.bucketCount - 1, Math.max(0, Math.floor(offset / shape.bucketMs)));
    samples[idx].push(row.latencyMs);
  }
  const p50: Array<number | null> = samples.map((s) => percentile(s, 50));
  const p95: Array<number | null> = samples.map((s) => percentile(s, 95));
  const p99: Array<number | null> = samples.map((s) => percentile(s, 99));

  const overall = split.current.map((r) => r.latencyMs).filter((v): v is number => v != null);
  return {
    p50,
    p95,
    p99,
    current: {
      p50: percentile(overall, 50),
      p95: percentile(overall, 95),
      p99: percentile(overall, 99),
    },
  };
}

export function getStatusMix(rows: AnalyticsRow[]): StatusMix {
  let applied = 0;
  let responded = 0;
  let failed = 0;
  const errorCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.status === "applied") applied++;
    else if (row.status === "responded") responded++;
    else if (row.status === "failed") failed++;
    if (row.status === "failed" && row.error) {
      const key = row.error.slice(0, 64);
      errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    }
  }
  const topErrors = [...errorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, count }));
  return { applied, responded, failed, total: applied + responded + failed, topErrors };
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getRecurring(split: SplitRows): RecurringPrompt[] {
  const currentCounts = new Map<string, { count: number; raw: string; hasPr: boolean }>();
  const priorCounts = new Map<string, number>();

  for (const row of split.current) {
    const key = normalizePrompt(row.prompt);
    if (!key) continue;
    const entry = currentCounts.get(key) ?? { count: 0, raw: row.prompt, hasPr: false };
    entry.count++;
    if (row.pr) entry.hasPr = true;
    currentCounts.set(key, entry);
  }
  for (const row of split.prior) {
    const key = normalizePrompt(row.prompt);
    if (!key) continue;
    priorCounts.set(key, (priorCounts.get(key) ?? 0) + 1);
  }

  return [...currentCounts.entries()]
    .map(([key, entry]) => ({
      prompt: entry.raw,
      count: entry.count,
      trend: entry.count - (priorCounts.get(key) ?? 0),
      kind: entry.hasPr ? ("pr" as const) : ("applied" as const),
    }))
    .filter((row) => row.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function getTools(rows: AnalyticsRow[]): ToolStat[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of rows) {
    for (const call of row.toolCalls) {
      counts.set(call.name, (counts.get(call.name) ?? 0) + 1);
      total++;
    }
  }
  if (total === 0) return [];
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, share: count / total }));
}

export function getHeatmap(rows: AnalyticsRow[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const row of rows) {
    const d = new Date(row.createdAtMs);
    // JS getUTCDay: 0=Sun..6=Sat. Convert to Mon=0..Sun=6 to match the design.
    const dayJs = d.getUTCDay();
    const dayIdx = dayJs === 0 ? 6 : dayJs - 1;
    const hour = d.getUTCHours();
    grid[dayIdx][hour]++;
  }
  return grid;
}

export function getFunnel(rows: AnalyticsRow[]): FunnelSnapshot {
  let complexPrompts = 0;
  let agentRunStarted = 0;
  let diffGenerated = 0;
  let prOpened = 0;
  let prMerged = 0;
  for (const row of rows) {
    const isComplex = row.toolCalls.length > 5 || row.prompt.length > 200 || row.pr != null;
    if (!isComplex) continue;
    complexPrompts++;
    if (!row.pr) continue;
    agentRunStarted++;
    const phaseReached =
      row.pr.phase === "opening_pr" || row.pr.phase === "uploading_snapshot" || row.pr.phase === "done";
    if (phaseReached || row.pr.openedAtMs != null) diffGenerated++;
    if (row.pr.openedAtMs != null) prOpened++;
    if (row.pr.mergedAtMs != null) prMerged++;
  }
  return { complexPrompts, agentRunStarted, diffGenerated, prOpened, prMerged };
}

export function getOrgs(rows: AnalyticsRow[], range: RangeKey, nowMs: number): OrgRow[] {
  const shape = rangeShape(range);
  const sparkBuckets = 12;
  const sparkBucketMs = shape.windowMs / sparkBuckets;
  const startMs = nowMs - shape.windowMs;

  interface OrgAccum {
    orgId: string | null;
    orgName: string | null;
    count: number;
    applied: number;
    responded: number;
    failed: number;
    latencies: number[];
    prCount: number;
    sparkline: number[];
  }
  const orgs = new Map<string, OrgAccum>();

  for (const row of rows) {
    if (row.createdAtMs < startMs) continue;
    const key = row.orgId ?? "(unassigned)";
    let entry = orgs.get(key);
    if (!entry) {
      entry = {
        orgId: row.orgId,
        orgName: row.orgName,
        count: 0,
        applied: 0,
        responded: 0,
        failed: 0,
        latencies: [],
        prCount: 0,
        sparkline: new Array(sparkBuckets).fill(0),
      };
      orgs.set(key, entry);
    }
    entry.count++;
    if (row.status === "applied") entry.applied++;
    else if (row.status === "responded") entry.responded++;
    else if (row.status === "failed") entry.failed++;
    if (row.latencyMs != null) entry.latencies.push(row.latencyMs);
    if (row.pr?.openedAtMs != null) entry.prCount++;
    const sparkIdx = Math.min(sparkBuckets - 1, Math.max(0, Math.floor((row.createdAtMs - startMs) / sparkBucketMs)));
    entry.sparkline[sparkIdx]++;
    // orgName may arrive late on some docs; pick the first non-null we see.
    if (!entry.orgName && row.orgName) entry.orgName = row.orgName;
  }

  return [...orgs.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
    .map((entry) => ({
      orgId: entry.orgId,
      orgName: entry.orgName,
      count: entry.count,
      sparkline: entry.sparkline,
      outcomeMix: { applied: entry.applied, responded: entry.responded, failed: entry.failed },
      p95LatencyMs: percentile(entry.latencies, 95),
      prCount: entry.prCount,
    }));
}

export function getTopUsers(rows: AnalyticsRow[]): UserRow[] {
  interface UserAccum {
    endUserId: string | null;
    email: string | null;
    count: number;
    lastSeenMs: number;
  }
  const users = new Map<string, UserAccum>();
  for (const row of rows) {
    const key = row.endUserId ?? row.endUserEmail ?? "(anon)";
    let entry = users.get(key);
    if (!entry) {
      entry = { endUserId: row.endUserId, email: row.endUserEmail, count: 0, lastSeenMs: 0 };
      users.set(key, entry);
    }
    entry.count++;
    if (row.createdAtMs > entry.lastSeenMs) entry.lastSeenMs = row.createdAtMs;
    if (!entry.email && row.endUserEmail) entry.email = row.endUserEmail;
  }
  return [...users.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((entry) => ({
      endUserId: entry.endUserId,
      email: entry.email,
      count: entry.count,
      lastSeenMs: entry.lastSeenMs,
    }));
}

// ─── orchestrator ──────────────────────────────────────────────────────────

/**
 * One-shot: load + aggregate everything for the page loader. Defers all
 * Firestore I/O to `loadAnalyticsRows` so testing the aggregators can pass
 * synthetic rows without spinning up Firestore.
 */
export async function buildAnalytics(uid: string, range: RangeKey): Promise<AnalyticsPayload> {
  const rows = await loadAnalyticsRows(uid, range);
  const nowMs = Date.now();
  const split = splitByPeriod(rows, range, nowMs);
  return {
    range,
    generatedAtMs: nowMs,
    kpis: getKpis(split),
    volume: getVolume(split, range),
    latency: getLatency(split, range),
    statusMix: getStatusMix(split.current),
    recurring: getRecurring(split),
    tools: getTools(split.current),
    heatmap: getHeatmap(split.current),
    funnel: getFunnel(split.current),
    orgs: getOrgs(rows, range, nowMs),
    topUsers: getTopUsers(split.current),
  };
}
