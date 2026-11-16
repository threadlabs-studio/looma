import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "vitest";
import { root, bundle, open } from "../renderers/browser-driver";

describe("UI typography roles", () => {
  it("keeps peer controls on the UI scale inside larger prose and scales with the root", async () => {
    const path = await bundle("ui-type-roles", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <section style="font-size:24px">
        <ui-text id="prose">Reading text follows its context.</ui-text>
        <ui-button id="action">Continue</ui-button>
        <ui-input id="input" aria-label="Name"></ui-input>
        <ui-select id="select" aria-label="Stage"><option>Draft</option></ui-select>
        <ui-textarea id="textarea" aria-label="Notes"></ui-textarea>
        <ui-checkbox id="checkbox">Remember</ui-checkbox>
        <ui-radio id="radio" name="choice">Email</ui-radio>
        <ui-switch id="switch">Notifications</ui-switch>
        <ui-form-field id="field"><label slot="label">Name</label><ui-input aria-label="Full name"></ui-input></ui-form-field>
        <ui-combobox id="combo" label="Person"><option value="a">Alex</option></ui-combobox>
        <ui-radio-group id="radio-group" label="Delivery"><ui-radio name="delivery">Email</ui-radio></ui-radio-group>
        <ui-segmented-control id="segments" label="View" items='[{value: "list", label: "List"}]'></ui-segmented-control>
        <ui-listbox id="listbox" aria-label="Choices"><option>First</option></ui-listbox>
        <ui-nav-item id="nav" href="#">Overview</ui-nav-item>
        <ui-nav-item id="compact-nav" density="compact" href="#">Details</ui-nav-item>
        <ui-list-item id="row">Item</ui-list-item>
        <ui-disclosure id="disclosure" summary="Details">Reading content</ui-disclosure>
        <ui-menu inline aria-label="Actions"><ui-menu-item id="menu-item">Edit</ui-menu-item></ui-menu>
        <ui-context-menu id="context" open><ui-menu-item id="context-item">Copy</ui-menu-item></ui-context-menu>
        <ui-button id="large" size="lg">Large action</ui-button>
      </section>`, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-system.css")]);
    const selectors = ["#action", "#input", "#select", "#textarea", "#checkbox", "#radio", "#switch",
      "#field label", "#combo label", "#combo input", "#listbox", "#nav .label", "#compact-nav .label",
      "#radio-group legend", "#segments legend", "#segments .choice", "#row .title", "#disclosure .trigger", "#menu-item", "#context-item"];
    for (const base of [16, 20]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = `${size}px`; }, base);
      const sizes = await page.evaluate(selectors => selectors.map(selector => {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing typography peer: ${selector}`);
        return parseFloat(getComputedStyle(element).fontSize);
      }), selectors);
      assert.deepEqual(sizes, selectors.map(() => base * .875), `UI peers at ${base}px root: ${selectors.join(", ")}`);
      assert.equal(await page.locator("#prose").evaluate(el => getComputedStyle(el).fontSize), "24px");
      assert.equal(await page.locator("#large").evaluate(el => parseFloat(getComputedStyle(el).fontSize)), base);
    }
    await page.addStyleTag({ content: ':root { --ui-field-label-font-size: 18px; }' });
    for (const selector of ["#field label", "#combo label"]) {
      assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).fontSize), "18px");
    }
    const { defaultRecipe, themeCSS } = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const recipe = defaultRecipe();
    recipe.values['label-size'] = 'inherit';
    recipe.values['text-size'] = '20px';
    await page.addStyleTag({ content: themeCSS(recipe) });
    for (const selector of ["#field label", "#combo label", "#radio-group legend", "#segments legend"]) {
      assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).fontSize), "20px", `${selector}: Follow body uses the generated body role`);
    }
    assert.equal(await page.locator("#combo input").evaluate(el => getComputedStyle(el).fontSize), "17.5px", "Follow body changes the label without enlarging its UI value");
    await page.close();
  });
});
