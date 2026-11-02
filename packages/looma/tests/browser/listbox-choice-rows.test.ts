import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Listbox choice rows", () => {
  const check = async (page: Page) => {
    const listbox = page.locator("#regions");
    assert.equal(await listbox.evaluate((element) => element.localName), "div");
    await expect.poll(() => listbox.getAttribute("role")).toBe("listbox");
    await expect.poll(() => listbox.getAttribute("data-enhanced")).toBe("");
    await expect.poll(() => listbox.locator("select.fallback").isVisible()).toBe(false);
    await expect.poll(() => listbox.locator("select.fallback").isDisabled()).toBe(true);
    await expect.poll(() => listbox.locator('[role="option"]').count()).toBe(3);
    assert.deepEqual((await listbox.locator('[role="option"][aria-selected="true"]').allInnerTexts()).map((label) => label.toLowerCase()), ["north", "west"]);
    assert.equal(await listbox.locator('[role="option"]').first().evaluate((element) => getComputedStyle(element, "::before").content), '""');
    const entries = () => page.locator("#form").evaluate((form: HTMLFormElement) =>
      Array.from(new FormData(form).getAll("regions"), String));
    assert.deepEqual(await entries(), ["north", "west"]);
    await listbox.locator('[role="option"]').nth(1).click();
    assert.deepEqual(await entries(), ["north", "south", "west"]);
    await listbox.press(" ");
    assert.deepEqual(await entries(), ["north", "west"]);
    await page.locator("#form").evaluate((form: HTMLFormElement) => form.reset());
    assert.deepEqual(await entries(), ["north", "west"]);
  };

  it("uses checked choice rows and form reset in HTML", async () => {
    const path = await bundle("html-listbox", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form"><ui-listbox id="regions" name="regions" rows="4" multiple values='["north","west"]'>
        <option value="north">North</option><option value="south">South</option><option value="west">West</option>
      </ui-listbox></form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("uses checked choice rows and form reset in converted output", async () => {
    const path = await bundle("converted-listbox", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiListbox as Listbox } from "@looma-test/components";
      createScene({ render: () => sceneNode("form", { id: "form" }, [sceneNode(Listbox, {
        id: "regions", name: "regions", rows: 4, multiple: true, values: ["north", "west"],
      }, () => ["north", "south", "west"].map((value) => sceneNode("option", { value }, value)))]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("keeps required form validation and a native label association", async () => {
    const path = await bundle("html-required-listbox", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form"><label for="plan">Plan</label><ui-listbox id="plan" name="plan" required>
        <option value="basic">Basic</option><option value="team">Team</option>
      </ui-listbox></form>
    `, [join(root, "tokens.css")]);
    const listbox = page.locator("#plan");
    await expect.poll(() => listbox.getAttribute("aria-labelledby")).toBe(await page.locator("label").getAttribute("id"));
    assert.equal(await page.locator("#form").evaluate((form: HTMLFormElement) => form.checkValidity()), false);
    await listbox.locator('[role="option"]').nth(1).click();
    assert.equal(await page.locator("#form").evaluate((form: HTMLFormElement) => form.checkValidity()), true);
    assert.deepEqual(await page.locator("#form").evaluate((form: HTMLFormElement) => Array.from(new FormData(form).getAll("plan"))), ["team"]);
    await page.locator("#form").evaluate((form: HTMLFormElement) => form.reset());
    assert.equal(await page.locator("#form").evaluate((form: HTMLFormElement) => form.checkValidity()), false);
    await page.close();
  });
});
