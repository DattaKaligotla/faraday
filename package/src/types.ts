import type { CSSProperties } from "react";

/** Agent-applied overrides for a single modifiable element. Merged on top of the element's base styles/text. */
export interface Override {
  text?: string;
  style?: CSSProperties;
  visible?: boolean;
  /** Attribute overrides (href, src, placeholder, aria-*, data-*, …). Merged into the rendered element's props. */
  attributes?: Record<string, string>;
  /** Style applied to every DOM descendant of this id (cascades through `useResolvedStyle`). */
  descendantStyle?: CSSProperties;
}

/** A component instance inserted into a container by the agent. */
export interface InsertedComponent {
  instanceId: string;
  componentName: string;
  props: Record<string, unknown>;
  /** 0-based insertion index within the container's children. */
  position: number;
}

/** JSX source location captured from React's fiber tree. Dev-mode only. */
export interface SourceLocation {
  fileName: string;
  lineNumber: number;
  columnNumber?: number;
}

/**
 * Registry entry for an element that the agent can target.
 *
 * `type` controls what the agent can do with the element:
 * - `"element"` (default) — style, text, and visibility changes
 * - `"text"` — text changes only
 * - `"container"` — accepts `insertComponent` / `reorder` actions; child components render inside it
 */
export interface ModifiableEntry {
  id: string;
  tag: string;
  type: "text" | "element" | "container";
  /** ID of the parent container this element belongs to, if nested. */
  containerId?: string;
  /** Current text content, kept in sync so the LLM snapshot reflects live state. */
  currentText?: string;
  /**
   * Marks entries created by `findElement` rather than by an engineer-rendered
   * `<Modifiable>`. The store uses this flag to mirror overrides to the live DOM
   * via the imperative applier, since these entries have no React subscriber.
   */
  discoveredVia?: "findElement";
}

/**
 * Live DOM context for one modifiable, captured at the moment a request is sent.
 * Source location is best-effort — only present in dev builds where React keeps `_debugSource`.
 */
export interface ModifiableContext {
  id: string;
  source?: SourceLocation;
  domSnippet?: string;
}

/**
 * A node in the page's spatial tree. Built at snapshot time from the live DOM —
 * children are in document order so "above/below" maps to "earlier/later" in the
 * children list.
 */
export interface SpatialNode {
  id: string;
  tag: string;
  type: "text" | "element" | "container";
  /** True for inserted-component instances (rather than registered Modifiables). */
  isInserted?: true;
  /** Up to ~40 characters of text content, for orientation. */
  textPreview?: string;
  /** Set when a registered Modifiable has no live DOM element at snapshot time. */
  unmounted?: true;
  children: SpatialNode[];
}

/**
 * Per-request context sent alongside `messages`/`system`/`tools`. The backend persists
 * this on the request log so the dashboard can show *where* a change happened — not just *what*.
 */
export interface PageContext {
  url?: string;
  route?: string;
  userAgent?: string;
  modifiables: ModifiableContext[];
  /** DOM-anchored tree of modifiables; mirrors what the LLM sees in the system prompt. */
  spatialTree?: SpatialNode[];
}

/**
 * Actions the LLM agent can dispatch. Each variant maps to a tool in TOOL_SCHEMA.
 *
 * - `applyStyle` — applies whitelisted CSS properties to a target element
 * - `setText` — replaces the text content of a target element
 * - `setVisibility` — shows or hides a target element
 * - `reorder` — reorders inserted components inside a container
 * - `insertComponent` — inserts a registered component into a container
 * - `undo` — replays the last N inverse actions from the history stack
 */
export type InjectionPosition = "before" | "after" | "inside-start" | "inside-end";

export interface HtmlInjection {
  injectionId: string;
  targetId: string;
  html: string;
  position: InjectionPosition;
}

export type LayoutMode = "list" | "grid" | "kanban" | "timeline";

export interface LayoutOverride {
  mode: LayoutMode;
  /** Optional column count for grid/kanban (default 3). Ignored by list/timeline. */
  columns?: number;
}

