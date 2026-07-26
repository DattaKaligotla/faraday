import { createStore } from "zustand/vanilla";
import type { CSSProperties } from "react";
import { sanitizeStyleValue, sanitizeCssVarName, sanitizeAttributes } from "../engine/sanitize";
import { EMPTY_VIBE_PREFERENCES, mergeVibe, type VibePreferences } from "../engine/vibe";
import { clearImperative, flushImperative } from "../engine/imperativeApplier";
import type {
  Override,
  InsertedComponent,
  ModifiableEntry,
  Action,
  ApplyResult,
  InverseAction,
  PageSnapshot,
  PermissionsConfig,
  ComponentRegistryEntry,
  ChatMessage,
  ChatContentBlock,
  HtmlInjection,
  LayoutOverride,
} from "../types";
import { sanitizeHtmlMarkup } from "../engine/sanitize";

const DEFAULT_PERMISSIONS: PermissionsConfig = {
  allowedStyleProps: [
    "color",
    "background",
    "backgroundColor",
    "fontSize",
    "fontWeight",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "borderRadius",
    "border",
    "gap",
    "display",
    "opacity",
    "textAlign",
    "letterSpacing",
    "lineHeight",
    "textDecoration",
    "width",
    "height",
    "minWidth",
    "minHeight",
    "maxWidth",
    "maxHeight",
    "flexBasis",
    "flexGrow",
    "flexShrink",
  ],
  allowedAttributes: [
    "href",
    "src",
    "alt",
    "title",
    "placeholder",
    "type",
    "value",
    "name",
    "for",
    "checked",
    "disabled",
    "readonly",
    "required",
    "min",
    "max",
    "step",
    "pattern",
    "maxlength",
    "minlength",
    "rows",
    "cols",
    "wrap",
    "target",
    "rel",
    "download",
    "loading",
    "role",
    "tabindex",
    "aria-*",
    "data-*",
  ],
  maxUndoDepth: 50,
  persist: "none",
};

export interface AgentState {
  overrides: Record<string, Override>;
  insertedComponents: Record<string, InsertedComponent[]>;
  history: InverseAction[][];
  registry: Record<string, ModifiableEntry>;
  messages: ChatMessage[];
  permissions: PermissionsConfig;
  components: Record<string, ComponentRegistryEntry>;
  /** id → incrementing token. Bumped when an action affects the id; cleared 2s later. */
  pulsingIds: Record<string, number>;
  /** containerId → desired order of child ids (mix of native Modifiable ids and inserted instanceIds). */
  containerOrder: Record<string, string[]>;
  /** targetId → list of injected HTML/SVG fragments rendered around the element. */
  injections: Record<string, HtmlInjection[]>;
  /** Active CSS custom-property overrides keyed by the canonical `--name` form. */
  themeVars: Record<string, string>;
  /** Per-container layout-mode override. */
  layoutModes: Record<string, LayoutOverride>;
  /** Cumulative tone/vibe signals extracted from this session's user messages. */
  vibePreferences: VibePreferences;

  register: (entry: ModifiableEntry) => void;
  unregister: (id: string) => void;
  apply: (action: Action, onAction?: (a: Action) => void) => ApplyResult;
  /** Returns the number of inverse-action groups actually replayed. */
  undo: (steps?: number) => number;
  markPulsing: (ids: string[]) => void;
  snapshot: () => PageSnapshot;
  /** Update vibe preferences from a user message; tags are accumulated, not replaced. */
  observeUserMessage: (message: string) => void;
  /**
   * Add a message to the conversation. Accepts either a fully-formed `ChatMessage`
   * or the legacy `{ id, role, content, streaming? }` shape — in the legacy case,
   * `blocks` is synthesized as a single text block from `content`.
   */
  appendMessage: (message: ChatMessage | LegacyChatMessageInput) => void;
  /** Stream a text delta into the last message. Maintains `blocks` and `content` together. */
  appendToLastMessage: (delta: string) => void;
  /**
   * Append non-text blocks (tool_use / tool_result) to the last message. Used by
   * the multi-turn streaming loop to record what the assistant requested and
   * what each tool returned.
   */
  appendBlocksToLastMessage: (blocks: ChatContentBlock[]) => void;
  setLastMessageStreaming: (streaming: boolean) => void;
  getPersistableState: () => {
    overrides: Record<string, Override>;
    insertedComponents: Record<string, InsertedComponent[]>;
    containerOrder: Record<string, string[]>;
    injections: Record<string, HtmlInjection[]>;
    themeVars: Record<string, string>;
    layoutModes: Record<string, LayoutOverride>;
  };
  hydrate: (snapshot: {
    overrides: Record<string, Override>;
    insertedComponents: Record<string, InsertedComponent[]>;
    containerOrder?: Record<string, string[]>;
    injections?: Record<string, HtmlInjection[]>;
    themeVars?: Record<string, string>;
    layoutModes?: Record<string, LayoutOverride>;
  }) => void;
}

