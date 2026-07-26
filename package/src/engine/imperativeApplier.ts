import type { CSSProperties } from "react";
import type { AgentState } from "../provider/store";
import type { HtmlInjection, Override } from "../types";

/**
 * Mirror store overrides to the live DOM for entries created by `findElement`.
 *
 * Why this exists: every other override pathway in the SDK depends on a React
 * subscriber inside `Modifiable` to repaint. Discovered (off-tree) elements are
 * NOT inside any Modifiable, so a store change alone is invisible — we have to
 * mutate the live DOM ourselves.
 *
 * The applier captures pre-state on first write into `baselines` so undo can
 * restore the exact prior values. It is intentionally minimal: it does NOT
 * observe host re-renders that blow away the changes (a MutationObserver-based
 * resync is a follow-up).
 */
interface ImperativeBaseline {
  /** Pre-write inline-style values for every property we have ever written. */
  styleProps: Map<string, string>;
  /** Initial textContent at first write; null when text has never been touched. */
  text: string | null;
  /** Pre-write attribute values; `null` = attribute was absent. */
  attributes: Map<string, string | null>;
  /** Pre-write `style.display` for visibility undo; null when never touched. */
  display: string | null;
  /** Live DOM nodes for each materialized injection, keyed by injectionId. */
  injectionWrappers: Map<string, HTMLElement>;
}

const baselines = new Map<string, ImperativeBaseline>();
const discoveredElements = new Map<string, HTMLElement>();

function getBaseline(id: string): ImperativeBaseline {
  let b = baselines.get(id);
  if (!b) {
    b = {
      styleProps: new Map(),
      text: null,
      attributes: new Map(),
      display: null,
      injectionWrappers: new Map(),
    };
    baselines.set(id, b);
  }
  return b;
}

/**
 * Cache the resolved DOM element for a discovered id. `findElement` calls this
 * after stamping the element so the applier doesn't have to re-query the DOM
 * on every write.
 */
export function registerDiscoveredElement(id: string, el: HTMLElement): void {
  discoveredElements.set(id, el);
}

export function unregisterDiscoveredElement(id: string): void {
  discoveredElements.delete(id);
}

/**
 * Resolve a discovered id to its DOM element. Falls through three layers:
 *   1. The WeakMap-style cache populated at discovery time (fast path, survives
 *      host re-renders that detach the node from the document).
 *   2. The `data-faraday-find` attribute (used when the element already had a
 *      host-supplied `id` and we couldn't overwrite it).
 *   3. `document.getElementById` (the common path when we own the id).
 *
 * Returns `null` when nothing matches — the applier no-ops in that case rather
 * than throwing, so the store stays the source of truth even if the element
 * vanished.
 */
export function resolveDiscovered(id: string): HTMLElement | null {
  const cached = discoveredElements.get(id);
  if (cached && cached.isConnected) return cached;
  if (typeof document === "undefined") return null;
  const byAttr = document.querySelector<HTMLElement>(`[data-faraday-find="${cssEscape(id)}"]`);
  if (byAttr) {
    discoveredElements.set(id, byAttr);
    return byAttr;
  }
  const byId = document.getElementById(id);
  if (byId) {
    discoveredElements.set(id, byId);
    return byId;
  }
  return null;
}

