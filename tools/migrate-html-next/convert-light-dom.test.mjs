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
    convertLightDomStyles(".ui-badge { font-family: ui-monospace; color: var(--ui-badge-color); } my-ui-badge { display: block; }"),
    ".ui-badge { font-family: ui-monospace; color: var(--ui-badge-color); } my-ui-badge { display: block; }",
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

test("retargets every public attribute in a chained selector", () => {
  const css = `ui-sidebar[side="end"][resizable] > :last-child { flex: 1 }`;
  const converted = convertLightDomStyles(css, {
    contracts: {
      "ui-sidebar": {
        props: {
          side: { type: "string" },
          resizable: { type: "boolean" },
        },
      },
    },
  });
  assert.equal(
    converted,
    `[data-component-root~="ui-sidebar"][data-side="end"][data-resizable='true'] > :last-child { flex: 1 }`,
  );
});

test("retargets compatibility selectors for effective component state", () => {
  const contracts = {
    "ui-dialog": {
      props: { open: { type: "boolean" } },
      stateAttributes: { "data-open": "data-state-open" },
    },
  };
  assert.equal(
    convertLightDomStyles("ui-dialog[data-open] {}", { contracts }),
    "[data-component-root~=\"ui-dialog\"][data-state-open] {}",
  );
});