export type AgentStore = ReturnType<typeof createAgentStore>;

/**
 * Pre-block-protocol shape some call sites still use. Accepted by `appendMessage`
 * for back-compat — it synthesizes a single text block from `content` so callers
 * don't have to construct `blocks` themselves for plain text messages.
 */
export interface LegacyChatMessageInput {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

function normalizeMessage(m: ChatMessage | LegacyChatMessageInput): ChatMessage {
  if ("blocks" in m) return m;
  // Empty content → empty blocks; non-empty → one text block. Streaming messages
  // typically start empty and accumulate via `appendToLastMessage`, which adds
  // the text block lazily when the first delta arrives.
  const blocks: ChatContentBlock[] = m.content ? [{ type: "text", text: m.content }] : [];
  return {
    id: m.id,
    role: m.role,
    blocks,
    content: m.content,
    ...(m.streaming !== undefined && { streaming: m.streaming }),
  };
}

function blocksToContent(blocks: ChatContentBlock[]): string {
  let out = "";
  for (const b of blocks) if (b.type === "text") out += b.text;
  return out;
}

export function createAgentStore(
  permissions: Partial<PermissionsConfig> = {},
  components: Record<string, ComponentRegistryEntry> = {},
) {
  const resolved: PermissionsConfig = {
    ...DEFAULT_PERMISSIONS,
    ...permissions,
  };

  return createStore<AgentState>()((set, get) => ({
    overrides: {},
    insertedComponents: {},
    history: [],
    registry: {},
    messages: [],
    permissions: resolved,
    components,
    pulsingIds: {},
    containerOrder: {},
    injections: {},
    themeVars: {},
    layoutModes: {},
    vibePreferences: EMPTY_VIBE_PREFERENCES,

    register(entry) {
      set((state) => ({ registry: { ...state.registry, [entry.id]: entry } }));
    },

    unregister(id) {
      // Tear down imperative-applier baselines for discovered ids before they
      // disappear from the registry — the WeakMap-style cache holds a strong
      // reference to the DOM node and to wrapper spans for injections.
      if (get().registry[id]?.discoveredVia === "findElement") {
        clearImperative(id);
      }
      set((state) => {
        const registry = { ...state.registry };
        delete registry[id];
        return { registry };
      });
    },

    apply(action, onAction) {
      if (action.type === "undo") {
        const undoneSteps = get().undo(action.steps);
        return { ok: true, data: { undoneSteps } };
      }

      const { overrides, insertedComponents, registry, history, permissions } = get();

      // Validate that the target exists — either as a registered Modifiable or as a
      // previously inserted component instance (which uses instanceId as its targetId).
      if ("targetId" in action) {
        const inRegistry = action.targetId in registry;
        const inInserted = Object.values(insertedComponents)
          .flat()
          .some((c) => c.instanceId === action.targetId);
        if (!inRegistry && !inInserted) {
          return { ok: false, reason: `Unknown targetId: ${action.targetId}` };
        }
      }
      // insertComponent skips this check because the container may not yet have any
      // inserted children and its containerId comes from the Modifiable registry, not insertedComponents.
      if ("containerId" in action && action.type !== "insertComponent") {
        if (!(action.containerId in registry)) {
          return {
            ok: false,
            reason: `Unknown containerId: ${action.containerId}`,
          };
        }
      }
      // setLayout requires the target be a registered container.
      if (action.type === "setLayout") {
        const entry = registry[action.targetId];
        if (!entry || entry.type !== "container") {
          return {
            ok: false,
            reason: `setLayout: targetId '${action.targetId}' is not a [container]`,
          };
        }
      }

      const { containerOrder, injections, themeVars, layoutModes } = get();
      let inverse: InverseAction | null = null;
      const nextOverrides = { ...overrides };
      const nextInserted = { ...insertedComponents };
      let nextContainerOrder = containerOrder;
      let nextInjections = injections;
      let nextThemeVars = themeVars;
      let nextLayoutModes = layoutModes;
      // Tool-specific structured data surfaced back to the LLM. Populated below
      // only by the cases that carry useful info (id-minting tools, sanitized
      // tools that drop entries, etc.). Keep entries small — they end up in
      // every subsequent turn's prompt as tool_result content.
      let resultData: Record<string, unknown> | undefined;

      if (action.type === "applyStyle") {
        // Filter to allowedStyleProps first, then sanitize each value for injection patterns.
        // The prev slice captures only the keys being changed so undo restores precisely those keys.
        const sanitized: CSSProperties = {};
        const dropped: string[] = [];
        for (const [k, v] of Object.entries(action.properties)) {
          if (!permissions.allowedStyleProps.includes(k)) {
            dropped.push(k);
            continue;
          }
          const clean = sanitizeStyleValue(String(v));
          if (clean !== null) (sanitized as Record<string, unknown>)[k] = clean;
          else dropped.push(k);
        }
        const applied = Object.keys(sanitized);
        resultData = { applied, ...(dropped.length ? { dropped } : {}) };
        const scope = action.scope ?? "element";
        const sliceKey = scope === "descendants" ? "descendantStyle" : "style";
        const prev = (nextOverrides[action.targetId]?.[sliceKey] ?? {}) as CSSProperties;
        const prevSlice: CSSProperties = {};
        for (const k of Object.keys(sanitized)) {
          (prevSlice as Record<string, unknown>)[k] = (prev as Record<string, unknown>)[k];
        }
        inverse = {
          type: "applyStyle",
          targetId: action.targetId,
          properties: prevSlice,
          scope,
        };
        nextOverrides[action.targetId] = {
          ...nextOverrides[action.targetId],
          [sliceKey]: { ...prev, ...sanitized },
        };
      } else if (action.type === "setText") {
        const prev = nextOverrides[action.targetId]?.text ?? registry[action.targetId]?.currentText ?? "";
        inverse = { type: "setText", targetId: action.targetId, text: prev };
        nextOverrides[action.targetId] = {
          ...nextOverrides[action.targetId],
          text: action.text,
        };
      } else if (action.type === "setVisibility") {
        const prev = nextOverrides[action.targetId]?.visible ?? true;
        inverse = {
          type: "setVisibility",
          targetId: action.targetId,
          visible: prev,
        };
        nextOverrides[action.targetId] = {
          ...nextOverrides[action.targetId],
          visible: action.visible,
        };
      } else if (action.type === "reorder") {
        // Inverse is the previous full order (containerOrder if set, else inserted order).
        const previous =
          containerOrder[action.containerId] ?? (nextInserted[action.containerId] ?? []).map((c) => c.instanceId);
        resultData = { order: action.order };
        inverse = {
          type: "reorder",
          containerId: action.containerId,
          order: previous,
        };
        nextContainerOrder = {
          ...nextContainerOrder,
          [action.containerId]: action.order,
        };
        // Also sort the inserted-components array for ids the new order mentions,
        // so render paths that read insertedComponents directly still see the new order.
        const inserted = nextInserted[action.containerId] ?? [];
        if (inserted.length > 0) {
          const indexOf = (id: string) => {
            const i = action.order.indexOf(id);
            return i === -1 ? Number.MAX_SAFE_INTEGER : i;
          };
          nextInserted[action.containerId] = inserted
            .slice()
            .sort((a, b) => indexOf(a.instanceId) - indexOf(b.instanceId));
        }
      } else if (action.type === "insertComponent") {
        inverse = {
          type: "restoreInserted",
          containerId: action.containerId,
          instanceId: action.instanceId,
        };
        resultData = { instanceId: action.instanceId };
        const existing = nextInserted[action.containerId] ?? [];
        const inserted: InsertedComponent = {
          instanceId: action.instanceId,
          componentName: action.componentName,
          props: action.props,
          position: action.position,
        };
        nextInserted[action.containerId] = [
          ...existing.slice(0, action.position),
          inserted,
          ...existing.slice(action.position),
        ];
      } else if (action.type === "injectHTML") {
        const cleanHtml = sanitizeHtmlMarkup(action.html);
        if (!cleanHtml) {
          return { ok: false, reason: "injectHTML: markup empty after sanitization" };
        }
        resultData = { injectionId: action.injectionId };
        const next: HtmlInjection = {
          injectionId: action.injectionId,
          targetId: action.targetId,
          html: cleanHtml,
          position: action.position,
        };
        nextInjections = {
          ...nextInjections,
          [action.targetId]: [...(nextInjections[action.targetId] ?? []), next],
        };
        inverse = { type: "restoreInjection", injectionId: action.injectionId };
      } else if (action.type === "applyTheme") {
        // Sanitize each (name, value) pair. Empty value clears the var.
        const cleanedNew: Record<string, string> = {};
        const cleared: string[] = [];
        for (const [rawName, rawValue] of Object.entries(action.vars)) {
          const name = sanitizeCssVarName(rawName);
          if (!name) continue;
          if (rawValue === "" || rawValue == null) {
            cleared.push(name);
            continue;
          }
          const cleanValue = sanitizeStyleValue(String(rawValue));
          if (cleanValue == null) continue;
          cleanedNew[name] = cleanValue;
        }
        if (Object.keys(cleanedNew).length === 0 && cleared.length === 0) {
          return {
            ok: false,
            reason: "applyTheme: no valid variables after sanitization",
          };
        }
        // Inverse: previous values for every name we touched (null = was unset).
        const inverseVars: Record<string, string | null> = {};
        for (const name of [...Object.keys(cleanedNew), ...cleared]) {
          inverseVars[name] = name in nextThemeVars ? nextThemeVars[name] : null;
        }
        const merged = { ...nextThemeVars, ...cleanedNew };
        for (const name of cleared) delete merged[name];
        nextThemeVars = merged;
        inverse = { type: "applyTheme", vars: inverseVars };
        resultData = {
          applied: Object.keys(cleanedNew),
          ...(cleared.length ? { cleared } : {}),
        };
      } else if (action.type === "setLayout") {
        const previous = nextLayoutModes[action.targetId] ?? null;
        const next: LayoutOverride = {
          mode: action.mode,
          ...(action.columns !== undefined && { columns: action.columns }),
        };
        nextLayoutModes = { ...nextLayoutModes, [action.targetId]: next };
        inverse = {
          type: "setLayout",
          targetId: action.targetId,
          previous,
        };
      } else if (action.type === "removeComponent") {
        let foundContainer: string | null = null;
        let foundComponent: InsertedComponent | null = null;
        for (const [cid, list] of Object.entries(nextInserted)) {
          const c = list.find((x) => x.instanceId === action.instanceId);
          if (c) {
            foundContainer = cid;
            foundComponent = c;
            break;
          }
        }
        if (!foundContainer || !foundComponent) {
          return {
            ok: false,
            reason: `removeComponent: instanceId '${action.instanceId}' not found`,
          };
        }
        nextInserted[foundContainer] = nextInserted[foundContainer].filter((c) => c.instanceId !== action.instanceId);
        if (nextContainerOrder[foundContainer]) {
          nextContainerOrder = {
            ...nextContainerOrder,
            [foundContainer]: nextContainerOrder[foundContainer].filter((id) => id !== action.instanceId),
          };
        }
        inverse = {
          type: "insertComponent",
          containerId: foundContainer,
          component: foundComponent,
        };
      } else if (action.type === "removeInjection") {
        const list = nextInjections[action.targetId] ?? [];
        const found = list.find((j) => j.injectionId === action.injectionId);
        if (!found) {
          return {
            ok: false,
            reason: `removeInjection: injectionId '${action.injectionId}' not on target '${action.targetId}'`,
          };
        }
        nextInjections = {
          ...nextInjections,
          [action.targetId]: list.filter((j) => j.injectionId !== action.injectionId),
        };
        inverse = { type: "injectHTML", injection: found };
      } else if (action.type === "setAttributes") {
        const cleaned = sanitizeAttributes(action.attributes, permissions.allowedAttributes);
        if (Object.keys(cleaned).length === 0) {
          return {
            ok: false,
            reason: "setAttributes: no allowed attributes after sanitization",
          };
        }
        const droppedAttrs = Object.keys(action.attributes).filter((k) => !(k in cleaned));
        resultData = {
          applied: Object.keys(cleaned),
          ...(droppedAttrs.length ? { dropped: droppedAttrs } : {}),
        };
        const prev = nextOverrides[action.targetId]?.attributes ?? {};
        const inverseAttrs: Record<string, string | null> = {};
        for (const k of Object.keys(cleaned)) {
          inverseAttrs[k] = k in prev ? prev[k] : null;
        }
        const merged: Record<string, string> = { ...prev };
        for (const [k, v] of Object.entries(cleaned)) {
          if (v == null) delete merged[k];
          else merged[k] = v;
        }
        nextOverrides[action.targetId] = {
          ...nextOverrides[action.targetId],
          attributes: merged,
        };
        inverse = {
          type: "setAttributes",
          targetId: action.targetId,
          attributes: inverseAttrs,
        };
      }

      // Prepend the inverse so undo replays in LIFO order; trim to maxUndoDepth.
      const nextHistory = inverse ? [[inverse], ...history].slice(0, permissions.maxUndoDepth) : history;

      set({
        overrides: nextOverrides,
        insertedComponents: nextInserted,
        containerOrder: nextContainerOrder,
        injections: nextInjections,
        themeVars: nextThemeVars,
        layoutModes: nextLayoutModes,
        history: nextHistory,
      });

      const affected: string[] = [];
      if (action.type === "applyStyle" || action.type === "setText" || action.type === "setVisibility") {
        affected.push(action.targetId);
      } else if (action.type === "reorder") {
        affected.push(action.containerId);
      } else if (action.type === "insertComponent") {
        affected.push(action.containerId, action.instanceId);
      } else if (action.type === "injectHTML") {
        affected.push(action.targetId);
      } else if (action.type === "setLayout") {
        affected.push(action.targetId);
      } else if (action.type === "setAttributes") {
        affected.push(action.targetId);
      } else if (action.type === "removeComponent") {
        affected.push(action.instanceId);
      } else if (action.type === "removeInjection") {
        affected.push(action.targetId);
      }
      if (affected.length) get().markPulsing(affected);

      // Mirror the post-set state to the live DOM for any affected id that was
      // discovered via `findElement`. Engineer-rendered Modifiables update via
      // their React subscriber and ignore this path; the helper no-ops on
      // non-discovered ids.
      const postState = get();
      for (const id of affected) {
        if (postState.registry[id]?.discoveredVia === "findElement") {
          flushImperative(postState, id);
        }
      }

      onAction?.(action);
      return { ok: true, ...(resultData && { data: resultData }) };
    },

    undo(steps = 1) {
      const { history, overrides, insertedComponents, containerOrder, injections, themeVars, layoutModes } = get();
      let nextOverrides = { ...overrides };
      let nextInserted = { ...insertedComponents };
      let nextContainerOrder = { ...containerOrder };
      let nextInjections = { ...injections };
      let nextThemeVars = { ...themeVars };
      let nextLayoutModes = { ...layoutModes };
      let remaining = history;
      const touched: string[] = [];
      let undoneSteps = 0;

      // Walk the LIFO stack, replaying each group of inverse actions in order.
      for (let i = 0; i < steps && remaining.length > 0; i++) {
        const [inverses, ...rest] = remaining;
        remaining = rest;
        undoneSteps++;
        for (const inv of inverses) {
          if ("targetId" in inv) touched.push(inv.targetId);
          else if ("containerId" in inv) touched.push(inv.containerId);
          if (inv.type === "applyStyle") {
            const sliceKey = inv.scope === "descendants" ? "descendantStyle" : "style";
            nextOverrides[inv.targetId] = {
              ...nextOverrides[inv.targetId],
              [sliceKey]: {
                ...(nextOverrides[inv.targetId]?.[sliceKey] ?? {}),
                ...inv.properties,
              },
            };
          } else if (inv.type === "setText") {
            nextOverrides[inv.targetId] = {
              ...nextOverrides[inv.targetId],
              text: inv.text,
            };
          } else if (inv.type === "setVisibility") {
            nextOverrides[inv.targetId] = {
              ...nextOverrides[inv.targetId],
              visible: inv.visible,
            };
          } else if (inv.type === "reorder") {
            nextContainerOrder[inv.containerId] = inv.order;
            const current = nextInserted[inv.containerId] ?? [];
            const indexOf = (id: string) => {
              const i = inv.order.indexOf(id);
              return i === -1 ? Number.MAX_SAFE_INTEGER : i;
            };
            nextInserted[inv.containerId] = current
              .slice()
              .sort((a, b) => indexOf(a.instanceId) - indexOf(b.instanceId));
          } else if (inv.type === "restoreInserted") {
            nextInserted[inv.containerId] = (nextInserted[inv.containerId] ?? []).filter(
              (c) => c.instanceId !== inv.instanceId,
            );
            if (nextContainerOrder[inv.containerId]) {
              nextContainerOrder = {
                ...nextContainerOrder,
                [inv.containerId]: nextContainerOrder[inv.containerId].filter((id) => id !== inv.instanceId),
              };
            }
          } else if (inv.type === "restoreInjection") {
            for (const tId of Object.keys(nextInjections)) {
              const filtered = nextInjections[tId].filter((j) => j.injectionId !== inv.injectionId);
              if (filtered.length !== nextInjections[tId].length) {
                touched.push(tId);
                nextInjections[tId] = filtered;
              }
            }
          } else if (inv.type === "insertComponent") {
            const existing = nextInserted[inv.containerId] ?? [];
            const at = Math.min(inv.component.position, existing.length);
            nextInserted[inv.containerId] = [...existing.slice(0, at), inv.component, ...existing.slice(at)];
            touched.push(inv.containerId, inv.component.instanceId);
          } else if (inv.type === "injectHTML") {
            const tId = inv.injection.targetId;
            nextInjections[tId] = [...(nextInjections[tId] ?? []), inv.injection];
            touched.push(tId);
          } else if (inv.type === "applyTheme") {
            for (const [name, value] of Object.entries(inv.vars)) {
              if (value == null) delete nextThemeVars[name];
              else nextThemeVars[name] = value;
            }
          } else if (inv.type === "setLayout") {
            if (inv.previous) nextLayoutModes[inv.targetId] = inv.previous;
            else delete nextLayoutModes[inv.targetId];
          } else if (inv.type === "setAttributes") {
            const cur = { ...(nextOverrides[inv.targetId]?.attributes ?? {}) };
            for (const [k, v] of Object.entries(inv.attributes)) {
              if (v == null) delete cur[k];
              else cur[k] = v;
            }
            nextOverrides[inv.targetId] = {
              ...nextOverrides[inv.targetId],
              attributes: cur,
            };
          }
        }
      }

      set({
        overrides: nextOverrides,
        insertedComponents: nextInserted,
        containerOrder: nextContainerOrder,
        injections: nextInjections,
        themeVars: nextThemeVars,
        layoutModes: nextLayoutModes,
        history: remaining,
      });
      if (touched.length) get().markPulsing(touched);
      // Mirror undone state to the live DOM for any touched discovered id.
      const postState = get();
      const seen = new Set<string>();
      for (const id of touched) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (postState.registry[id]?.discoveredVia === "findElement") {
          flushImperative(postState, id);
        }
      }
      return undoneSteps;
    },

    markPulsing(ids) {
      set((state) => {
        const next = { ...state.pulsingIds };
        for (const id of ids) next[id] = (next[id] ?? 0) + 1;
        return { pulsingIds: next };
      });
      const tokens: Record<string, number> = {};
      const snap = get().pulsingIds;
      for (const id of ids) tokens[id] = snap[id];
      setTimeout(() => {
        set((state) => {
          const next = { ...state.pulsingIds };
          for (const id of ids) {
            // Only delete if no later mark superseded ours.
            if (next[id] === tokens[id]) delete next[id];
          }
          return { pulsingIds: next };
        });
      }, 2000);
    },

    snapshot() {
      const {
        registry,
        overrides,
        insertedComponents,
        components,
        containerOrder,
        injections,
        themeVars,
        layoutModes,
      } = get();
      return {
        modifiables: Object.values(registry).map((entry) => {
          const style = overrides[entry.id]?.style;
          const descendantStyle = overrides[entry.id]?.descendantStyle;
          const attributes = overrides[entry.id]?.attributes;
          return {
            ...entry,
            ...(style !== undefined && { currentStyle: style }),
            ...(descendantStyle !== undefined && {
              currentDescendantStyle: descendantStyle,
            }),
            ...(attributes !== undefined && { currentAttributes: attributes }),
          };
        }),
        insertedComponents,
        containerOrder,
        injections,
        components: Object.entries(components).map(([name, entry]) => ({
          name,
          props: entry.propsSchema ?? {},
        })),
        themeVars,
        layoutModes,
      };
    },

    observeUserMessage(message) {
      set((s) => ({ vibePreferences: mergeVibe(s.vibePreferences, message) }));
    },

    appendMessage(message) {
      set((s) => ({ messages: [...s.messages, normalizeMessage(message)] }));
    },

    appendToLastMessage(delta) {
      set((s) => {
        const messages = [...s.messages];
        const last = messages[messages.length - 1];
        if (!last) return {};
        // Append to a trailing text block when present; otherwise create one.
        // This keeps `blocks` canonical even when text is interleaved with
        // tool_use blocks pushed via `appendBlocksToLastMessage`.
        const blocks = [...last.blocks];
        const tail = blocks[blocks.length - 1];
        if (tail && tail.type === "text") {
          blocks[blocks.length - 1] = { type: "text", text: tail.text + delta };
        } else {
          blocks.push({ type: "text", text: delta });
        }
        messages[messages.length - 1] = {
          ...last,
          blocks,
          content: blocksToContent(blocks),
        };
        return { messages };
      });
    },

    appendBlocksToLastMessage(extra) {
      set((s) => {
        const messages = [...s.messages];
        const last = messages[messages.length - 1];
        if (!last) return {};
        const blocks = [...last.blocks, ...extra];
        messages[messages.length - 1] = {
          ...last,
          blocks,
          content: blocksToContent(blocks),
        };
        return { messages };
      });
    },

    setLastMessageStreaming(streaming) {
      set((s) => {
        const messages = [...s.messages];
        const last = messages[messages.length - 1];
        if (!last) return {};
        messages[messages.length - 1] = { ...last, streaming };
        return { messages };
      });
    },

    getPersistableState() {
      const { overrides, insertedComponents, containerOrder, injections, themeVars, layoutModes } = get();
      return {
        overrides,
        insertedComponents,
        containerOrder,
        injections,
        themeVars,
        layoutModes,
      };
    },

    hydrate(snapshot) {
      const { registry } = get();
      const overrides: Record<string, Override> = {};
      for (const [id, value] of Object.entries(snapshot.overrides ?? {})) {
        if (id in registry) overrides[id] = value;
      }
      const insertedComponents: Record<string, InsertedComponent[]> = {};
      for (const [containerId, list] of Object.entries(snapshot.insertedComponents ?? {})) {
        if (containerId in registry) insertedComponents[containerId] = list;
      }
      const containerOrder: Record<string, string[]> = {};
      for (const [containerId, list] of Object.entries(snapshot.containerOrder ?? {})) {
        if (containerId in registry) containerOrder[containerId] = list;
      }
      const injections: Record<string, HtmlInjection[]> = {};
      for (const [targetId, list] of Object.entries(
        (snapshot as { injections?: Record<string, HtmlInjection[]> }).injections ?? {},
      )) {
        if (targetId in registry) injections[targetId] = list;
      }
      const layoutModes: Record<string, LayoutOverride> = {};
      for (const [containerId, override] of Object.entries(snapshot.layoutModes ?? {})) {
        if (containerId in registry) layoutModes[containerId] = override;
      }
      // themeVars are document-level, not registry-scoped — keep as-is.
      const themeVars = snapshot.themeVars ?? {};
      set({
        overrides,
        insertedComponents,
        containerOrder,
        injections,
        themeVars,
        layoutModes,
        history: [],
      });
    },
  }));
}
