import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Loading actions", () => {
  it("keeps focus and labels while blocking button submits, icon clicks, and link navigation in HTML", async () => {
    const path = await bundle("html-loading-actions", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form"><ui-button id="save" type="submit" loading><span>Save</span></ui-button></form>
      <ui-icon-button id="more" label="More" loading><ui-icon name="ellipsis"></ui-icon></ui-icon-button>
      <ui-button id="link" href="#target" loading>Open</ui-button>
    `, [join(root, "tokens.css")]);
    await page.evaluate(() => {
      (window as unknown as { activations: number }).activations = 0;
      for (const id of ["save", "more", "link"]) document.getElementById(id)?.addEventListener("click", () => (window as unknown as { activations: number }).activations++);
      document.getElementById("form")?.addEventListener("submit", (event) => { event.preventDefault(); (window as unknown as { activations: number }).activations++; });
    });
    for (const id of ["save", "more", "link"]) {
      const action = page.locator(`#${id}`);
      await expect.poll(() => action.getAttribute("aria-disabled")).toBe("true");
      await expect.poll(() => action.getAttribute("aria-busy")).toBe("true");
      await expect.poll(() => action.locator("ui-spinner, :is([component~='ui-spinner'], [data-component~='ui-spinner'], .ui-spinner, [ui-spinner])").count()).toBe(1);
      await action.focus();
      assert.equal(await action.evaluate((element) => element === document.activeElement), true);
      const box = await action.boundingBox();
      assert.ok(box);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    assert.equal(await page.locator("#save").textContent().then((value) => value?.includes("Save")), true);
    await expect.poll(() => page.locator("#more").getAttribute("aria-label")).toBe("More");
    await expect.poll(() => page.locator("#link").getAttribute("href")).toBe(null);
    await expect.poll(() => page.locator("#link").getAttribute("tabindex")).toBe("0");
    const spinner = await page.locator("#save ui-spinner, #save :is([component~='ui-spinner'], [data-component~='ui-spinner'], .ui-spinner, [ui-spinner])").boundingBox();
    const spinnerWrap = await page.locator("#save .spinner-wrap").boundingBox();
    const label = await page.locator("#save").getByText("Save", { exact: true }).boundingBox();
    assert.ok(spinner && spinnerWrap && label);
    assert.ok(Math.abs(spinnerWrap.width - spinnerWrap.height) < 1, "spinner rotates inside a square box");
    const arc = page.locator("#save :is([component~='ui-spinner'], [data-component~='ui-spinner'], .ui-spinner, [ui-spinner]) svg .arc");
    assert.equal(await arc.evaluate((element) => getComputedStyle(element).strokeLinecap), "round");
    assert.equal(await arc.evaluate((element) => getComputedStyle(element).animationName), "ui-spinner-dash");
    assert.ok(label.x - (spinnerWrap.x + spinnerWrap.width) >= 7, "loading spinner has space before the label");
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 0);
    assert.equal(await page.evaluate(() => location.hash), "");
    await page.close();
  });

  it("reactivates when a converted consumer clears loading", async () => {
    const path = await bundle("converted-loading-actions", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiButton as Button, UiIconButton as IconButton } from "@looma-test/components";
      const loading = createState(true);
      window.finish = () => { loading.value = false; };
      createScene({ render: () => sceneNode("div", [
        sceneNode(Button, { id: "save", loading: loading.value }, () => "Save"),
        sceneNode(IconButton, { id: "more", label: "More", loading: loading.value }, () => sceneNode("svg", { viewBox: "0 0 24 24" })),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await page.evaluate(() => {
      (window as unknown as { activations: number }).activations = 0;
      for (const id of ["save", "more"]) document.getElementById(id)?.addEventListener("click", () => (window as unknown as { activations: number }).activations++);
    });
    await page.locator("#save").evaluate((element) => (element as HTMLElement).click());
    await page.locator("#more").evaluate((element) => (element as HTMLElement).click());
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 0);
    await page.evaluate(() => (window as unknown as { finish: () => void }).finish());
    await page.locator("#save").click();
    await page.locator("#more").click();
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 2);
    await expect.poll(() => page.locator("#save").getAttribute("aria-disabled")).toBe(null);
    await page.close();
  });
});