export type Action =
  | {
      type: "applyStyle";
      targetId: string;
      properties: CSSProperties;
      scope?: "element" | "descendants";
    }
  | { type: "setText"; targetId: string; text: string }
  | { type: "setVisibility"; targetId: string; visible: boolean }
  | { type: "reorder"; containerId: string; order: string[] }
  | {
      type: "insertComponent";
      containerId: string;
      componentName: string;
      props: Record<string, unknown>;
      position: number;
      instanceId: string;
    }
  | {
      type: "injectHTML";
      targetId: string;
      html: string;
      position: InjectionPosition;
      injectionId: string;
    }
  | { type: "applyTheme"; vars: Record<string, string> }
  | { type: "setLayout"; targetId: string; mode: LayoutMode; columns?: number }
  | {
      type: "setAttributes";
      targetId: string;
      /** Map of attribute names to values. Empty string clears the attribute. */
      attributes: Record<string, string>;
    }
  | { type: "removeComponent"; instanceId: string }
  | { type: "removeInjection"; targetId: string; injectionId: string }
  | { type: "undo"; steps?: number };

/** Inverse actions stored in the undo history. Each forward action computes its inverse before committing. */
export type InverseAction =
  | {
      type: "applyStyle";
      targetId: string;
      properties: CSSProperties;
      /** Defaults to "element" when reading legacy history written before scope was tracked. */
      scope?: "element" | "descendants";
    }
  | { type: "setText"; targetId: string; text: string }
  | { type: "setVisibility"; targetId: string; visible: boolean }
  | { type: "reorder"; containerId: string; order: string[] }
  /** Inverse of `insertComponent` — removes the just-inserted instance. */
  | { type: "restoreInserted"; containerId: string; instanceId: string }
  /** Inverse of `injectHTML` — removes the just-injected fragment. */
  | { type: "restoreInjection"; injectionId: string }
  /** Inverse of `removeComponent` — re-inserts the removed component at its original position. */
  | {
      type: "insertComponent";
      containerId: string;
      component: InsertedComponent;
    }
  /** Inverse of `removeInjection` — re-creates the removed injection with its original payload. */
  | { type: "injectHTML"; injection: HtmlInjection }
  | { type: "applyTheme"; vars: Record<string, string | null> }
  | { type: "setLayout"; targetId: string; previous: LayoutOverride | null }
  | {
      type: "setAttributes";
      targetId: string;
      /** Previous values for the touched keys (`null` = was unset, restored by deletion). */
      attributes: Record<string, string | null>;
    };

/** Full page state sent to the LLM as context. Built by `buildSnapshot()` before each request. */
export interface PageSnapshot {
  modifiables: Array<
    ModifiableEntry & {
      currentText?: string;
      currentStyle?: CSSProperties;
      currentDescendantStyle?: CSSProperties;
      currentAttributes?: Record<string, string>;
    }
  >;
  insertedComponents: Record<string, InsertedComponent[]>;
  /** Per-container child order. Ids may be native Modifiable ids or inserted instanceIds. */
  containerOrder: Record<string, string[]>;
  /** Active HTML/SVG injections, keyed by anchor targetId. Exposed so the LLM can reference an injectionId for `removeInjection`. */
  injections: Record<string, HtmlInjection[]>;
  /** Available components the agent may insert, with their prop schemas. */
  components: Array<{ name: string; props: Record<string, string> }>;
  /** Active CSS-variable overrides applied to <html>. Empty when the agent hasn't re-themed. */
  themeVars: Record<string, string>;
  /** Per-container layout-mode override. Containers without an entry render in their host's native layout. */
  layoutModes: Record<string, LayoutOverride>;
}

/**
 * Controls what the agent is allowed to do.
 *
 * - `allowedStyleProps` — CSS property names the agent may set via `applyStyle` (injection guard)
 * - `allowedAttributes` — HTML attribute names the agent may set via `setAttributes`. Supports
 *   `aria-*` and `data-*` prefix wildcards. `on*`, `style`, `id`, `class`, `srcdoc`, `sandbox`
 *   are always blocked regardless of the allowlist.
 * - `maxUndoDepth` — maximum number of undo steps retained (default 50)
 * - `persist` — where overrides survive page reloads: `"none"` (default), `"session"` (sessionStorage), `"user"` (localStorage)
 */
export interface PermissionsConfig {
  allowedStyleProps: string[];
  allowedAttributes: string[];
  maxUndoDepth: number;
  persist: "none" | "session" | "user";
}

/**
 * A component the agent can insert into container elements.
 *
 * `propsSchema` is passed to the LLM so it knows what props to provide.
 * Each key should map to a human-readable description of the prop (e.g. `"string — required banner text"`).
 */
export interface ComponentRegistryEntry {
  component: React.ComponentType<Record<string, unknown>>;
  propsSchema?: Record<string, string>;
}

/**
 * @internal
 *
 * Resolved connection parameters used by the streaming and persistence clients.
 * Not part of the public SDK surface — `endpoint` / `apiUrl` are populated from
 * environment variables for local development only (see `utils/devConfig.ts`).
 */
