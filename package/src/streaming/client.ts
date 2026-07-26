import type { AgentStore } from "../provider/store";
import type { AgentConnectionConfig, ChatContentBlock, ChatMessage, ToolResult } from "../types";
import { buildPageContext, buildSystemPrompt, TOOL_SCHEMA } from "../engine/snapshot";
import { dispatchToolUse } from "../engine/apply";
import { captureViewport, type ScreenshotResult } from "../engine/vision";
import { nanoid } from "../utils/nanoid";

/**
 * Server → client streamed event. The client never originates these — it only
 * parses them off the response body and either updates the store (`text_delta`)
 * or queues the tool call for dispatch (`tool_use`).
 *
 * `tool_use.id` is the Anthropic block id and round-trips back as the matching
 * `tool_result.tool_use_id` in the next turn's request body.
 */
export interface StreamEvent {
  type: string;
  delta?: string;
  /** Anthropic block id on `tool_use` events. */
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  message?: string;
}

const FARADAY_API_URL = "https://api.faraday.ai/v1/stream";

/**
 * Cap on the number of multi-turn iterations a single user request can drive.
 * Each iteration is one Anthropic round-trip; without a cap a buggy LLM could
 * loop indefinitely on tool errors.
 */
const MAX_TOOL_ITERATIONS = 8;

function resolveRequest(connection: AgentConnectionConfig): {
  url: string;
  headers: Record<string, string>;
} {
  if (connection.publishableKey) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Faraday-Key": connection.publishableKey,
    };
    if (connection.userToken) {
      headers.Authorization = `Bearer ${connection.userToken}`;
    }
    return {
      url: connection.apiUrl ?? FARADAY_API_URL,
      headers,
    };
  }
  return {
    url: connection.endpoint!,
    headers: { "Content-Type": "application/json" },
  };
}

export interface StreamOptions {
  connection: AgentConnectionConfig;
  store: AgentStore;
  userMessage: string;
  signal?: AbortSignal;
}

interface TurnOutcome {
  /** Tool calls the assistant requested this turn. Empty = the loop should stop. */
  toolUses: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  /** True when the server emitted an `error` event during this turn. */
  errored: boolean;
  /**
   * `performance.now()` stamp when the first `text_delta` arrived this turn,
   * or `null` if the turn produced no text (pure tool_use, or errored out).
   * The orchestrator uses the *first non-null* across the loop as the
   * session-level time-to-first-token.
   */
  firstTokenAt: number | null;
}

/**
 * Project a `ChatMessage` to the Anthropic content-block shape the API expects.
 * Pure-text messages are normalized to a single text block; messages whose
 * `blocks` already include `tool_use` / `tool_result` shapes pass through.
 */
function messageToAnthropic(message: ChatMessage): {
  role: "user" | "assistant";
  content: ChatContentBlock[];
} {
  // Defensive: if a caller pushed a message without `blocks` we synthesize one
  // here. The store helpers normally do this for us.
  if (!message.blocks || message.blocks.length === 0) {
    return {
      role: message.role,
      content: message.content ? [{ type: "text", text: message.content }] : [],
    };
  }
  return { role: message.role, content: message.blocks };
}

/**
 * Process a single streamed turn: read NDJSON events, accumulate text deltas
 * into the assistant's message in the store, collect tool_use blocks for the
 * caller to dispatch.
 *
 * Tool dispatch is intentionally NOT done here — the orchestrator does it after
 * the turn ends so it can stitch the resulting `tool_result` blocks into the
 * next turn's request body.
 */
export async function processStreamEvents(store: AgentStore, events: AsyncIterable<StreamEvent>): Promise<TurnOutcome> {
  const toolUses: TurnOutcome["toolUses"] = [];
  let errored = false;
  let firstTokenAt: number | null = null;

  for await (const event of events) {
    if (event.type === "text_delta" && event.delta) {
      if (firstTokenAt === null) firstTokenAt = performance.now();
      store.getState().appendToLastMessage(event.delta);
    } else if (event.type === "tool_use" && event.name && event.input && event.id) {
      toolUses.push({ id: event.id, name: event.name, input: event.input });
      store.getState().appendBlocksToLastMessage([
        {
          type: "tool_use",
          id: event.id,
          name: event.name,
          input: event.input,
        },
      ]);
    } else if (event.type === "error" && event.message) {
      store.getState().appendToLastMessage(`\n\n[Error: ${event.message}]`);
      errored = true;
    }
  }
  return { toolUses, errored, firstTokenAt };
}

