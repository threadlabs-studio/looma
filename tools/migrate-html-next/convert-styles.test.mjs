import assert from "node:assert/strict";
import { test } from "node:test";

import { convertShadowStyles } from "./convert-styles.mjs";

test(":host with and without a condition becomes :scope", () => {
  assert.equal(convertShadowStyles(":host { display: inline-flex; }"), ":scope { display: inline-flex; }");
  assert.equal(
    convertShadowStyles(":host([data-variant='solid']) { color: white; }"),
    ":scope[data-variant='solid'] { color: white; }",
  );
});

test(":host with a functional-pseudo condition folds correctly (balanced parens)", () => {
  assert.equal(
    convertShadowStyles(":host(:not([data-open])) { opacity: 1; }"),
    ":scope:not([data-open]) { opacity: 1; }",
  );
  assert.equal(
    convertShadowStyles(":host(:hover:not([aria-disabled='true'])) { cursor: pointer; }"),
    ":scope:hover:not([aria-disabled='true']) { cursor: pointer; }",
  );
});

test("::slotted becomes :slotted, preserving the argument (including nested parens)", () => {
  assert.equal(convertShadowStyles("::slotted(button) { all: unset; }"), ":slotted(button) { all: unset; }");
  assert.equal(
    convertShadowStyles("::slotted(:nth-child(n + 3)) { display: none; }"),
    ":slotted(:nth-child(n + 3)) { display: none; }",
  );
});

test("combined :host(cond) ::slotted(sel) — the ui-button pattern", () => {
  assert.equal(
    convertShadowStyles(":host([data-variant='solid']) ::slotted(button) { background: var(--accent); }"),
    ":scope[data-variant='solid'] :slotted(button) { background: var(--accent); }",
  );
});

test(":host-context keeps the ancestor as a light-DOM prefix", () => {
  assert.equal(
    convertShadowStyles(":host-context([data-theme='dark']) :slotted(button) { color: white; }"),
    "[data-theme='dark'] :scope :slotted(button) { color: white; }",
  );
});
