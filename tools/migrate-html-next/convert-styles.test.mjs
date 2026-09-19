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

test("Stencil prop selectors follow HTML Next's data-* reflection", () => {
  const reflectedAttributes = new Map([
    ["size", "data-size"],
    ["mobile-only", "data-mobile-only"],
  ]);
  assert.equal(
    convertShadowStyles(":host([size='sm'][mobile-only]) button { width: 2rem; }", { reflectedAttributes }),
    ":scope[data-size='sm'][data-mobile-only] button { width: 2rem; }",
  );
  assert.equal(
    convertShadowStyles(":host([popover][data-open][aria-disabled='true']) { display: block; }", { reflectedAttributes }),
    ":scope[popover][data-open][aria-disabled='true'] { display: block; }",
  );
});

test("boolean presence selectors require a reflected true value", () => {
  const reflectedAttributes = new Map([
    ["multiple", "data-multiple"],
    ["size", "data-size"],
  ]);
  const booleanAttributes = new Set(["multiple"]);
  assert.equal(
    convertShadowStyles(":host([multiple]) input { padding: 1px; }", {
      reflectedAttributes,
      booleanAttributes,
    }),
    ":scope[data-multiple='true'] input { padding: 1px; }",
  );
  assert.equal(
    convertShadowStyles(":host([size='sm']) input { padding: 1px; }", {
      reflectedAttributes,
      booleanAttributes,
    }),
    ":scope[data-size='sm'] input { padding: 1px; }",
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
