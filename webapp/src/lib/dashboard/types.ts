import type { Phase } from "$lib/components/prProgress";

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface PrInfo {
  jobId: string;
  status: "running" | "pr_opened" | "pr_merged" | "failed";
  phase: Phase | null;
  repoFullName: string;
  branch: string | null;
  url: string | null;
  number: number | null;
  summary: string | null;
  error: string | null;
  startedAt: string | null;
  openedAt: string | null;
  mergedAt: string | null;
  closedAt: string | null;
  lastEventAt: string | null;
}

export interface Modifiable {
  id: string;
  source?: { fileName: string; lineNumber: number };
  domSnippet?: string;
}

export interface PageContext {
  url?: string;
  modifiables?: Modifiable[];
}

export interface RequestItem {
  id: string;
  prompt: string;
  assistantText: string;
  toolCalls: ToolCall[];
  status: string;
  error: string | null;
  endUserId: string | null;
  endUserEmail: string | null;
  endUserClaims: Record<string, unknown> | null;
  orgId: string | null;
  orgName: string | null;
  origin: string;
  pageContext: PageContext | null;
  createdAt: string | null;
  pr: PrInfo | null;
}

export interface DashboardStats {
  volume24h: number[];
  last24: number;
  failed24: number;
  failRate: number;
  inFlight: number;
  opened: number;
  topOrg: { name: string; count: number } | null;
  recurring: number;
  latency: { p50: string; p95: string };
  model: string;
  region: string;
}
