import assert from "node:assert/strict";

import { it } from "vitest";

import { bundle, open } from "../renderers/browser-driver";

it("preserves the native first option when Select has no controlled value", async () => {
  const htmlPath = await bundle("html-select-uncontrolled", 'import "@looma-test/runtime";');
  const vuePath = await bundle("converted-select-uncontrolled", `import { createScene, sceneNode } from "@looma-test/scene"; import { UiSelect as Select } from "@looma-test/components"; createScene({ render: () => sceneNode(Select, { value: null }, () => [sceneNode('option', { value: 'a' }, 'A'), sceneNode('option', { value: 'b' }, 'B')]) }).mount('#app');`);
  const html = await open(htmlPath, '<ui-select><option value="a">A</option><option value="b">B</option></ui-select>', []);
  const vue = await open(vuePath, '<div id="app"></div>', []);
  try {
    const native = await html.locator('select').inputValue();
    const converted = await vue.locator('select').inputValue();
    assert.equal(native, "a");
    assert.equal(converted, native);
  } finally { await html.close(); await vue.close(); }
});
