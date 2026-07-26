import { describe, it, expect, beforeEach } from "vitest";
import { createAgentStore } from "../../provider/store";
import { dispatchToolUse } from "../../engine/apply";
import { findElement } from "../../engine/findElement";
import { __resetImperativeApplier } from "../../engine/imperativeApplier";

beforeEach(() => {
  document.body.innerHTML = "";
  __resetImperativeApplier();
});

/**
 * Helper that runs findElement, asserts success, and returns the synthetic id
 * for the test to act on. Failures here are protocol bugs in the test setup,
 * not the SUT — surface them loudly.
 */
function discover(store: ReturnType<typeof createAgentStore>, input: Parameters<typeof findElement>[1]): string {
  const r = findElement(store, input);
  if (!r.ok) throw new Error(`findElement failed in test setup: ${r.reason}`);
  return r.id;
}

describe("imperative applier — style writes reflect on the live DOM", () => {
  it("applyStyle on a discovered id sets el.style", () => {
    document.body.innerHTML = `<button>Sign up</button>`;
    const store = createAgentStore();
    const id = discover(store, { query: "sign up button", role: "button" });

    dispatchToolUse(store, {
      id: "tu",
      name: "applyStyle",
      input: { targetId: id, properties: { color: "red", fontSize: "20px" } },
    });

    const button = document.querySelector("button")! as HTMLElement;
    expect(button.style.color).toBe("red");
    expect(button.style.fontSize).toBe("20px");
  });

  it("undo restores the original style values", () => {
    document.body.innerHTML = `<button style="color: blue;">Sign up</button>`;
    const store = createAgentStore();
    const id = discover(store, { query: "sign up button", role: "button" });

    dispatchToolUse(store, {
      id: "tu1",
      name: "applyStyle",
      input: { targetId: id, properties: { color: "red" } },
    });
    const button = document.querySelector("button")! as HTMLElement;
    expect(button.style.color).toBe("red");

    dispatchToolUse(store, { id: "u", name: "undo", input: {} });
    expect(button.style.color).toBe("blue");
  });

  it("setText writes el.textContent and undo restores it", () => {
    document.body.innerHTML = `<h2>Original heading</h2>`;
    const store = createAgentStore();
    const id = discover(store, { query: "original heading", role: "h2" });

    dispatchToolUse(store, {
      id: "tu",
      name: "setText",
      input: { targetId: id, text: "Replaced" },
    });
    const h2 = document.querySelector("h2")!;
    expect(h2.textContent).toBe("Replaced");

    dispatchToolUse(store, { id: "u", name: "undo", input: {} });
    expect(h2.textContent).toBe("Original heading");
  });

  it("setAttributes writes attributes and undo removes them", () => {
    document.body.innerHTML = `<a>Sign up</a>`;
    const store = createAgentStore();
    const id = discover(store, { query: "sign up link", text: "Sign up" });

    dispatchToolUse(store, {
      id: "tu",
      name: "setAttributes",
      input: { targetId: id, attributes: { href: "/signup" } },
    });
    const a = document.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("/signup");

    dispatchToolUse(store, { id: "u", name: "undo", input: {} });
    expect(a.hasAttribute("href")).toBe(false);
  });

  it("injectHTML creates a wrapper span with the markup at the right position", () => {
    document.body.innerHTML = `<div><h2>Heading</h2></div>`;
    const store = createAgentStore();
    const id = discover(store, { query: "heading", role: "h2" });

    dispatchToolUse(store, {
      id: "tu",
      name: "injectHTML",
      input: {
        targetId: id,
        html: "<span class='badge'>NEW</span>",
        position: "after",
      },
    });

    const wrapper = document.querySelector("[data-faraday-injection]");
    expect(wrapper).toBeTruthy();
    // After means it's the next sibling of the heading.
    const h2 = document.querySelector("h2")!;
    expect(h2.nextElementSibling).toBe(wrapper);

    dispatchToolUse(store, { id: "u", name: "undo", input: {} });
    expect(document.querySelector("[data-faraday-injection]")).toBeNull();
  });
});

describe("imperative applier — engineer-rendered ids stay on the React path", () => {
  it("setText on a non-discovered registered id does NOT touch the live DOM imperatively", () => {
    document.body.innerHTML = `<h1 id="title">Original</h1>`;
    const store = createAgentStore();
    // Engineer-rendered: no discoveredVia flag.
    store.getState().register({
      id: "title",
      tag: "h1",
      type: "text",
      currentText: "Original",
    });

    dispatchToolUse(store, {
      id: "tu",
      name: "setText",
      input: { targetId: "title", text: "Updated" },
    });

    // Store records the override...
    expect(store.getState().overrides["title"]?.text).toBe("Updated");
    // ...but the DOM stays unchanged because there's no React subscriber here
    // and the imperative path skips engineer-rendered entries.
    const h1 = document.getElementById("title")!;
    expect(h1.textContent).toBe("Original");
  });
});
