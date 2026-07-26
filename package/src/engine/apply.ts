import { nanoid } from "../utils/nanoid";
import type { AgentStore } from "../provider/store";
import type { Action, ApplyResult, ToolResult } from "../types";
import { findElement } from "./findElement";

interface RawToolUse {
  /** Anthropic block id; round-trips back as the matching `tool_result.tool_use_id`. */
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * JSON-encode a result payload destined for an LLM tool_result block. Stay short:
 * every result lands in subsequent turns' prompts, so a 200-line dump is wasted
 * tokens. Drop nullish/empty fields so `{"ok":true}` stays compact for the common
 * case.
 */
function encodeContent(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}

function ok(toolUseId: string, data?: Record<string, unknown>): ToolResult {
  const payload = data ? { ok: true, ...data } : { ok: true };
  return {
    tool_use_id: toolUseId,
    ok: true,
    content: encodeContent(payload),
    ...(data && { data: payload }),
  };
}

function fail(toolUseId: string, reason: string): ToolResult {
  const payload = { ok: false, reason };
  return {
    tool_use_id: toolUseId,
    ok: false,
    content: encodeContent(payload),
    data: payload,
  };
}

function applyResultToTool(toolUseId: string, result: ApplyResult, extraData?: Record<string, unknown>): ToolResult {
  if (!result.ok) return fail(toolUseId, result.reason);
  const merged = { ...(result.data ?? {}), ...(extraData ?? {}) };
  return ok(toolUseId, Object.keys(merged).length > 0 ? merged : undefined);
}

/**
 * Translate a raw LLM tool call into a typed `Action`, dispatch it to the store,
 * and return a structured `ToolResult` that the streaming loop sends back to the
 * LLM as a `tool_result` block.
 *
 * Every tool produces a `ToolResult` — there is no fire-and-forget path. Errors
 * (`ok: false`) are flagged with `is_error` on the wire so the model treats them
 * as recoverable; the LLM sees enough detail (`applied`, `dropped`, minted ids,
 * undo step count) to adapt without retrying blindly.
 */
export function dispatchToolUse(store: AgentStore, tool: RawToolUse): ToolResult {
  let action: Action;

  switch (tool.name) {
    case "applyStyle":
      action = {
        type: "applyStyle",
        targetId: tool.input.targetId as string,
        properties: tool.input.properties as Record<string, string>,
        scope: (tool.input.scope as "element" | "descendants") ?? "element",
      };
      break;
    case "setText":
      action = {
        type: "setText",
        targetId: tool.input.targetId as string,
        text: tool.input.text as string,
      };
      break;
    case "setVisibility":
      action = {
        type: "setVisibility",
        targetId: tool.input.targetId as string,
        visible: tool.input.visible as boolean,
      };
      break;
    case "reorder":
      action = {
        type: "reorder",
        containerId: tool.input.containerId as string,
        order: tool.input.order as string[],
      };
      break;
    case "insertComponent": {
      const instanceId = nanoid();
      action = {
        type: "insertComponent",
        containerId: tool.input.containerId as string,
        componentName: tool.input.componentName as string,
        props: (tool.input.props as Record<string, unknown>) ?? {},
        position: (tool.input.position as number) ?? 0,
        instanceId,
      };
      const result = store.getState().apply(action);
      return applyResultToTool(tool.id, result);
    }
    case "injectHTML": {
      const rawPos = (tool.input.position as string) ?? "after";
      // The model frequently emits DOM `insertAdjacentHTML` synonyms
      // (`beforebegin`, `afterend`, etc.) instead of our enum. Alias them
      // rather than silently fall back to "after" — that's what was sending
      // "above" requests below the target.
      const POSITION_ALIASES: Record<string, "before" | "after" | "inside-start" | "inside-end"> = {
        before: "before",
        after: "after",
        "inside-start": "inside-start",
        "inside-end": "inside-end",
        beforebegin: "before",
        afterend: "after",
        afterbegin: "inside-start",
        beforeend: "inside-end",
        above: "before",
        below: "after",
        prepend: "inside-start",
        append: "inside-end",
      };
      const position = POSITION_ALIASES[rawPos] ?? "after";
      const injectionId = nanoid();
      action = {
        type: "injectHTML",
        targetId: tool.input.targetId as string,
        html: tool.input.html as string,
        position,
        injectionId,
      };
      const result = store.getState().apply(action);
      return applyResultToTool(tool.id, result);
    }
    case "applyTheme":
      action = {
        type: "applyTheme",
        vars: (tool.input.vars as Record<string, string>) ?? {},
      };
      break;
    case "setLayout": {
      const mode = tool.input.mode as string;
      const allowed = ["list", "grid", "kanban", "timeline"] as const;
      if (!allowed.includes(mode as (typeof allowed)[number])) {
        return fail(tool.id, `setLayout: invalid mode '${mode}'`);
      }
      action = {
        type: "setLayout",
        targetId: tool.input.targetId as string,
        mode: mode as (typeof allowed)[number],
        ...(typeof tool.input.columns === "number" && {
          columns: tool.input.columns as number,
        }),
      };
      break;
    }
    case "setAttributes":
      action = {
        type: "setAttributes",
        targetId: tool.input.targetId as string,
        attributes: (tool.input.attributes as Record<string, string>) ?? {},
      };
      break;
    case "removeComponent":
      action = {
        type: "removeComponent",
        instanceId: tool.input.instanceId as string,
      };
      break;
    case "removeInjection":
      action = {
        type: "removeInjection",
        targetId: tool.input.targetId as string,
        injectionId: tool.input.injectionId as string,
      };
      break;
    case "undo":
      action = { type: "undo", steps: (tool.input.steps as number) ?? 1 };
      break;
    case "findElement": {
      // Special: findElement doesn't dispatch a typed `Action` — it resolves a
      // DOM element synchronously, registers a synthetic id, and returns that
      // id directly to the LLM via the tool_result block. No inverse, no undo.
      const result = findElement(store, {
        query: tool.input.query as string,
        ...(typeof tool.input.role === "string" && {
          role: tool.input.role as string,
        }),
        ...(typeof tool.input.text === "string" && {
          text: tool.input.text as string,
        }),
        ...(typeof tool.input.near === "string" && {
          near: tool.input.near as string,
        }),
      });
      if (!result.ok) return fail(tool.id, result.reason);
      return ok(tool.id, { id: result.id });
    }
    default:
      return fail(tool.id, `Unknown tool: ${tool.name}`);
  }

  const result = store.getState().apply(action);
  return applyResultToTool(tool.id, result);
}
