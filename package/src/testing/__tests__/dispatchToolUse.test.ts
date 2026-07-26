import { describe, it, expect } from "vitest";
import { createAgentStore } from "../../provider/store";
import { dispatchToolUse } from "../../engine/apply";

function makeStore() {
  const store = createAgentStore();
  store.getState().register({
    id: "title",
    tag: "h1",
    type: "text",
    currentText: "Hello",
  });
  store.getState().register({ id: "btn", tag: "button", type: "element" });
  store.getState().register({ id: "sidebar", tag: "aside", type: "container" });
  return store;
}

function parse(content: string) {
  return JSON.parse(content) as Record<string, unknown>;
}

describe("dispatchToolUse — protocol surface", () => {
  it("returns the tool_use_id verbatim on success", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "tu-1",
      name: "setText",
      input: { targetId: "title", text: "World" },
    });
    expect(result.tool_use_id).toBe("tu-1");
    expect(result.ok).toBe(true);
    expect(parse(result.content)).toEqual({ ok: true });
  });

  it("returns the tool_use_id verbatim on failure with is_error semantics", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "tu-2",
      name: "setText",
      input: { targetId: "ghost", text: "x" },
    });
    expect(result.tool_use_id).toBe("tu-2");
    expect(result.ok).toBe(false);
    expect(parse(result.content)).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Unknown targetId"),
    });
  });

  it("rejects unknown tool names with a structured error", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "tu-3",
      name: "nope",
      input: {},
    });
    expect(result.ok).toBe(false);
    expect(parse(result.content)).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Unknown tool"),
    });
  });
});

describe("dispatchToolUse — applyStyle reports applied/dropped", () => {
  it("returns the applied keys on success", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "tu-4",
      name: "applyStyle",
      input: { targetId: "title", properties: { color: "red", fontSize: "20px" } },
    });
    expect(result.ok).toBe(true);
    expect(parse(result.content)).toEqual({
      ok: true,
      applied: ["color", "fontSize"],
    });
  });

  it("reports CSS properties dropped by the allowlist", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "tu-5",
      name: "applyStyle",
      input: {
        targetId: "title",
        properties: { color: "red", filter: "blur(10px)" },
      },
    });
    expect(result.ok).toBe(true);
    const data = parse(result.content);
    expect(data.applied).toEqual(["color"]);
    expect(data.dropped).toEqual(["filter"]);
  });
});

describe("dispatchToolUse — id-minting tools", () => {
  it("insertComponent returns the minted instanceId", () => {
    const store = createAgentStore(undefined, {
      MockBanner: { component: () => null, propsSchema: { text: "string" } },
    });
    store.getState().register({
      id: "sidebar",
      tag: "aside",
      type: "container",
    });
    const result = dispatchToolUse(store, {
      id: "tu-6",
      name: "insertComponent",
      input: {
        containerId: "sidebar",
        componentName: "MockBanner",
        props: { text: "hi" },
        position: 0,
      },
    });
    expect(result.ok).toBe(true);
    const data = parse(result.content);
    expect(data.ok).toBe(true);
    expect(typeof data.instanceId).toBe("string");
    expect((data.instanceId as string).length).toBeGreaterThan(0);
  });

  it("injectHTML returns the minted injectionId", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "tu-7",
      name: "injectHTML",
      input: {
        targetId: "btn",
        html: "<span>x</span>",
        position: "after",
      },
    });
    expect(result.ok).toBe(true);
    const data = parse(result.content);
    expect(typeof data.injectionId).toBe("string");
  });
});

describe("dispatchToolUse — undo reports step count", () => {
  it("returns undoneSteps=N when N actions are reversed", () => {
    const store = makeStore();
    dispatchToolUse(store, {
      id: "a",
      name: "setText",
      input: { targetId: "title", text: "A" },
    });
    dispatchToolUse(store, {
      id: "b",
      name: "setText",
      input: { targetId: "title", text: "B" },
    });
    const result = dispatchToolUse(store, {
      id: "u",
      name: "undo",
      input: { steps: 2 },
    });
    expect(result.ok).toBe(true);
    expect(parse(result.content)).toEqual({ ok: true, undoneSteps: 2 });
  });

  it("returns undoneSteps=0 when there's no history", () => {
    const store = makeStore();
    const result = dispatchToolUse(store, {
      id: "u",
      name: "undo",
      input: {},
    });
    expect(result.ok).toBe(true);
    expect(parse(result.content)).toEqual({ ok: true, undoneSteps: 0 });
  });
});
