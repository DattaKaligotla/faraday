import type { JobEvent } from "$runner/types";

export type Phase = "preparing" | "agent_running" | "opening_pr" | "uploading_snapshot" | "done" | "failed";

export interface PhaseStep {
  key: Phase;
  label: string;
}

export const PHASE_ORDER: PhaseStep[] = [
  { key: "preparing", label: "Preparing" },
  { key: "agent_running", label: "Agent working" },
  { key: "opening_pr", label: "Opening PR" },
  { key: "uploading_snapshot", label: "Caching workspace" },
  { key: "done", label: "Done" },
];

export type PhaseState = "pending" | "active" | "complete" | "failed" | "skipped";

export function phaseStates(current: Phase | null): Record<Phase, PhaseState> {
  const out: Record<Phase, PhaseState> = {
    preparing: "pending",
    agent_running: "pending",
    opening_pr: "pending",
    uploading_snapshot: "pending",
    done: "pending",
    failed: "pending",
  };
  if (!current) return out;
  if (current === "failed") {
    out.failed = "failed";
    return out;
  }
  const order: Phase[] = ["preparing", "agent_running", "opening_pr", "uploading_snapshot", "done"];
  const idx = order.indexOf(current);
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    if (i < idx) out[key] = "complete";
    else if (i === idx) out[key] = current === "done" ? "complete" : "active";
  }
  return out;
}

export interface FormattedEvent {
  icon: "info" | "edit" | "read" | "search" | "shell" | "git" | "ok" | "error" | "agent";
  label: string;
  detail?: string;
  tone: "neutral" | "success" | "error" | "muted";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function formatJobEvent(ev: JobEvent): FormattedEvent | null {
  switch (ev.type) {
    case "prepare:start":
      return { icon: "info", tone: "muted", label: "Preparing workspace" };
    case "prepare:snapshot_hit":
      return { icon: "ok", tone: "muted", label: "Restored cached workspace" };
    case "prepare:snapshot_miss":
      return { icon: "info", tone: "muted", label: "Cloning repository", detail: ev.reason };
    case "prepare:done":
      return {
        icon: "ok",
        tone: "muted",
        label: `Workspace ready in ${(ev.durationMs / 1000).toFixed(1)}s`,
      };
    case "agent:start":
      return { icon: "agent", tone: "neutral", label: "Agent started" };
    case "agent:text_delta":
      return { icon: "agent", tone: "neutral", label: "Agent", detail: truncate(ev.text.trim(), 400) };
    case "agent:tool_use": {
      const input = (ev.input ?? {}) as Record<string, unknown>;
      switch (ev.name) {
        case "Read":
          return { icon: "read", tone: "muted", label: "Read", detail: asString(input.file_path) };
        case "Grep":
          return {
            icon: "search",
            tone: "muted",
            label: "Searched",
            detail: asString(input.pattern || input.query),
          };
        case "Edit":
          return { icon: "edit", tone: "neutral", label: "Edited", detail: asString(input.file_path) };
        case "Bash":
          return {
            icon: "shell",
            tone: "muted",
            label: "Ran",
            detail: truncate(asString(input.command), 100),
          };
        default:
          return { icon: "agent", tone: "muted", label: ev.name };
      }
    }
    case "agent:done":
      return { icon: "ok", tone: "neutral", label: "Agent finished" };
    case "pr:opening":
      return { icon: "git", tone: "neutral", label: "Pushing branch", detail: ev.branch };
    case "pr:opened":
      return {
        icon: "ok",
        tone: "success",
        label: `Opened PR #${ev.number}`,
        detail: ev.summary,
      };
    case "pr:no_changes":
      return { icon: "info", tone: "muted", label: "Agent produced no edits", detail: ev.summary };
    case "snapshot:upload_start":
      return { icon: "info", tone: "muted", label: "Caching workspace snapshot" };
    case "snapshot:upload_done":
      return {
        icon: "ok",
        tone: "muted",
        label: `Snapshot cached (${formatBytes(ev.bytes)})`,
      };
    case "snapshot:upload_skipped":
      return { icon: "info", tone: "muted", label: "Snapshot skipped", detail: ev.reason };
    case "failed":
      return { icon: "error", tone: "error", label: "Job failed", detail: ev.error };
    case "done":
      return null;
  }
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)}MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

export function phaseLabel(phase: Phase | null): string {
  if (!phase) return "Queued";
  const step = PHASE_ORDER.find((s) => s.key === phase);
  if (step) return step.label;
  if (phase === "failed") return "Failed";
  return phase;
}
