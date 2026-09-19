import assert from "node:assert/strict";
import { test } from "node:test";

import { convertLightDomStyles } from "./convert-light-dom.mjs";

test("retargets compatibility selectors to lowered component roots", () => {
  assert.equal(
    convertLightDomStyles("ui-badge[data-tone='accent'], :where(ui-avatar) > img { color: red; }"),
    "[data-component-root~=\"ui-badge\"][data-tone='accent'], :where([data-component-root~=\"ui-avatar\"]) > img { color: red; }",
  );
});

test("does not rewrite custom properties or longer identifiers", () => {
  assert.equal(
    convertLightDomStyles(".x { color: var(--ui-badge-color); } my-ui-badge { display: block; }"),
    ".x { color: var(--ui-badge-color); } my-ui-badge { display: block; }",
  );
});
