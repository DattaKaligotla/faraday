import { describe, it, expect, beforeEach } from "vitest";
import { createAgentStore } from "../../provider/store";
import { findElement } from "../../engine/findElement";
import { __resetImperativeApplier } from "../../engine/imperativeApplier";

beforeEach(() => {
  document.body.innerHTML = "";
  __resetImperativeApplier();
});

describe("findElement — basic resolution", () => {
  it("resolves a button by query + role and stamps the element id", () => {
    document.body.innerHTML = `
      <main>
        <h1>Welcome</h1>
        <button>Sign up</button>
      </main>
    `;

    const store = createAgentStore();
    const result = findElement(store, {
      query: "sign up button",
      role: "button",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toMatch(/^fdy-find-/);
      expect(result.resolvedVia).toBe("id");
      const button = document.querySelector("button")!;
      expect(button.id).toBe(result.id);
      const entry = store.getState().registry[result.id];
      expect(entry?.discoveredVia).toBe("findElement");
      expect(entry?.tag).toBe("button");
    }
  });

  it("preserves a host-set id by using data-faraday-find instead", () => {
    document.body.innerHTML = `
      <main>
        <button id="host-existing-id">Sign up</button>
      </main>
    `;

    const store = createAgentStore();
    const result = findElement(store, {
      query: "sign up button",
      role: "button",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.resolvedVia).toBe("data-attr");
      const button = document.querySelector("button")!;
      // Original host id is untouched.
      expect(button.id).toBe("host-existing-id");
      // Synthetic id is on the data-attribute fallback.
      expect(button.getAttribute("data-faraday-find")).toBe(result.id);
    }
  });

  it("returns ok:false when nothing scores above threshold", () => {
    document.body.innerHTML = `<main><p>Welcome</p></main>`;
    const store = createAgentStore();
    const result = findElement(store, { query: "totally absent dragon icon" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/no confident match/);
    }
    // Registry must be untouched on failure.
    const found = Object.values(store.getState().registry).filter((e) => e.discoveredVia === "findElement");
    expect(found).toHaveLength(0);
  });

  it("rejects empty queries explicitly", () => {
    const store = createAgentStore();
    const result = findElement(store, { query: "   " });
    expect(result.ok).toBe(false);
  });
});

describe("findElement — `near` scoping", () => {
  it("prefers a candidate inside the near subtree over an identical candidate elsewhere", () => {
    document.body.innerHTML = `
      <section id="left">
        <button>Save</button>
      </section>
      <section id="right">
        <button>Save</button>
      </section>
    `;
    // Register both sections so findElement's `near` lookup succeeds.
    const store = createAgentStore();
    store.getState().register({ id: "right", tag: "section", type: "container" });

    const result = findElement(store, {
      query: "save button",
      role: "button",
      near: "right",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const inRight = document.querySelector("#right button")!;
      expect(inRight.id).toBe(result.id);
      const inLeft = document.querySelector("#left button")!;
      expect(inLeft.id).toBe("");
    }
  });

  it("falls back to body scope when near's subtree has no match", () => {
    document.body.innerHTML = `
      <section id="empty"></section>
      <section><button>Sign up</button></section>
    `;
    const store = createAgentStore();
    store.getState().register({ id: "empty", tag: "section", type: "container" });

    const result = findElement(store, {
      query: "sign up button",
      role: "button",
      near: "empty",
    });
    expect(result.ok).toBe(true);
  });
});

describe("findElement — id minting", () => {
  it("derives the id slug from the resolved element's accessible name", () => {
    document.body.innerHTML = `<button>Save Changes</button>`;
    const store = createAgentStore();
    const result = findElement(store, {
      query: "save changes button",
      role: "button",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe("fdy-find-save-changes");
    }
  });

  it("suffixes the id when the same slug is reused", () => {
    document.body.innerHTML = `
      <button>Save</button>
      <span>Save</span>
    `;
    const store = createAgentStore();
    const r1 = findElement(store, { query: "save button", role: "button" });
    expect(r1.ok).toBe(true);
    // Next discovery reaches the span; its base slug ("save") would collide.
    const r2 = findElement(store, { query: "save text", text: "Save" });
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.id).not.toBe(r2.id);
      expect(r2.id.startsWith("fdy-find-save")).toBe(true);
    }
  });
});

describe("findElement — per-session cap", () => {
  it("rejects discoveries past MAX_DISCOVERIES_PER_SESSION", () => {
    const store = createAgentStore();
    // Pre-populate the registry past the cap with discovered entries.
    for (let i = 0; i < 60; i++) {
      store.getState().register({
        id: `fdy-find-pre-${i}`,
        tag: "div",
        type: "element",
        discoveredVia: "findElement",
      });
    }
    document.body.innerHTML = `<button>Sign up</button>`;
    const result = findElement(store, {
      query: "sign up button",
      role: "button",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/cap/);
  });
});
