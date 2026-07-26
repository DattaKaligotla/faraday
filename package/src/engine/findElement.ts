import type { AgentStore } from "../provider/store";
import { isCardShaped, slugifyForId } from "./perception";
import { registerDiscoveredElement } from "./imperativeApplier";

/**
 * Resolve a natural-language reference to a real DOM element on the host page,
 * stamp it with a synthetic id, and register it so subsequent tools can target
 * it like any other Modifiable.
 *
 * The agent uses this when an element it wants to change isn't in the page tree
 * (i.e. wasn't wrapped in `<Modifiable>` by the engineer). The returned id is
 * the bridge — it lands in the model's `tool_result` and gets passed verbatim
 * as `targetId` on the next turn's `applyStyle` / `setText` / etc.
 *
 * Resolution is best-effort. We score candidates against the query and a few
 * optional hints (text fragment, ARIA role, nearby anchor), apply a confidence
 * threshold, and return `{ ok: false }` rather than guess when nothing scores
 * well. The agent surfaces that to the user instead of acting on a wrong target.
 */
const FIND_ID_PREFIX = "fdy-find-";
const ID_PATTERN = /^fdy-find-[a-z0-9-]{1,48}$/;
const MAX_DISCOVERIES_PER_SESSION = 60;
const MAX_CANDIDATE_NODES = 1500;
const SCORE_THRESHOLD = 25;
const ACCESSIBLE_NAME_LIMIT = 200;

const STOPLIST = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "with",
  "for",
  "in",
  "on",
  "at",
  "and",
  "or",
  "is",
  "are",
  "this",
  "that",
]);

interface FindElementInput {
  query: string;
  role?: string;
  text?: string;
  near?: string;
}

export type FindElementResult =
  | { ok: true; id: string; resolvedVia: "id" | "data-attr" }
  | { ok: false; reason: string };

interface Candidate {
  el: HTMLElement;
  name: string;
  score: number;
  area: number;
}

export function findElement(store: AgentStore, input: FindElementInput): FindElementResult {
  if (typeof document === "undefined") {
    return { ok: false, reason: "findElement: no DOM available" };
  }

  const query = input.query.trim().slice(0, 200);
  if (!query) return { ok: false, reason: "findElement: empty query" };

  const state = store.getState();
  // Per-session cap. Prevents the agent from accidentally registering hundreds
  // of synthetic ids in a runaway loop and enlarging the page tree without bound.
  const discoveryCount = Object.values(state.registry).filter((e) => e.discoveredVia === "findElement").length;
  if (discoveryCount >= MAX_DISCOVERIES_PER_SESSION) {
    return {
      ok: false,
      reason: `findElement: discovery cap (${MAX_DISCOVERIES_PER_SESSION}) reached for this session`,
    };
  }

  const queryTokens = tokenize(query);
  const text = input.text?.trim().toLowerCase();
  const role = input.role?.trim().toLowerCase();
  const near = input.near ? (document.getElementById(input.near) ?? null) : null;

  const wantsCardShape = /\b(card|section|panel|tile)\b/i.test(query);

  let best: Candidate | null = null;

  const evaluate = (root: HTMLElement) => {
    let scanned = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node: Node) {
        if (scanned >= MAX_CANDIDATE_NODES) return NodeFilter.FILTER_REJECT;
        const el = node as HTMLElement;
        if (!isEligible(el)) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let node: Node | null = walker.nextNode();
    while (node) {
      if (scanned >= MAX_CANDIDATE_NODES) break;
      scanned++;
      const el = node as HTMLElement;
      const name = accessibleName(el);
      let score = 0;

      if (text && name.toLowerCase().includes(text)) score += 50;
      if (queryTokens.size > 0 && name) score += jaccardScore(queryTokens, tokenize(name));
      if (role) {
        const elRole = el.getAttribute("role")?.toLowerCase() ?? el.tagName.toLowerCase();
        if (elRole === role) score += 20;
      }
      if (near) {
        if (near.contains(el) && near !== el) score += 10;
        else if (sharedAncestorWithin(el, near, 3)) score += 5;
      }
      if (wantsCardShape && isCardShaped(el)) score += 8;

      if (score === 0) {
        node = walker.nextNode();
        continue;
      }

      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      const viewportArea = window.innerWidth * window.innerHeight || 1;
      if (area / viewportArea > 0.6) score -= 5;

      if (score >= SCORE_THRESHOLD) {
        if (!best || score > best.score || (score === best.score && area < best.area)) {
          best = { el, name, score, area };
        }
      }
      node = walker.nextNode();
    }
  };

  // First pass: scope to `near`'s subtree if provided. Fall back to body if the
  // initial pass found nothing.
  if (near) evaluate(near);
  if (!best) evaluate(document.body);

  if (!best) {
    return {
      ok: false,
      reason: `findElement: no confident match for query: ${query}`,
    };
  }

  // Mint id from the resolved element's accessible name (or fall back to the
  // query if the element is unnamed). Suffix on collision with the registry
  // OR with any pre-existing element id in the document.
  const candidate: Candidate = best;
  const baseSlug = slugifyForId(candidate.name) || slugifyForId(query) || "match";
  let id = `${FIND_ID_PREFIX}${baseSlug}`.slice(0, 56);
  let suffix = 2;
  while (!ID_PATTERN.test(id) || id in state.registry || document.getElementById(id)) {
    const candidateId = `${FIND_ID_PREFIX}${baseSlug}-${suffix}`.slice(0, 56);
    if (candidateId === id) {
      // Shouldn't happen under our slug discipline but bail rather than spin.
      return {
        ok: false,
        reason: "findElement: failed to mint a unique id (try a more specific query)",
      };
    }
    id = candidateId;
    suffix++;
    if (suffix > 50) {
      return {
        ok: false,
        reason: "findElement: failed to mint a unique id after 50 attempts",
      };
    }
  }

  // Stamp the element. If it already has an id, we DON'T overwrite — host code
  // (CSS selectors, anchor links, JS hooks) might depend on it. Use a fallback
  // attribute the imperative applier knows to query.
  let resolvedVia: "id" | "data-attr";
  if (candidate.el.id) {
    candidate.el.setAttribute("data-faraday-find", id);
    resolvedVia = "data-attr";
  } else {
    candidate.el.id = id;
    resolvedVia = "id";
  }

  registerDiscoveredElement(id, candidate.el);
  state.register({
    id,
    tag: candidate.el.tagName.toLowerCase(),
    type: "element",
    ...(candidate.name && {
      currentText: candidate.name.slice(0, 80),
    }),
    discoveredVia: "findElement",
  });

  return { ok: true, id, resolvedVia };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function isEligible(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.hasAttribute("data-faraday-injection")) return false;
  // Trust inline `display: none` / `visibility: hidden` as the cheap signal —
  // jsdom returns zero-area rects for everything and unreliable offsetParent
  // values, so a rect-based check is too aggressive in tests. Real browsers
  // rarely have visible elements with display:none anyway.
  if (typeof window !== "undefined") {
    const cs = window.getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
  }
  return true;
}

