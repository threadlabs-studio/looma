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

test("retargets public attributes and preserves boolean presence semantics", () => {
  const contracts = {
    "ui-radio": { props: { disabled: { type: "boolean" } } },
    "ui-radio-group": { props: { orientation: { type: "string" } } },
    "ui-form-field": { props: { invalid: { type: "boolean" } } },
  };
  assert.equal(
    convertLightDomStyles(
      "ui-radio[data-disabled], ui-radio[disabled], ui-radio-group[orientation='vertical'], ui-form-field[invalid] {}",
      { contracts },
    ),
    "[data-component-root~=\"ui-radio\"][data-disabled='true'], [data-component-root~=\"ui-radio\"][data-disabled='true'], [data-component-root~=\"ui-radio-group\"][data-orientation='vertical'], [data-component-root~=\"ui-form-field\"][data-invalid='true'] {}",
  );
});
