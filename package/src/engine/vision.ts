/**
 * Vision helpers — capture screenshots of the live page so the agent can
 * literally see what it's editing. Used both as input to the first turn (so
 * the model has visual context alongside the DOM snapshot) and as the basis
 * for the self-verification turn (compare before/after).
 *
 * SSR-safe: every export no-ops when document/window is undefined.
 */

import { domToPng } from "modern-screenshot";

interface CaptureOptions {
  /** CSS selector for the element to capture. Defaults to the document root. */
  rootSelector?: string;
  /** Render scale. 1 = native pixel size; 0.5 halves it. Smaller = smaller payload. */
  scale?: number;
  /**
   * Hide elements matching this selector during capture (e.g. the chat panel
   * itself so it doesn't end up in the screenshot the agent sees).
   */
  hideSelector?: string;
  /** Don't bother capturing if the result would exceed this many bytes after base64. */
  maxBytes?: number;
}

const DEFAULT_OPTS: Required<Pick<CaptureOptions, "scale" | "hideSelector" | "maxBytes">> = {
  scale: 0.6,
  hideSelector: "[data-faraday]",
  maxBytes: 800_000, // ~600KB on the wire after base64 overhead
};

export interface ScreenshotResult {
  /** Base64-encoded PNG, no data: prefix. */
  base64: string;
  mediaType: "image/png";
  /** Roughly how many bytes the encoded image takes — useful for log/budget tracking. */
  bytes: number;
}

/**
 * Capture the visible page (or a chosen root) as a PNG and return it as base64
 * suitable for an Anthropic `image` content block. Returns null on any failure
 * (capture never blocks an agent request — the model still has DOM context).
 *
 * The faraday widget chrome is hidden during capture so the model only sees
 * the host's UI — otherwise it would treat the orange dot and chat panel as
 * part of the page it's supposed to edit.
 */
/**
 * Maximum host-DOM size we'll try to rasterize before bailing. `modern-screenshot`
 * walks every node, inlines computed styles, and renders via SVG foreignObject —
 * on large React apps (Supabase Studio, etc) that serialization can block the
 * main thread for multiple seconds per call. We sample the host's node count and
 * skip vision when it's clearly too big; the agent still has the DOM snapshot
 * for context, it just doesn't get a visual confirmation of its edits.
 */
const MAX_NODES_FOR_CAPTURE = 1500;

export async function captureViewport(opts: CaptureOptions = {}): Promise<ScreenshotResult | null> {
  // Disabled: `modern-screenshot` rasterizes the entire DOM via SVG foreignObject,
  // which blocks the main thread for multiple seconds on real apps (Supabase
  // Studio, etc.). The agent still sees the page via the structured DOM snapshot
  // in `buildPageContext`, so it can reason about layout and edit targets — it
  // just doesn't get a PNG to visually verify. Re-enable per-host with
  // `opts.scale` checks if you ever want this back.
  return null;
  // eslint-disable-next-line no-unreachable
  if (typeof document === "undefined" || typeof window === "undefined") return null;

  const { scale, hideSelector, maxBytes } = { ...DEFAULT_OPTS, ...opts };
  const root: HTMLElement =
    ((opts.rootSelector ? document.querySelector(opts.rootSelector) : document.body) as HTMLElement | null) ??
    document.body;
  if (!root) return null;

  // Temporarily hide widget chrome — modern-screenshot reads computed style,
  // so visibility:hidden + opacity:0 keeps layout stable for the host UI.
  const hidden: Array<{ el: HTMLElement; prev: string }> = [];
  if (hideSelector) {
    document.querySelectorAll<HTMLElement>(hideSelector).forEach((el) => {
      hidden.push({ el, prev: el.style.visibility });
      el.style.visibility = "hidden";
    });
  }

  try {
    const dataUrl = await domToPng(root, {
      scale,
      // modern-screenshot embeds web fonts inline by default; that's slow and
      // pulls cross-origin requests. Skip — text rendering is fine without it.
      font: false,
      // Skip background fetches we can't control (e.g. tracking pixels).
      filter: (node) => {
        if (!(node as HTMLElement).tagName) return true;
        const tag = (node as HTMLElement).tagName.toLowerCase();
        return tag !== "script" && tag !== "noscript";
      },
    });
    const base64 = dataUrl.split(",")[1] ?? "";
    if (!base64) return null;
    // Approximate decoded byte length: base64 inflates by ~33%.
    const bytes = Math.floor((base64.length * 3) / 4);
    if (bytes > maxBytes) {
      // Don't ship oversized payloads — log and bail. Caller treats null as
      // "no vision this turn" and the model still has DOM context to work from.
      console.warn(`[faraday/vision] screenshot ${bytes} bytes exceeds ${maxBytes} budget`);
      return null;
    }
    return { base64, mediaType: "image/png", bytes };
  } catch (e) {
    console.warn("[faraday/vision] capture failed:", e);
    return null;
  } finally {
    for (const { el, prev } of hidden) el.style.visibility = prev;
  }
}
