import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import controller from "./ui-top-bar.js";

const originalMutationObserver = globalThis.MutationObserver;

afterEach(() => {
  globalThis.MutationObserver = originalMutationObserver;
});

test("controller synchronizes optional top-bar regions", () => {
  const observations = [];
  let disconnected = false;
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      observations.push(this);
    }

    observe() {}
    disconnect() { disconnected = true; }
  };

  const regions = new Map([
    [".top-bar__leading", { childNodes: [], hidden: false }],
    [".top-bar__search", { childNodes: [{ nodeType: 1, textContent: "Search" }], hidden: true }],
    [".top-bar__actions", { childNodes: [{ nodeType: 3, textContent: "  " }], hidden: false }],
  ]);
  const element = { querySelector: (selector) => regions.get(selector) };

  const cleanup = controller({ element });
  assert.equal(regions.get(".top-bar__leading").hidden, true);
  assert.equal(regions.get(".top-bar__search").hidden, false);
  assert.equal(regions.get(".top-bar__actions").hidden, true);

  regions.get(".top-bar__actions").childNodes.push({ nodeType: 1, textContent: "Share" });
  observations[0].callback();
  assert.equal(regions.get(".top-bar__actions").hidden, false);

  cleanup();
  assert.equal(disconnected, true);
});