async function* parseResponseStream(response: Response): AsyncIterable<StreamEvent> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // The last element after split may be an incomplete line — keep it in the
      // buffer so it gets completed by the next chunk.
      buffer = lines.pop() ?? "";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith(":")) continue;

        // Support both raw NDJSON and SSE (`data: {...}`) formats.
        const jsonStr = line.startsWith("data:") ? line.slice(5).trim() : line;
        // "[DONE]" is the OpenAI SSE end-of-stream sentinel — not valid JSON, skip it.
        if (!jsonStr || jsonStr === "[DONE]") continue;

        let event: StreamEvent;
        try {
          event = JSON.parse(jsonStr) as StreamEvent;
        } catch {
          continue;
        }

        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Dispatch every tool_use the assistant emitted this turn and pack the results
 * into a synthetic user message containing only `tool_result` blocks. Returns
 * `null` when the assistant emitted no tool_uses, signaling the loop should end.
 *
 * Order is preserved 1:1 with the assistant's tool_use blocks — Anthropic
 * rejects responses where ids don't pair, so we never reorder or drop entries.
 */
function buildToolResultMessage(
  store: AgentStore,
  toolUses: TurnOutcome["toolUses"],
  /**
   * Optional after-screenshot taken once the tool calls have rendered. When
   * present, gets appended as an image block (with a verification text block)
   * so the model's next turn sees the actual visual result and can either
   * confirm or correct with another tool call.
   */
  afterShot?: ScreenshotResult | null,
): ChatMessage | null {
  if (toolUses.length === 0) return null;
  const blocks: ChatContentBlock[] = toolUses.map((t) => {
    const result: ToolResult = dispatchToolUse(store, t);
    return {
      type: "tool_result",
      tool_use_id: result.tool_use_id,
      content: result.content,
      ...(result.ok ? {} : { is_error: true }),
    };
  });
  if (afterShot) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: afterShot.mediaType,
        data: afterShot.base64,
      },
    });
    blocks.push({
      type: "text",
      text: "Above is a screenshot of the page after your edits. Verify the result visually — if it doesn't match the user's request (wrong size, wrong color, overlapping elements, missing data), fix it now with one or more additional tool calls. Otherwise reply with one short sentence summarizing what changed.",
    });
  }
  return {
    id: nanoid(),
    role: "user",
    blocks,
    content: "", // tool_result blocks have no displayable text
  };
}

interface RunTurnArgs {
  store: AgentStore;
  url: string;
  headers: Record<string, string>;
  body: () => string;
  signal: AbortSignal | undefined;
}

async function runOneTurn(args: RunTurnArgs): Promise<TurnOutcome> {
  const { url, headers, body, signal, store } = args;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: body(),
      ...(signal !== undefined && { signal }),
    });
  } catch (err) {
    store.getState().appendToLastMessage(`\n\n[Connection error: ${String(err)}]`);
    return { toolUses: [], errored: true, firstTokenAt: null };
  }

  if (!response.ok) {
    store.getState().appendToLastMessage(`\n\n[Server error: ${response.status}]`);
    return { toolUses: [], errored: true, firstTokenAt: null };
  }

  return processStreamEvents(store, parseResponseStream(response));
}

/**
 * One-shot inline-edit request that doesn't append to `store.messages`. Used by
 * the floating input bar and the inline-edit popover.
 *
 * Internally drives the same multi-turn loop as `streamAgentResponse` but
 * maintains its own message list — assistant text and tool_use blocks are
 * accumulated here, NOT in the store, so the chat panel doesn't show them.
 */