function cssEscape(s: string): string {
  // Cheap CSS string escape — synthetic ids are constrained to fdy-find-[a-z0-9-]
  // by `findElement`, so this is just defensive against accidental misuse.
  return s.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

/**
 * Capture the live DOM's current value for a slice the store is about to
 * change. Idempotent per (id, slice, key) — only the FIRST capture sticks, so
 * subsequent overrides don't shift the undo target.
 *
 * Called by the store from inside `apply()` BEFORE writing the new override.
 * That ordering matters: by the time the override lands, the live DOM might
 * already have agent-written values, so capturing then would freeze "agent
 * change N" as the baseline rather than the host's true initial state.
 */
export function captureBaseline(
  id: string,
  slice: "style" | "text" | "visibility" | "attributes",
  hint?: { keys?: string[] },
): void {
  const el = resolveDiscovered(id);
  if (!el) return;
  const b = getBaseline(id);
  if (slice === "style" && hint?.keys) {
    for (const key of hint.keys) {
      const cssKey = camelToKebab(key);
      if (!b.styleProps.has(cssKey)) {
        b.styleProps.set(cssKey, el.style.getPropertyValue(cssKey));
      }
    }
  } else if (slice === "text") {
    if (b.text === null) b.text = el.textContent ?? "";
  } else if (slice === "visibility") {
    if (b.display === null) b.display = el.style.display;
  } else if (slice === "attributes" && hint?.keys) {
    for (const key of hint.keys) {
      if (!b.attributes.has(key)) {
        b.attributes.set(key, el.hasAttribute(key) ? el.getAttribute(key) : null);
      }
    }
  }
}

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Reconcile the live DOM for `id` to whatever the store currently says. Called
 * by the store after every `apply()` and `undo()` step that affects a
 * discovered id.
 *
 * Implementation is fully idempotent: it computes desired-vs-current diffs from
 * the captured baseline, so re-running it is a no-op when nothing changed. New
 * style keys / attributes appearing in the override are written and recorded
 * in the baseline if not already; entries that disappear from the override get
 * restored to baseline.
 */
export function flushImperative(state: AgentState, id: string): void {
  const entry = state.registry[id];
  if (!entry || entry.discoveredVia !== "findElement") return;

  const el = resolveDiscovered(id);
  if (!el) return;

  const baseline = getBaseline(id);
  const override: Override | undefined = state.overrides[id];

  // ----- style -----
  // The store's allowlist already filtered the property names; we trust them here.
  // Note: undo's inverse-action replay can write `{ color: undefined }` — that
  // means "restore baseline for this key", NOT "set the literal string". We
  // detect those entries below and treat them as removals.
  const desiredStyle = (override?.style ?? {}) as Record<string, unknown>;
  const tracked = new Set(baseline.styleProps.keys());
  for (const [k, v] of Object.entries(desiredStyle)) {
    const cssKey = camelToKebab(k);
    if (!baseline.styleProps.has(cssKey)) {
      baseline.styleProps.set(cssKey, el.style.getPropertyValue(cssKey));
    }
    if (v === undefined || v === null || v === "") {
      const prior = baseline.styleProps.get(cssKey) ?? "";
      if (prior) el.style.setProperty(cssKey, prior);
      else el.style.removeProperty(cssKey);
    } else {
      el.style.setProperty(cssKey, String(v));
    }
    tracked.delete(cssKey);
  }
  // Properties we'd previously written but the override no longer contains
  // at all: restore baseline.
  for (const cssKey of tracked) {
    const prior = baseline.styleProps.get(cssKey) ?? "";
    if (prior) el.style.setProperty(cssKey, prior);
    else el.style.removeProperty(cssKey);
  }

  // ----- text -----
  if (override?.text !== undefined) {
    if (baseline.text === null) baseline.text = el.textContent ?? "";
    if (el.textContent !== override.text) el.textContent = override.text;
  } else if (baseline.text !== null) {
    if (el.textContent !== baseline.text) el.textContent = baseline.text;
  }

  // ----- visibility -----
  if (override?.visible === false) {
    if (baseline.display === null) baseline.display = el.style.display;
    el.style.display = "none";
  } else if (baseline.display !== null) {
    el.style.display = baseline.display;
    // Allow re-capture if visibility is toggled again later.
    if (override?.visible === undefined) baseline.display = null;
  }

  // ----- attributes -----
  const desiredAttrs = override?.attributes ?? {};
  const trackedAttrs = new Set(baseline.attributes.keys());
  for (const [k, v] of Object.entries(desiredAttrs)) {
    if (!baseline.attributes.has(k)) {
      baseline.attributes.set(k, el.hasAttribute(k) ? el.getAttribute(k) : null);
    }
    el.setAttribute(k, v);
    trackedAttrs.delete(k);
  }
  for (const k of trackedAttrs) {
    const prior = baseline.attributes.get(k);
    if (prior == null) el.removeAttribute(k);
    else el.setAttribute(k, prior);
  }

  // ----- injections -----
  const desiredInjections: HtmlInjection[] = state.injections[id] ?? [];
  const desiredById = new Map(desiredInjections.map((inj) => [inj.injectionId, inj]));

  // Remove wrappers no longer present in the desired set.
  for (const [injectionId, wrapper] of baseline.injectionWrappers) {
    if (!desiredById.has(injectionId)) {
      wrapper.remove();
      baseline.injectionWrappers.delete(injectionId);
    }
  }
  // Materialize new injections.
  for (const inj of desiredInjections) {
    if (baseline.injectionWrappers.has(inj.injectionId)) continue;
    const wrapper = createInjectionWrapper(inj);
    insertWrapper(el, wrapper, inj.position);
    baseline.injectionWrappers.set(inj.injectionId, wrapper);
  }

  // Suppress unused-import lint when CSSProperties tree-shakes — kept here for
  // type-only reference at the top of the file.
  void (null as unknown as CSSProperties);
}

function createInjectionWrapper(inj: HtmlInjection): HTMLElement {
  const wrapper = document.createElement("span");
  wrapper.setAttribute("data-faraday-injection", inj.injectionId);
  wrapper.style.display = "contents";
  // Markup is sanitized at the store boundary (`sanitizeHtmlMarkup`), so it's
  // safe to write directly.
  wrapper.innerHTML = inj.html;
  return wrapper;
}

function insertWrapper(anchor: HTMLElement, wrapper: HTMLElement, position: HtmlInjection["position"]): void {
  if (position === "before") {
    anchor.parentElement?.insertBefore(wrapper, anchor);
  } else if (position === "after") {
    anchor.parentElement?.insertBefore(wrapper, anchor.nextSibling);
  } else if (position === "inside-start") {
    anchor.insertBefore(wrapper, anchor.firstChild);
  } else if (position === "inside-end") {
    anchor.appendChild(wrapper);
  }
}

/**
 * Drop all baseline state for a discovered id — used when the entry is
 * unregistered. Live DOM mutations are left in place; the store should have
 * already replayed inverses if undo was desired.
 */
export function clearImperative(id: string): void {
  const baseline = baselines.get(id);
  if (baseline) {
    for (const wrapper of baseline.injectionWrappers.values()) wrapper.remove();
    baselines.delete(id);
  }
  discoveredElements.delete(id);
}

/**
 * Read a captured baseline value. Used by the store's inverse-action capture
 * to seed undo entries with the live-DOM "before" state for first-touch
 * actions on discovered ids — the override map is empty at first touch, so
 * without this seed undo would restore an empty value rather than the host's
 * original.
 */
export function getImperativePrev(
  id: string,
  slice: "style" | "text" | "visibility" | "attributes",
): unknown | undefined {
  const b = baselines.get(id);
  if (!b) return undefined;
  if (slice === "style") {
    if (b.styleProps.size === 0) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of b.styleProps) out[kebabToCamel(k)] = v;
    return out;
  }
  if (slice === "text") return b.text ?? undefined;
  if (slice === "visibility") return b.display ?? undefined;
  if (slice === "attributes") {
    if (b.attributes.size === 0) return undefined;
    const out: Record<string, string | null> = {};
    for (const [k, v] of b.attributes) out[k] = v;
    return out;
  }
  return undefined;
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Test-only: drop ALL applier state. Used by vitest reset hooks. */
export function __resetImperativeApplier(): void {
  baselines.clear();
  discoveredElements.clear();
}
