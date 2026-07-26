import type { Phase } from "$lib/components/prProgress";
import type { RequestItem } from "./types";

export function absTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface ToolMeta {
  label: string;
  color: string;
  verb: string;
}

const TOOL_META: Record<string, ToolMeta> = {
  applyStyle: { label: "style", color: "#8b5cf6", verb: "applies" },
  hideElement: { label: "hide", color: "#ef4444", verb: "hides" },
  replaceText: { label: "text", color: "#3b82f6", verb: "rewrites" },
  reorderChildren: { label: "reorder", color: "#10b981", verb: "reorders" },
  insertComponent: { label: "insert", color: "#f59e0b", verb: "inserts" },
};

export function toolMeta(name: string): ToolMeta {
  return TOOL_META[name] ?? { label: name, color: "#737373", verb: "modifies" };
}

export function targetIdFromCall(c: { input?: Record<string, unknown> }): string {
  const i = c.input ?? {};
  return ((i.targetId as string) || (i.containerId as string) || "").toString();
}

const STATUS_COLOR: Record<string, string> = {
  applied: "#22c55e",
  responded: "#f59e0b",
  failed: "#ef4444",
  pending: "#a3a3a3",
};

export function statusColor(s: string): string {
  return STATUS_COLOR[s] ?? "#737373";
}

export const PHASE_KEYS: Phase[] = ["preparing", "agent_running", "opening_pr", "uploading_snapshot", "done"];

export const PHASE_SHORT_LABEL: Record<Phase, string> = {
  preparing: "Preparing",
  agent_running: "Agent",
  opening_pr: "Opening PR",
  uploading_snapshot: "Snapshot",
  done: "Done",
  failed: "Failed",
};

export function phaseIndex(phase: Phase | null): number {
  if (!phase) return -1;
  return PHASE_KEYS.indexOf(phase);
}

export type Hotkey = string;
export type HotkeyHandler = (e: KeyboardEvent) => boolean | void;
export type HotkeyMap = Record<Hotkey, HotkeyHandler>;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_COLUMNS: Array<{ header: string; get: (r: RequestItem) => unknown }> = [
  { header: "id", get: (r) => r.id },
  { header: "createdAt", get: (r) => r.createdAt },
  { header: "status", get: (r) => r.status },
  { header: "prompt", get: (r) => r.prompt },
  { header: "endUserEmail", get: (r) => r.endUserEmail },
  { header: "orgName", get: (r) => r.orgName },
  { header: "origin", get: (r) => r.origin },
  { header: "prStatus", get: (r) => r.pr?.status ?? "" },
  { header: "prNumber", get: (r) => r.pr?.number ?? "" },
  { header: "prUrl", get: (r) => r.pr?.url ?? "" },
  { header: "error", get: (r) => r.error ?? r.pr?.error ?? "" },
];

export function requestsToCsv(rows: RequestItem[]): string {
  const lines = [CSV_COLUMNS.map((c) => csvCell(c.header)).join(",")];
  for (const r of rows) {
    lines.push(CSV_COLUMNS.map((c) => csvCell(c.get(r))).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend BOM so Excel detects UTF-8 correctly with non-ASCII prompts.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function attachHotkeys(handlers: HotkeyMap): () => void {
  function onKey(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    const tag = t?.tagName;
    const editing = tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable === true;
    const key = (e.metaKey || e.ctrlKey ? "mod+" : "") + e.key.toLowerCase();
    const fn = handlers[key];
    if (!fn) return;
    if (editing && !key.startsWith("mod+") && key !== "escape") return;
    const handled = fn(e);
    if (handled !== false) e.preventDefault();
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