export async function streamInlineEdit(options: {
  connection: AgentConnectionConfig;
  store: AgentStore;
  targetId?: string;
  userMessage: string;
  signal?: AbortSignal;
}): Promise<{ applied: boolean; assistantText: string }> {
  const { connection, store, targetId, userMessage, signal } = options;

  store.getState().observeUserMessage(userMessage);

  const focusedMessage = targetId
    ? `Change the element with id="${targetId}" only. ` +
      `User says: "${userMessage}". ` +
      `Apply the change with one or more tool calls targeting this element. Reply briefly.`
    : userMessage;

  const messages: ChatMessage[] = [
    {
      id: nanoid(),
      role: "user",
      blocks: [{ type: "text", text: focusedMessage }],
      content: focusedMessage,
    },
    {
      id: nanoid(),
      role: "assistant",
      blocks: [],
      content: "",
      streaming: true,
    },
  ];

  const { url, headers } = resolveRequest(connection);
  let appliedAny = false;

  const tempStore = makeMessageOnlyShim(store, messages);

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const outcome = await runOneTurn({
      store: tempStore,
      url,
      headers,
      signal,
      body: () =>
        JSON.stringify({
          system: buildSystemPrompt(store),
          tools: TOOL_SCHEMA,
          messages: messages.map(messageToAnthropic),
          pageContext: buildPageContext(store),
        }),
    });
    if (outcome.errored) {
      throw new Error(getLastInlineErrorText(messages));
    }
    const toolResultMessage = buildToolResultMessage(store, outcome.toolUses);
    if (!toolResultMessage) break;
    appliedAny = true;
    // Tag the streaming assistant message as done; start a fresh one for the
    // next turn.
    messages[messages.length - 1] = {
      ...messages[messages.length - 1],
      streaming: false,
    };
    messages.push(toolResultMessage);
    messages.push({
      id: nanoid(),
      role: "assistant",
      blocks: [],
      content: "",
      streaming: true,
    });
  }

  // Concatenate text from every assistant message produced across the loop.
  const assistantText = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n")
    .trim();

  return { applied: appliedAny, assistantText };
}

/**
 * Build a thin store wrapper that points the message-mutation helpers at a
 * caller-owned `messages` array instead of `store.messages`. Lets
 * `streamInlineEdit` reuse the same orchestration code as `streamAgentResponse`
 * without polluting the visible chat.
 */
function makeMessageOnlyShim(store: AgentStore, messages: ChatMessage[]): AgentStore {
  return {
    ...store,
    getState: () => {
      const real = store.getState();
      return {
        ...real,
        appendToLastMessage(delta: string) {
          const last = messages[messages.length - 1];
          if (!last) return;
          const blocks = [...last.blocks];
          const tail = blocks[blocks.length - 1];
          if (tail && tail.type === "text") {
            blocks[blocks.length - 1] = {
              type: "text",
              text: tail.text + delta,
            };
          } else {
            blocks.push({ type: "text", text: delta });
          }
          messages[messages.length - 1] = {
            ...last,
            blocks,
            content: blocks
              .filter((b) => b.type === "text")
              .map((b) => (b as { text: string }).text)
              .join(""),
          };
        },
        appendBlocksToLastMessage(extra: ChatContentBlock[]) {
          const last = messages[messages.length - 1];
          if (!last) return;
          const blocks = [...last.blocks, ...extra];
          messages[messages.length - 1] = {
            ...last,
            blocks,
            content: blocks
              .filter((b) => b.type === "text")
              .map((b) => (b as { text: string }).text)
              .join(""),
          };
        },
        setLastMessageStreaming(streaming: boolean) {
          const last = messages[messages.length - 1];
          if (!last) return;
          messages[messages.length - 1] = { ...last, streaming };
        },
      };
    },
  } as AgentStore;
}

function getLastInlineErrorText(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1];
  return last?.content || "stream error";
}

export interface StreamTiming {
  /**
   * Wall time (ms) from the POST going out to the loop finishing. Sum these
   * across turns at the caller to get total session latency for analytics.
   */
  streamMs: number;
  /**
   * Time-to-first-token, measured from the same POST start. `null` when no
   * text_delta arrived (pure tool_use turn or upstream error). The caller
   * keeps the first non-null across a session as the session TTFT.
   */
  firstTokenMs: number | null;
}

