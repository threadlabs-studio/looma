import assert from "node:assert/strict";
import test from "node:test";

import {
  preserveVueOptionalBooleanAbsence,
  preserveVueSlotRegions,
} from "./framework-adoption.mjs";

test("leaves a sole Vue default slot direct for child layout contracts", () => {
  assert.equal(
    preserveVueSlotRegions("<div><slot></slot></div>"),
    "<div><slot></slot></div>",
  );
});

test("marks every Vue slot when a component has multiple projected regions", () => {
  assert.equal(
    preserveVueSlotRegions('<div><slot></slot><slot name="actions"></slot></div>'),
    '<div><span data-looma-framework-slot="" style="display: contents"><slot></slot></span><span slot="actions" data-looma-framework-slot="actions" style="display: contents"><slot name="actions"></slot></span></div>',
  );
});

test("keeps omitted optional Vue Boolean props distinct from false", () => {
  const compiled = [
    "props: {",
    "  defaultEdit: { type: [Boolean, null], required: false, default: false },",
    "  edit: { type: [Boolean, null], required: false }",
    "}",
  ].join("\n");
  const definition = [
    '<prop name="defaultEdit" type="boolean" default="false"></prop>',
    '<prop name="edit" type="boolean"></prop>',
  ].join("\n");

  const rewritten = preserveVueOptionalBooleanAbsence(compiled, definition);
  assert.match(rewritten, /defaultEdit: \{ type: \[Boolean, null\], required: false, default: false \}/);
  assert.match(rewritten, /edit: \{ type: \[Boolean, null\], required: false, default: undefined \}/);
});

test("fails when an optional Vue Boolean prop cannot be rewritten", () => {
  assert.throws(
    () => preserveVueOptionalBooleanAbsence("props: {}", '<prop name="open" type="boolean"></prop>'),
    /Could not preserve undefined for optional Vue Boolean prop `open`\./,
  );
});
