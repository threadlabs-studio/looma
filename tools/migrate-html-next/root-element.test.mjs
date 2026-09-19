import assert from "node:assert/strict";
import { test } from "node:test";

import { rootElementFor } from "./root-element.mjs";

test("uses only the unconditional host rule to infer the native root", () => {
  assert.equal(rootElementFor(":host(:not([data-open])) { display: none; }"), "span");
  assert.equal(rootElementFor(":host { display: block; } :host([hidden]) { display: none; }"), "div");
  assert.equal(rootElementFor(":host { display: inline-flex; }"), "span");
});
