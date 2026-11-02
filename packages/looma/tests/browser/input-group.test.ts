import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Input group", () => {
  async function checkGroup(page: Page) {
    const group = page.locator("#group");
    await group.waitFor();
    // The input inside is still the form's field, affixes and all.
    await page.locator("#site").fill("acme");
    assert.deepEqual(await page.locator("#form").evaluate((form) => [...new FormData(form as HTMLFormElement).entries()]), [["site", "acme"]]);
    // The group draws the frame and the focus ring; the input inside draws neither.
    const input = await page.locator("#site").evaluate((element) => ({ border: getComputedStyle(element).borderTopColor, shadow: getComputedStyle(element).boxShadow }));
    assert.equal(input.border, "rgba(0, 0, 0, 0)");
    assert.equal(input.shadow, "none");
    await page.locator("#site").focus();
    await page.waitForTimeout(200);
    assert.match(await group.evaluate((element) => getComputedStyle(element).boxShadow), /3px/);
    await expect.poll(() => page.locator("#group").getByText(".example.com").count()).toBe(1);
    // An invalid input marks the whole group, not a second border inside it; its error is danger.
    await page.locator("#site").evaluate((element) => element.setAttribute("aria-invalid", "true"));
    await page.locator("#site").blur();
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#site").evaluate((element) => getComputedStyle(element).borderTopColor), "rgba(0, 0, 0, 0)");
    const danger = await page.evaluate(() => { const probe = document.createElement("span"); probe.style.color = "var(--ui-danger-solid)"; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
    assert.equal(await group.evaluate((element) => getComputedStyle(element).borderTopColor), danger);
  }

  it("frames an input and its affixes as one field, in HTML", async () => {
    const path = await bundle("html-input-group", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form">
        <ui-input-group id="group"><ui-input id="site" name="site"></ui-input><span slot="suffix">.example.com</span></ui-input-group>
      </form>`, [join(root, "tokens.css")]);
    await checkGroup(page);
    await page.close();
  });

  it("frames an input and its affixes as one field, in converted output", async () => {
    const path = await bundle("converted-input-group", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiInput as Input, UiInputGroup as InputGroup } from "@looma-test/components";
      createScene({ render: () => sceneNode("form", { id: "form" }, [
        sceneNode(InputGroup, { id: "group" }, { default: () => sceneNode(Input, { id: "site", name: "site" }), suffix: () => sceneNode("span", ".example.com") }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkGroup(page);
    await page.close();
  });
});
