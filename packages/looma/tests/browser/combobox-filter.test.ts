import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox filter", () => {
  // filter="none" lists every authored option, as a server search returned them; the default still
  // narrows by label. Keyboard choice and the blur commit work over the listed options.
  const check = async (page: Page) => {
    const labels = (id: string) => page.locator(`#${id} [role="option"]`).evaluateAll((all) => all.map((option) => option.querySelector(".primary")?.textContent));
    const server = page.locator('#server input[role="combobox"]');
    await server.waitFor();
    await server.fill("harb");
    assert.deepEqual(await labels("server"), ["Riley Kim", "Harbor Auto Group"], "a result matched on its description still shows");
    await server.press("ArrowDown");
    await expect.poll(() => server.getAttribute("aria-activedescendant")).toBe(await page.getByRole("option", { name: "Riley Kim", exact: true }).getAttribute("id"));
    await server.press("ArrowDown");
    await server.press("Enter");
    await expect.poll(() => server.inputValue()).toBe("Harbor Auto Group");
    const local = page.locator('#local input[role="combobox"]');
    await local.fill("harb");
    assert.deepEqual(await labels("local"), ["Harbor Auto Group"], "the default filters by label");
    // Leaving with text that is no label commits the only option listed.
    const single = page.locator('#single input[role="combobox"]');
    await single.fill("harb");
    await single.press("Tab");
    await expect.poll(() => single.inputValue()).toBe("Riley Kim");
    assert.equal(await page.evaluate(() => (window as unknown as { changes: any[] }).changes.at(-1).value), "riley");
  };

  it("lists every option with filter none and filters by label by default in HTML", async () => {
    const path = await bundle("html-combobox-filter", `
      import "@looma-test/runtime";
      window.changes = [];
      document.addEventListener("value-change", (event) => window.changes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-combobox id="server" label="Server" filter="none">
        <option value="riley" data-description="Harbor Auto Group">Riley Kim</option>
        <option value="harbor">Harbor Auto Group</option>
      </ui-combobox>
      <ui-combobox id="local" label="Local">
        <option value="riley" data-description="Harbor Auto Group">Riley Kim</option>
        <option value="harbor">Harbor Auto Group</option>
      </ui-combobox>
      <ui-combobox id="single" label="Single" filter="none">
        <option value="riley" data-description="Harbor Auto Group">Riley Kim</option>
      </ui-combobox>
      <button>After</button>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("lists every option with filter none and filters by label by default in converted output", async () => {
    const path = await bundle("converted-combobox-filter", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      window.changes = [];
      const riley = () => sceneNode("option", { value: "riley", "data-description": "Harbor Auto Group" }, "Riley Kim");
      const harbor = () => sceneNode("option", { value: "harbor" }, "Harbor Auto Group");
      const onValueChange = (event) => window.changes.push(event.detail);
      createScene({
        render: () => [
          sceneNode(Combobox, { id: "server", label: "Server", filter: "none", onValueChange }, () => [riley(), harbor()]),
          sceneNode(Combobox, { id: "local", label: "Local", onValueChange }, () => [riley(), harbor()]),
          sceneNode(Combobox, { id: "single", label: "Single", filter: "none", onValueChange }, () => [riley()]),
          sceneNode("button", "After"),
        ],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
