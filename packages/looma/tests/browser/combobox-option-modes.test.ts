import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox option modes", () => {
  const verify = async (page: Page) => {
    const input = page.locator("#fruit input[role=combobox]");
    await input.focus();
    await expect.poll(() => input.getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => input.getAttribute("aria-invalid")).toBe("true");
    await input.fill("Ap");
    await expect.poll(() => page.locator('#fruit [role="option"]').count(), { message: "filter none leaves both authored options visible" }).toBe(2);
    await input.blur();
    await expect.poll(() => input.getAttribute("aria-invalid"), { message: "external invalid state survives native validation" }).toBe("true");
  };

  it("opens on focus, leaves externally filtered options visible, and keeps invalid in HTML", async () => {
    const path = await bundle("html-combobox-option-modes", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-combobox id="fruit" label="Fruit" filter="none" open-on-focus invalid>
        <option value="apple">Apple</option><option value="pear">Pear</option>
      </ui-combobox>
    `, [join(root, "tokens.css")]);
    await verify(page);
    await page.close();
  });

  it("passes option modes through the converter", async () => {
    const path = await bundle("converted-combobox-option-modes", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      createScene({ render: () => sceneNode(Combobox, { id: "fruit", label: "Fruit", filter: "none", openOnFocus: true, invalid: true }, () => [
        sceneNode("option", { value: "apple" }, "Apple"), sceneNode("option", { value: "pear" }, "Pear"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await verify(page);
    await page.close();
  });

  for (const adapter of ["html", "converted"]) it(`opens committed choices and toggles disclosure without reopening in ${adapter}`, async () => {
    const path = await bundle(`${adapter}-combobox-committed-opening`, adapter === "html" ? `import "@looma-test/runtime";` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const options = () => [sceneNode("option", {value:"apple"}, "Apple"), sceneNode("option", {value:"pear"}, "Pear")];
      createScene({render:()=>sceneNode("div", [
        sceneNode(Combobox, {id:"fruit",label:"Fruit",value:"apple",openOnFocus:true,disclosure:true},options),
        sceneNode(Combobox, {id:"draft",label:"Draft",value:"apple",query:"Ap",openOnFocus:true},options)
      ])}).mount("#app");
    `);
    const options = '<option value="apple">Apple</option><option value="pear">Pear</option>';
    const page = await open(path, adapter === "html" ? `<ui-combobox id="fruit" label="Fruit" value="apple" open-on-focus disclosure>${options}</ui-combobox><ui-combobox id="draft" label="Draft" value="apple" query="Ap" open-on-focus>${options}</ui-combobox>` : '<div id="app"></div>', [join(root,"tokens.css")]);
    try {
      const input = page.locator('#fruit input[role="combobox"]');
      await input.click();
      await page.waitForFunction(()=>document.querySelectorAll('#fruit [role="option"]').length === 2);
      await page.locator("#fruit").getByRole("button", {name:"Show suggestions",exact:true}).click();
      await expect.poll(() => input.getAttribute("aria-expanded"), { message: "explicit close survives returned input focus" }).toBe("false");
      await input.click();
      await expect.poll(() => input.getAttribute("aria-expanded"), { message: "click reopens a still-focused field" }).toBe("true");
      await expect.poll(() => page.locator('#fruit [role="option"]').count()).toBe(2);
      await input.fill("Pe");
      await page.waitForFunction(()=>document.querySelectorAll('#fruit [role="option"]').length === 1);
      assert.equal((await page.locator('#fruit [role="option"]').textContent())?.trim(), "Pear", "typing filters after the full selection list");
      await input.press("Escape");
      await page.locator('#draft input[role="combobox"]').click();
      await page.waitForFunction(()=>document.querySelectorAll('#draft [role="option"]').length === 1);
      assert.equal((await page.locator('#draft [role="option"]').textContent())?.trim(), "Apple", "an explicit query remains filtered on entry");
    } finally { await page.close(); }
  });

  for (const adapter of ["html", "converted"]) it(`renders each option and chosen item through one scoped slot in ${adapter}`, async () => {
      const optionSource = '<b class="custom-option">{$option.label}<template $if="$option.description"> / {$option.description}</template></b>';
      const itemSource = '<i class="custom-item">{$item.label}</i>';
      // A page's own <template slot> with bindings needs HTML Next's live parser; a compiled consumer does not.
      const path = await bundle(`${adapter}-combobox-scoped-slots`, adapter === "html" ? `
        import { lowerDocument } from "@nextwebwg/html-next/live";
        import "@looma-test/runtime";
        lowerDocument();
      ` : `
        import { createScene, sceneNode, scopedSlot } from "@looma-test/scene";
        import { UiCombobox as Combobox } from "@looma-test/components";
        createScene({ render: () => sceneNode(Combobox, { id: "fruit", label: "Fruit", multiple: true, openOnFocus: true, items: [{ id: "apple", value: "apple", label: "Apple" }] }, {
          default: () => [sceneNode("option", { value: "apple" }, "Apple"), sceneNode("option", { value: "pear", "data-description": "Green" }, "Pear")],
          option: scopedSlot(({ option }) => sceneNode("b", { class: "custom-option" }, option.label + (option.description ? " / " + option.description : "")), ${JSON.stringify(optionSource)}),
          item: scopedSlot(({ item }) => sceneNode("i", { class: "custom-item" }, item.label), ${JSON.stringify(itemSource)}),
        }) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-combobox id="fruit" label="Fruit" multiple open-on-focus items='[{"id":"apple","value":"apple","label":"Apple"}]'>
          <option value="apple">Apple</option><option value="pear" data-description="Green">Pear</option>
          <template slot="option">${optionSource}</template>
          <template slot="item">${itemSource}</template>
        </ui-combobox>
      ` : `<div id="app"></div>`, [join(root, "tokens.css")]);
      await page.locator("#fruit input[role=combobox]").focus();
      await page.locator("#fruit .custom-option").first().waitFor();
      await expect.poll(() => page.locator("#fruit [role=option] .custom-option").allTextContents(), { message: adapter }).toStrictEqual(["Apple", "Pear / Green"]);
      await expect.poll(() => page.locator("#fruit .item .custom-item").allTextContents(), { message: adapter }).toStrictEqual(["Apple"]);
      await page.close();
  });

  it("announces loading and shows an authored empty state when settled in HTML", async () => {
    const path = await bundle("html-combobox-loading", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-combobox id="fruit" label="Fruit" loading open-on-focus>
        <span slot="empty">No fruit found</span>
      </ui-combobox>
    `, [join(root, "tokens.css")]);
    const input = page.locator("#fruit input[role=combobox]");
    await input.focus();
    await expect.poll(() => input.getAttribute("aria-busy")).toBe("true");
    await expect.poll(() => page.locator('#fruit [role="listbox"]').getAttribute("aria-busy")).toBe("true");
    await expect.poll(() => page.getByText("No fruit found").isVisible()).toBe(false);
    await page.close();

    const settled = await open(path, `
      <ui-combobox id="fruit" label="Fruit" open-on-focus><span slot="empty">No fruit found</span></ui-combobox>
    `, [join(root, "tokens.css")]);
    await settled.locator("#fruit input[role=combobox]").focus();
    await expect.poll(() => settled.getByText("No fruit found").isVisible()).toBe(true);
    await expect.poll(() => settled.locator("#fruit input[role=combobox]").getAttribute("aria-busy")).toBe("false");
    await settled.close();
  });

  it("follows a converted consumer's loading state", async () => {
    const path = await bundle("converted-combobox-loading", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const loading = createState(true);
      window.finishLoading = () => { loading.value = false; };
      createScene({ render: () => sceneNode(Combobox, { id: "fruit", label: "Fruit", openOnFocus: true, loading: loading.value }, {
        empty: () => sceneNode("span", "No fruit found"),
      }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const input = page.locator("#fruit input[role=combobox]");
    await input.focus();
    await expect.poll(() => input.getAttribute("aria-busy")).toBe("true");
    await page.evaluate(() => (window as unknown as { finishLoading: () => void }).finishLoading());
    await page.getByText("No fruit found").waitFor({ state: "visible" });
    await expect.poll(() => input.getAttribute("aria-busy")).toBe("false");
    await page.close();
  });
});
