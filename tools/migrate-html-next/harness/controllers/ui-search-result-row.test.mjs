import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import controller, { hasContent } from "./ui-search-result-row.js";

const originalMutationObserver = globalThis.MutationObserver;

afterEach(() => {
  globalThis.MutationObserver = originalMutationObserver;
});

test("hasContent ignores whitespace but accepts rendered nodes", () => {
  assert.equal(hasContent({ childNodes: [{ nodeType: 3, textContent: " \n" }] }), false);
  assert.equal(hasContent({ childNodes: [{ nodeType: 1, textContent: "" }] }), true);
});

test("controller synchronizes projected-region state", () => {
  let callback;
  let disconnected = false;
  globalThis.MutationObserver = class {
    constructor(next) { callback = next; }
    observe() {}
    disconnect() { disconnected = true; }
  };

  const regions = {
    ".search-result-row__leading": { childNodes: [] },
    ".search-result-row__meta": { childNodes: [{ nodeType: 3, textContent: "Metadata" }] },
    ".search-result-row__excerpt": { childNodes: [{ nodeType: 3, textContent: "Excerpt" }] },
    ".search-result-row__trailing": { childNodes: [] },
  };
  const host = {
    element: { querySelector(selector) { return regions[selector]; } },
    state: {},
  };
  const cleanup = controller(host);
  assert.deepEqual(host.state, {
    hasLeading: false,
    hasMeta: true,
    hasExcerpt: true,
    hasTrailing: false,
  });

  regions[".search-result-row__trailing"].childNodes.push({ nodeType: 1, textContent: "" });
  callback();
  assert.equal(host.state.hasTrailing, true);
  cleanup();
  assert.equal(disconnected, true);
});
