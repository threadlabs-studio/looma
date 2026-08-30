import assert from "node:assert/strict";
import test from "node:test";

import { findUnhandledStencilWarnings } from "./run-stencil-build.mjs";

test("Stencil warning policy allows only the documented CJS filename false positive", () => {
  const known = `[ WARN ] Package Json: package.json:19:3
    package.json "main" property is set to "dist/index.cjs". It's
    recommended to set the "main" property to: dist/index.cjs.js`;
  assert.deepEqual(findUnhandledStencilWarnings(known), []);
});

test("Stencil warning policy rejects new or additional warnings", () => {
  assert.equal(findUnhandledStencilWarnings("[ WARN ] Unexpected compiler warning").length, 1);
  const knownAndUnexpected = `[ WARN ] package.json "main" property is set to "dist/index.cjs". It's recommended to set the "main" property to: dist/index.cjs.js
[ WARN ] Unexpected compiler warning`;
  assert.equal(findUnhandledStencilWarnings(knownAndUnexpected).length, 1);
});
