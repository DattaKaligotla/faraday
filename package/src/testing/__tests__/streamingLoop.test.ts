import { describe, it, expect, afterEach, vi } from "vitest";
import { createAgentStore } from "../../provider/store";
import { streamAgentResponse } from "../../streaming/client";
import type { ChatContentBlock } from "../../types";

interface CapturedRequest {
  url: string;
  body: string;
}

interface MockTurn {
  events: Array<Record<string, unknown>>;
  status?: number;
}

/**
 * Stub `globalThis.fetch` with a queue of scripted turns. Each request consumes
 * one entry from `turns`. The test asserts on `requests` to verify what the
 * orchestrator sent.
 */
function installMockFetch(turns: MockTurn[]) {
  const requests: CapturedRequest[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    requests.push({ url, body: (init?.body as string) ?? "" });

    const turn = turns.shift();
    if (!turn) {
      return new Response("", { status: 200 });
    }
    if (turn.status && turn.status >= 400) {
      return new Response("err", { status: turn.status });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for (const event of turn.events) {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }) as typeof globalThis.fetch;

  return {
    requests,
    restore() {
      globalThis.fetch = original;
    },
  };
}

let mockFetch: ReturnType<typeof installMockFetch> | null = null;

afterEach(() => {
  mockFetch?.restore();
  mockFetch = null;
});

function makeStore() {
  const store = createAgentStore();
  store.getState().register({
    id: "title",
    tag: "h1",
    type: "text",
    currentText: "Hello",
  });
  return store;
}

describe("streamAgentResponse — multi-turn tool loop", () => {
  it("dispatches tool_uses and POSTs again with paired tool_result blocks", async () => {
    mockFetch = installMockFetch([
      {
        events: [
          { type: "text_delta", delta: "Working on it…" },
          {
            type: "tool_use",
            id: "tu-1",
            name: "setText",
            input: { targetId: "title", text: "Greetings" },
          },
          { type: "done" },
        ],
      },
      {
        events: [{ type: "text_delta", delta: " Done." }, { type: "done" }],
      },
    ]);

    const store = makeStore();
    await streamAgentResponse({
      connection: { endpoint: "http://test/agent" },
      store,
      userMessage: "make it Greetings",
    });

    // Two POSTs.
    expect(mockFetch!.requests.length).toBe(2);

    // Second POST must include the assistant turn-1 message (with tool_use)
    // and a follow-up user message containing the matching tool_result.
    const secondBody = JSON.parse(mockFetch!.requests[1].body) as {
      messages: Array<{
        role: string;
        content: ChatContentBlock[] | string;
      }>;
    };
    const lastTwo = secondBody.messages.slice(-2);
    expect(lastTwo[0].role).toBe("assistant");
    const assistantBlocks = lastTwo[0].content as ChatContentBlock[];
    const tu = assistantBlocks.find((b) => b.type === "tool_use");
    expect(tu).toMatchObject({
      type: "tool_use",
      id: "tu-1",
      name: "setText",
    });

    expect(lastTwo[1].role).toBe("user");
    const userBlocks = lastTwo[1].content as ChatContentBlock[];
    expect(userBlocks).toHaveLength(1);
    const tr = userBlocks[0];
    expect(tr.type).toBe("tool_result");
    if (tr.type === "tool_result") {
      expect(tr.tool_use_id).toBe("tu-1");
      const parsed = JSON.parse(tr.content);
      expect(parsed).toEqual({ ok: true });
    }

    // The store actually applied the tool.
    expect(store.getState().overrides["title"]?.text).toBe("Greetings");
  });

  it("ends the loop when the final turn emits no tool_use", async () => {
    mockFetch = installMockFetch([
      {
        events: [{ type: "text_delta", delta: "Nothing to do." }, { type: "done" }],
      },
    ]);
    const store = makeStore();
    await streamAgentResponse({
      connection: { endpoint: "http://test/agent" },
      store,
      userMessage: "noop",
    });
    expect(mockFetch!.requests.length).toBe(1);
  });

  it("propagates is_error on the tool_result block when dispatch fails", async () => {
    mockFetch = installMockFetch([
      {
        events: [
          {
            type: "tool_use",
            id: "tu-bad",
            name: "setText",
            input: { targetId: "ghost", text: "x" },
          },
          { type: "done" },
        ],
      },
      { events: [{ type: "text_delta", delta: "ok" }, { type: "done" }] },
    ]);
    const store = makeStore();
    await streamAgentResponse({
      connection: { endpoint: "http://test/agent" },
      store,
      userMessage: "try the impossible",
    });

    const secondBody = JSON.parse(mockFetch!.requests[1].body) as {
      messages: Array<{ role: string; content: ChatContentBlock[] }>;
    };
    const userBlocks = secondBody.messages[secondBody.messages.length - 1].content as ChatContentBlock[];
    const tr = userBlocks[0];
    if (tr.type === "tool_result") {
      expect(tr.is_error).toBe(true);
      expect(JSON.parse(tr.content).reason).toMatch(/Unknown targetId/);
    }
  });

  it("hard-caps the loop at MAX_TOOL_ITERATIONS", async () => {
    // Always emit a tool_use → forces the loop to keep going. The cap should
    // bound this at 8 POSTs even though the script never stops asking.
    const turns: MockTurn[] = [];
    for (let i = 0; i < 20; i++) {
      turns.push({
        events: [
          {
            type: "tool_use",
            id: `tu-${i}`,
            name: "setText",
            input: { targetId: "title", text: `v${i}` },
          },
          { type: "done" },
        ],
      });
    }
    mockFetch = installMockFetch(turns);

    const store = makeStore();
    await streamAgentResponse({
      connection: { endpoint: "http://test/agent" },
      store,
      userMessage: "spam",
    });

    expect(mockFetch!.requests.length).toBe(8);
  });
});
