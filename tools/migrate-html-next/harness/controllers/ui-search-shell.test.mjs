import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import controller, { hasContent } from "./ui-search-shell.js";

const originalMutationObserver = globalThis.MutationObserver;

afterEach(() => {
  globalThis.MutationObserver = originalMutationObserver;
});

test("hasContent ignores whitespace but accepts rendered nodes", () => {
  assert.equal(hasContent({ childNodes: [] }), false);
  assert.equal(hasContent({ childNodes: [{ nodeType: 3, textContent: "  \n" }] }), false);
  assert.equal(hasContent({ childNodes: [{ nodeType: 3, textContent: "Ready" }] }), true);
  assert.equal(hasContent({ childNodes: [{ nodeType: 1, textContent: "" }] }), true);
});

test("controller synchronizes optional status and footer regions", () => {
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

  const status = { childNodes: [{ nodeType: 3, textContent: " " }], hidden: false };
  const footer = { childNodes: [{ nodeType: 1, textContent: "Footer" }], hidden: true };
  const element = {
    querySelector(selector) {
      return selector === ".search-shell__status" ? status : footer;
    },
  };

  const state = {};
  const cleanup = controller({ element, state });
  assert.deepEqual(state, { hasStatus: false, hasFooter: true });
  assert.equal(status.hidden, true);
  assert.equal(footer.hidden, false);

  status.childNodes.push({ nodeType: 3, textContent: "Loading" });
  footer.childNodes.length = 0;
  observations[0].callback();
  assert.deepEqual(state, { hasStatus: true, hasFooter: false });
  assert.equal(status.hidden, false);
  assert.equal(footer.hidden, true);

  cleanup();
  assert.equal(disconnected, true);
});
