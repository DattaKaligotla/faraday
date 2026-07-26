export interface RequestLite {
  status: string;
  createdAt: string | null;
  pr: { status: string } | null;
}

export interface QuickView {
  id: string;
  label: string;
  icon: string;
  filter: (r: RequestLite) => boolean;
  live?: boolean;
  danger?: boolean;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function ageMs(iso: string | null): number {
  if (!iso) return Infinity;
  return Date.now() - new Date(iso).getTime();
}

export const QUICK_VIEWS: QuickView[] = [
  { id: "all", label: "All requests", icon: "▸", filter: () => true },
  {
    id: "live",
    label: "Live PR jobs",
    icon: "●",
    filter: (r) => !!r.pr && r.pr.status === "running",
    live: true,
  },
  {
    id: "failed",
    label: "Failed (24h)",
    icon: "✕",
    filter: (r) => r.status === "failed" && ageMs(r.createdAt) < DAY,
    danger: true,
  },
  {
    id: "complex",
    label: "Needs PR",
    icon: "⤴",
    filter: (r) => r.status === "responded" && (!r.pr || r.pr.status !== "pr_opened"),
  },
  {
    id: "opened",
    label: "PR opened",
    icon: "✓",
    filter: (r) => !!r.pr && r.pr.status === "pr_opened",
  },
  {
    id: "recent",
    label: "Last hour",
    icon: "◷",
    filter: (r) => ageMs(r.createdAt) < HOUR,
  },
];
