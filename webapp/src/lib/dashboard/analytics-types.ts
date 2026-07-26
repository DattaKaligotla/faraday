// Shared analytics shape — safe to import from client code. The server-only
// aggregation logic lives in `$lib/server/analytics.ts` and is reachable
// only from `+page.server.ts` / `+server.ts`.

export type RangeKey = "24h" | "7d" | "30d" | "90d";

export const RANGE_KEYS: RangeKey[] = ["24h", "7d", "30d", "90d"];

export function isRangeKey(value: string): value is RangeKey {
  return (RANGE_KEYS as readonly string[]).includes(value);
}

export interface Kpi {
  value: number;
  /** Percentage delta vs the prior period. `null` when the prior period had
   * zero samples (no meaningful comparison). */
  deltaPct: number | null;
}

export interface Kpis {
  totalRequests: Kpi;
  successRatePct: Kpi;
  p95LatencyMs: Kpi;
  prOpened: Kpi;
}

export interface VolumeSeries {
  buckets: number[];
  priorPeriod: number[];
  xLabels: string[];
  unit: "hour" | "6h" | "day" | "3d";
}

export interface LatencySeries {
  /** Per-bucket percentiles. `null` for buckets with < 3 samples. */
  p50: Array<number | null>;
  p95: Array<number | null>;
  p99: Array<number | null>;
  /** Headline percentiles across the whole window. `null` when no samples. */
  current: { p50: number | null; p95: number | null; p99: number | null };
}

export interface StatusMix {
  applied: number;
  responded: number;
  failed: number;
  total: number;
  /** Top distinct error messages (first 64 chars), descending count. */
  topErrors: Array<{ key: string; count: number }>;
}

export interface RecurringPrompt {
  prompt: string;
  count: number;
  /** Absolute count delta vs the prior period. Positive = trending up. */
  trend: number;
  kind: "applied" | "pr";
}

export interface ToolStat {
  name: string;
  count: number;
  share: number;
}

export interface FunnelSnapshot {
  complexPrompts: number;
  agentRunStarted: number;
  diffGenerated: number;
  prOpened: number;
  prMerged: number;
}

export interface OrgRow {
  orgId: string | null;
  orgName: string | null;
  count: number;
  /** 12 buckets evenly spaced across the range; raw counts. */
  sparkline: number[];
  outcomeMix: { applied: number; responded: number; failed: number };
  /** Per-org p95 latency, `null` when no samples have `latencyMs > 0`. */
  p95LatencyMs: number | null;
  prCount: number;
}

export interface UserRow {
  endUserId: string | null;
  email: string | null;
  count: number;
  lastSeenMs: number;
}

export interface AnalyticsPayload {
  range: RangeKey;
  generatedAtMs: number;
  kpis: Kpis;
  volume: VolumeSeries;
  latency: LatencySeries;
  statusMix: StatusMix;
  recurring: RecurringPrompt[];
  tools: ToolStat[];
  /** 7×24 grid, [dayOfWeek 0=Mon..6=Sun][hour 0..23], UTC. */
  heatmap: number[][];
  funnel: FunnelSnapshot;
  orgs: OrgRow[];
  topUsers: UserRow[];
}