/**
 * Multi-turn streaming entry point. Appends the user's prompt to the chat,
 * starts a streaming assistant message, then loops:
 *   1. POST → server runs one Anthropic turn, streams text + tool_uses back.
 *   2. Dispatch each tool_use locally; pack the results into a `tool_result`
 *      user message appended to the conversation.
 *   3. If the assistant emitted any tool_uses this turn, POST again with the
 *      augmented message history. Otherwise stop.
 *
 * The loop is capped at `MAX_TOOL_ITERATIONS` so a buggy LLM can't burn
 * unbounded tokens. The chat UI keeps streaming throughout — only the final
 * assistant message clears its `streaming` flag.
 *
 * Returns timing for the entire send so the surrounding UI (ChatPanel) can
 * accumulate per-session latency and ship it with the save payload.
 */
export async function streamAgentResponse(options: StreamOptions): Promise<StreamTiming> {
  const { connection, store, userMessage, signal } = options;
  const state = store.getState();
  const startedAt = performance.now();
  let firstTokenAt: number | null = null;

  // Capture the page BEFORE the user's request so the model sees the same
  // pixels the user sees. Best-effort — capture failures don't block the
  // request, the model still has the DOM snapshot to reason from.
  const beforeShot = await captureViewport();

  const userBlocks: ChatContentBlock[] = beforeShot
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: beforeShot.mediaType,
            data: beforeShot.base64,
          },
        },
        { type: "text", text: userMessage },
      ]
    : [{ type: "text", text: userMessage }];

  state.appendMessage({
    id: nanoid(),
    role: "user",
    blocks: userBlocks,
    content: userMessage,
  });
  state.observeUserMessage(userMessage);

  state.appendMessage({
    id: nanoid(),
    role: "assistant",
    blocks: [],
    content: "",
    streaming: true,
  });

  const { url, headers } = resolveRequest(connection);

  // Track whether we've already attached the after-screenshot in this request.
  // We only verify ONCE per user request — extra verification rounds would
  // multiply latency + token cost without much gain.
  let verified = false;

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const outcome = await runOneTurn({
        store,
        url,
        headers,
        signal,
        body: () =>
          JSON.stringify({
            system: buildSystemPrompt(store),
            tools: TOOL_SCHEMA,
            // Send every assistant + user message except the still-streaming
            // tail (which has no content yet). The server forwards verbatim to
            // Bedrock, which accepts content-block format directly.
            messages: store
              .getState()
              .messages.filter((m) => !m.streaming)
              .map(messageToAnthropic),
            pageContext: buildPageContext(store),
          }),
      });
      if (firstTokenAt === null && outcome.firstTokenAt !== null) {
        firstTokenAt = outcome.firstTokenAt;
      }
      if (outcome.errored) break;

      // Wait one paint frame so the agent's DOM mutations have settled, then
      // capture the after-screenshot for the verification turn. Skip after
      // the first verification — additional rounds would just stack cost.
      let afterShot: ScreenshotResult | null = null;
      if (outcome.toolUses.length > 0 && !verified) {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        afterShot = await captureViewport();
        verified = !!afterShot;
      }

      const toolResultMessage = buildToolResultMessage(store, outcome.toolUses, afterShot);
      if (!toolResultMessage) break;

      // Tool ran — close the current assistant message, append the user-role
      // tool_result message, and start a fresh streaming assistant message for
      // the next turn.
      store.getState().setLastMessageStreaming(false);
      store.getState().appendMessage(toolResultMessage);
      store.getState().appendMessage({
        id: nanoid(),
        role: "assistant",
        blocks: [],
        content: "",
        streaming: true,
      });
    }
  } finally {
    store.getState().setLastMessageStreaming(false);
  }

  return {
    streamMs: performance.now() - startedAt,
    firstTokenMs: firstTokenAt === null ? null : firstTokenAt - startedAt,
  };
}
