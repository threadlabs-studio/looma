import assert from "node:assert/strict";
import { test } from "node:test";

import { passthroughPort } from "./convert-template.mjs";

test("derives props and bindings from :host attribute conditions", () => {
  const port = passthroughPort("ui-button", ":host([data-variant='solid']) { } :host([data-size='sm']) { }", "span");
  assert.match(port, /<prop name="variant"/);
  assert.match(port, /<prop name="size"/);
  assert.match(port, /<span :data-variant="variant" :data-size="size"><slot><\/slot><\/span>/);
});

test("binds each prop once, preferring the data- target (no conflicting targets)", () => {
  // ui-button references both [data-disabled] and [disabled] for the same prop
  const port = passthroughPort("ui-button", ":host([data-disabled='true']) { } :host([disabled]) { }", "span");
  assert.equal((port.match(/:[\w-]+="disabled"/g) ?? []).length, 1);
  assert.match(port, /:data-disabled="disabled"/);
});

test("skips runtime/hyphenated attributes that are not authored props", () => {
  const port = passthroughPort("ui-x", ":host([data-ui-proximity='near']) { }", "span");
  assert.doesNotMatch(port, /proximity/);
  assert.match(port, /<span><slot><\/slot><\/span>/);
});

test("always emits a non-empty summary and mirrors the chosen root element", () => {
  const port = passthroughPort("ui-callout", ":host { display: block; }", "div");
  assert.match(port, /summary="[^"]+"/);
  assert.match(port, /<div><slot><\/slot><\/div>/);
});