/**
 * Accessible-name approximation. Order of precedence mirrors the ARIA spec
 * approximately, biased toward what the LLM is likely to mean by "the X
 * button" / "the Y heading":
 *   aria-label → aria-labelledby → title → alt → placeholder → linked label →
 *   the element's own innerText.
 */
export function accessibleName(el: HTMLElement): string {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return clamp(ariaLabel);

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/).filter(Boolean);
    const parts: string[] = [];
    for (const refId of ids) {
      const ref = document.getElementById(refId);
      if (ref) parts.push(ref.textContent ?? "");
    }
    const joined = parts.join(" ").trim();
    if (joined) return clamp(joined);
  }

  const title = el.getAttribute("title");
  if (title) return clamp(title);

  if (el.tagName === "IMG") {
    const alt = el.getAttribute("alt");
    if (alt) return clamp(alt);
  }

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    const placeholder = el.getAttribute("placeholder");
    if (placeholder) return clamp(placeholder);
    const id = el.id;
    if (id) {
      const linked = document.querySelector<HTMLElement>(`label[for="${cssEscapeAttr(id)}"]`);
      if (linked) return clamp(linked.textContent ?? "");
    }
  }

  // innerText is preferred over textContent for visibility-aware text, but
  // jsdom doesn't implement it — fall back to textContent.
  const raw = ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ");
  return clamp(raw.trim());
}

function clamp(s: string): string {
  return s.length > ACCESSIBLE_NAME_LIMIT ? s.slice(0, ACCESSIBLE_NAME_LIMIT) : s;
}

function cssEscapeAttr(s: string): string {
  return s.replace(/"/g, '\\"');
}

export function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  for (const raw of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2) continue;
    if (STOPLIST.has(raw)) continue;
    out.add(raw);
  }
  return out;
}

/**
 * Jaccard similarity scaled to a 0..30 range. Returns 0 when there's no
 * overlap so it doesn't poison candidates that match through other signals.
 */
function jaccardScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  if (intersect === 0) return 0;
  const union = a.size + b.size - intersect;
  return Math.round((intersect / union) * 30);
}

function sharedAncestorWithin(a: HTMLElement, b: HTMLElement, withinHops: number): boolean {
  const ancestors = new Set<HTMLElement>();
  let cur: HTMLElement | null = a;
  let i = 0;
  while (cur && i < withinHops) {
    ancestors.add(cur);
    cur = cur.parentElement;
    i++;
  }
  cur = b;
  i = 0;
  while (cur && i < withinHops) {
    if (ancestors.has(cur)) return true;
    cur = cur.parentElement;
    i++;
  }
  return false;
}
