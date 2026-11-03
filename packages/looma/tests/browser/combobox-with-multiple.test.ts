import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox with multiple", () => {
  it("creates on Enter when the consumer also owns the query", async () => {
    const path = await bundle("converted-multi-create-query", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const options = createState([{ value: "bar", label: "Bar" }]);
      const items = createState([]);
      const query = createState("");
      const created = [];
      window.created = created;
      window.errors = [];
      const app = createScene({
        render: () => sceneNode(Combobox, {
          id: "tags", label: "Tags", multiple: true, allowCreate: true, items: items.value,
          query: query.value, "bind:query": (value) => { query.value = value; },
          // Created optimistically: offered and selected at once, confirmed later.
          onCreateItem: (event) => {
            const { query: name } = event.detail;
            created.push(name);
            const option = { value: name.toLowerCase(), label: name };
            options.value = [...options.value, option];
            items.value = [...items.value, { id: option.value, ...option }];
          },
        }, () => options.value.map((option) => sceneNode("option", { key: option.value, value: option.value }, option.label))),
      });
      app.onError = (error) => { window.errors.push(String(error && error.stack || error)); };
      app.mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const input = page.locator("#tags input");
    await input.click();
    await input.pressSequentially("Foo");
    await input.press("Enter");
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { errors: string[] }).errors), []);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { created: string[] }).created), ["Foo"]);
    await expect.poll(() => page.locator("#tags .item").allInnerTexts()).toStrictEqual(["Foo"]);
    await expect.poll(() => input.inputValue()).toBe("");
    await page.close();
  });

  it("offers to create what was typed, creates it on Enter, and checks it once the consumer adds it", async () => {
    const path = await bundle("converted-multi-create", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const options = createState([{ value: "bar", label: "Bar" }]);
      const items = createState([]);
      const created = [];
      window.created = created;
      createScene({
        render: () => sceneNode(Combobox, {
          id: "tags", label: "Tags", multiple: true, allowCreate: true, items: items.value,
          // A consumer creates asynchronously, then offers and selects the new option.
          onCreateItem: (event) => {
            const { query } = event.detail;
            created.push(query);
            setTimeout(() => {
              const option = { value: query.toLowerCase(), label: query };
              options.value = [...options.value, option];
              items.value = [...items.value, { id: option.value, ...option }];
            }, 50);
          },
        }, () => options.value.map((option) => sceneNode("option", { key: option.value, value: option.value }, option.label))),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const input = page.locator("#tags input");
    await input.click();
    await input.pressSequentially("Foo");

    // Nothing matches, so the offer to create is the choice Enter makes, and it looks it.
    const create = page.locator('#tags [role="option"]', { hasText: "Create" });
    await create.waitFor();
    await expect.poll(() => input.getAttribute("aria-activedescendant")).toBe(await create.getAttribute("id"));

    await input.press("Enter");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { created: string[] }).created), ["Foo"]);

    // Once the consumer adds it, it is checked in the list without another keystroke.
    const foo = page.locator('#tags [role="option"]', { hasText: /^\s*Foo\s*$/ });
    await foo.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('#tags [role="option"]')]
      .some((option) => option.textContent?.trim() === "Foo" && option.getAttribute("aria-selected") === "true"), null, { timeout: 2000 });

    await page.close();
  });

  it("keeps the items it selects, and follows a consumer that owns them", async () => {
    const path = await bundle("converted-multi", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const owned = createState([]);
      window.owned = owned;
      createScene({
        render: () => sceneNode("div", [
          sceneNode(Combobox, { id: "free", label: "Tags", multiple: true }, () => [
            sceneNode("option", { value: "alpha" }, "Alpha"),
            sceneNode("option", { value: "beta" }, "Beta"),
          ]),
          sceneNode(Combobox, { id: "owned", label: "Owned", multiple: true, items: owned.value }, () => [
            sceneNode("option", { value: "alpha" }, "Alpha"),
          ]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    // Uncontrolled: selecting an option keeps it, with no consumer wiring.
    await page.locator("#free input").click();
    await page.locator("#free input").fill("Al");
    await page.locator('#free [role="option"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll("#free .item").length === 1);
    await expect.poll(() => page.locator("#free .item").first().innerText()).toBe("Alpha");

    // Controlled: the consumer's list wins.
    await page.evaluate(() => {
      (window as unknown as { owned: { value: unknown[] } }).owned.value = [{ id: "a", value: "alpha", label: "Alpha" }];
    });
    await page.waitForFunction(() => document.querySelectorAll("#owned .item").length === 1);
    await page.close();
  });
});
