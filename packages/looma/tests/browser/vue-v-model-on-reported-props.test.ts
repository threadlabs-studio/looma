import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("converted v-model on reported props", () => {
  it("keeps v-model:query in step with a Combobox's typing", async () => {
    const path = await bundle("converted-query", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const query = createState("");
      window.query = query;
      createScene({
        render: () => sceneNode(Combobox, { id: "tags", label: "Tags", query: query.value, "bind:query": (value) => { query.value = value; } }, () => [
          sceneNode("option", { value: "research" }, "Research"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await page.locator("#tags input").pressSequentially("Res");
    await expect.poll(() => page.locator("#tags input").inputValue()).toBe("Res");
    assert.equal(await page.evaluate(() => (window as unknown as { query: { value: string } }).query.value), "Res");
    await page.close();
  });
});