export interface AgentConnectionConfig {
  /** Publishable key issued by the Faraday dashboard. */
  publishableKey?: string;
  /** JWT identifying the end user. When null/undefined the backend applies an anonymous (stricter) rate limit. */
  userToken?: string | null;
  /** @internal Local-dev override: full URL of the streaming endpoint. */
  endpoint?: string;
  /** @internal Local-dev override: SaaS API base URL. */
  apiUrl?: string;
}

/**
 * Props for `UIAgentProvider`.
 *
 * ```tsx
 * <UIAgentProvider publishableKey="pk_live_..." userToken={jwt}>
 * ```
 */
export interface UIAgentProviderProps {
  /** Publishable key issued by the Faraday dashboard. Required. */
  publishableKey?: string;
  /** Per-user JWT minted by your backend. When null/undefined the backend applies an anonymous (stricter) rate limit. */
  userToken?: string | null;
  /**
   * Override for the SaaS API base. Use this when the host serves a same-origin
   * proxy in front of `api.faraday.ai` to avoid CORS preflight failures. Pass
   * the full streaming URL (e.g. `/api/faraday-proxy/v1/stream`) — the load /
   * save endpoints are derived from it.
   */
  apiUrl?: string;
  /** Additional components the agent can insert. Merged with DEFAULT_COMPONENTS. */
  components?: Record<string, ComponentRegistryEntry>;
  /** Override default permissions (allowed CSS props, undo depth, persistence). */
  permissions?: Partial<PermissionsConfig>;
  /** Called after every action the agent successfully applies. Useful for analytics or server-side persistence. */
  onAction?: (action: Action) => void;
  /**
   * Called when a `FaradayForm` is submitted by the user. Receives the form's
   * `formId` and the collected `FormData` values. Return a promise to block
   * submission UI until it resolves; throw to surface an inline error.
   */
  onFormSubmit?: (formId: string, values: Record<string, FormDataEntryValue>) => void | Promise<void>;
  children: React.ReactNode;
}

/** Resolved override state with visibility defaulting to `true`. Returned by `useModifiable`. */
export interface ModifiableOverride extends Override {
  visible: boolean;
  /** Always present on the resolved value (empty object when no overrides). */
  attributes: Record<string, string>;
}

/**
 * One block of an assistant or user message. Mirrors Anthropic's content-block
 * shapes — every message that goes back to the model is serialized from these.
 *
 * - `text` — visible chat output. Streamed deltas accumulate into a trailing text block.
 * - `tool_use` — assistant's request to run a tool. `id` is the Anthropic block id and
 *   pairs 1:1 with a later `tool_result.tool_use_id`.
 * - `tool_result` — synthetic user-role block fed back to the model after dispatching a
 *   tool client-side. `content` is a JSON-serialized payload (see `ToolResult.content`).
 */
export type ChatContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }
  | {
      type: "image";
      source: {
        type: "base64";
        media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
        data: string;
      };
    };

/** A message in the chat conversation between the user and the agent. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  /**
   * Canonical content for LLM history. Every message is serialized from this
   * field when building the next request body. The chat UI only reads `content`.
   */
  blocks: ChatContentBlock[];
  /**
   * Concatenation of every `text` block in `blocks`. Kept in sync by the store
   * helpers so the existing UI code that reads `content` keeps working.
   */
  content: string;
  /** True while the assistant is still streaming tokens for this message. */
  streaming?: boolean;
}

/**
 * Result of applying a single `Action` to the store. Failure carries a
 * human-readable `reason`; success may carry tool-specific structured data
 * (e.g. which CSS properties were dropped by the allowlist, which theme
 * variables were applied, how many undo steps actually fired).
 */
export type ApplyResult = { ok: true; data?: Record<string, unknown> } | { ok: false; reason: string };

/**
 * Outcome of dispatching a single tool_use client-side. Returned by
 * `dispatchToolUse` and used by the multi-turn streaming loop to build the
 * matching `tool_result` block for the next turn.
 *
 * `content` is the exact string the model will see — JSON-encoded payload like
 * `{"ok":true,"id":"fdy-find-..."}` or `{"ok":false,"reason":"..."}`. Keep it
 * under ~512 chars to bound conversation growth across iterations.
 *
 * `data` carries the same payload in structured form for tests and observability;
 * it is NOT sent to the server.
 */
export interface ToolResult {
  tool_use_id: string;
  ok: boolean;
  content: string;
  data?: Record<string, unknown>;
}
