import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createAgentStore } from "../../provider/store";
import { streamAgentResponse } from "../../streaming/client";
import { __resetImperativeApplier } from "../../engine/imperativeApplier";
import type { ChatContentBlock } from "../../types";

interface MockTurn {
  events: Array<Record<string, unknown>>;
}

function installMockFetch(turnsBuilder: (info: { turn: number }) => MockTurn) {
  const requests: { body: string }[] = [];
  let turn = 0;
  const original = globalThis.fetch;
  globalThis.fetch = vi.fn(async (_input, init?: RequestInit) => {
    requests.push({ body: (init?.body as string) ?? "" });
    const next = turnsBuilder({ turn: turn++ });
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        for (const e of next.events) {
          controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        }
        controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  }) as typeof globalThis.fetch;
  return {
    requests,
    restore() {
      globalThis.fetch = original;
    },
  };
}

let mock: ReturnType<typeof installMockFetch> | null = null;

beforeEach(() => {
  document.body.innerHTML = "";
  __resetImperativeApplier();
});

afterEach(() => {
  mock?.restore();
  mock = null;
});

describe("findElement → applyStyle multi-turn integration", () => {
  it("applies the agent-chosen style to the discovered DOM element", async () => {
    document.body.innerHTML = `<button>Sign up</button>`;

    let resolvedId: string | null = null;
    mock = installMockFetch(({ turn }) => {
      if (turn === 0) {
        return {
          events: [
            {
              type: "tool_use",
              id: "tu-find",
              name: "findElement",
              input: { query: "sign up button", role: "button" },
            },
            { type: "done" },
          ],
        };
      }
      if (turn === 1) {
        // Read the resolved id from the request body's tool_result block. The
        // agent would parse this from the `content` JSON; we mirror that here
        // and emit applyStyle targeting the same id.
        const body = JSON.parse(mock!.requests[1].body) as {
          messages: Array<{
            role: string;
            content: ChatContentBlock[];
          }>;
        };
        const userMsg = body.messages[body.messages.length - 1];
        const toolResult = userMsg.content.find((b) => b.type === "tool_result");
        if (toolResult && toolResult.type === "tool_result") {
          const data = JSON.parse(toolResult.content) as {
            ok: boolean;
            id?: string;
          };
          if (data.ok && data.id) resolvedId = data.id;
        }
        return {
          events: [
            {
              type: "tool_use",
              id: "tu-style",
              name: "applyStyle",
              input: {
                targetId: resolvedId ?? "missing",
                properties: { color: "red" },
              },
            },
            { type: "text_delta", delta: "Done." },
            { type: "done" },
          ],
        };
      }
      return { events: [{ type: "done" }] };
    });

    const store = createAgentStore();
    await streamAgentResponse({
      connection: { endpoint: "http://test/agent" },
      store,
      userMessage: "make the sign up button red",
    });

    expect(mock!.requests.length).toBeGreaterThanOrEqual(2);
    expect(resolvedId).toMatch(/^fdy-find-/);
    const button = document.querySelector("button")! as HTMLElement;
    expect(button.style.color).toBe("red");
  });

  it("surfaces a no-match findElement result and lets the assistant ask for clarification", async () => {
    document.body.innerHTML = `<p>Nothing useful here</p>`;

    mock = installMockFetch(({ turn }) => {
      if (turn === 0) {
        return {
          events: [
            {
              type: "tool_use",
              id: "tu-find",
              name: "findElement",
              input: { query: "totally absent dragon" },
            },
            { type: "done" },
          ],
        };
      }
      return {
        events: [{ type: "text_delta", delta: "I couldn't find that." }, { type: "done" }],
      };
    });

    const store = createAgentStore();
    await streamAgentResponse({
      connection: { endpoint: "http://test/agent" },
      store,
      userMessage: "change the dragon icon",
    });

    expect(mock!.requests.length).toBe(2);
    // The tool_result block on turn 2 must report the failure with is_error.
    const body = JSON.parse(mock!.requests[1].body) as {
      messages: Array<{ role: string; content: ChatContentBlock[] }>;
    };
    const toolResultMsg = body.messages[body.messages.length - 1];
    const tr = toolResultMsg.content.find((b) => b.type === "tool_result");
    if (tr && tr.type === "tool_result") {
      expect(tr.is_error).toBe(true);
      const data = JSON.parse(tr.content);
      expect(data.ok).toBe(false);
      expect(data.reason).toMatch(/no confident match/);
    }
  });
});
