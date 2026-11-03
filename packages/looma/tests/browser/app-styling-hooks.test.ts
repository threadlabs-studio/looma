import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("App styling hooks", () => {
  // An app styles a component from a plain class of its own, through the component's hooks: no
  // selector of Looma's markup and no specificity to win. Each check runs on both targets.
  const appCss = `
    :root { --ui-motion-fast: 0s; }
    .frame { inline-size: 400px; }
    .narrow-input { --ui-input-inline-size: 150px; }
    .narrow-select {
      --ui-select-inline-size: 160px;
      --ui-select-surface: rgb(1, 2, 3);
      --ui-select-border: rgb(4, 5, 6);
      --ui-select-focus-border: rgb(7, 8, 9);
    }
    .narrow-nav { --ui-nav-item-inline-size: 170px; }
    .wide-field {
      --ui-form-field-min-inline-size: 300px;
      --ui-form-field-label-text: rgb(10, 20, 30);
      --ui-form-field-label-font-size: 18px;
      --ui-form-field-help-text: rgb(40, 50, 60);
      --ui-form-field-help-font-size: 11px;
    }
    .one-line { --ui-button-white-space: nowrap; }
    .tight { inline-size: 60px; }
  `;
  const label = "Save all the changes";

  async function check(page: Page) {
    await page.addStyleTag({ content: appCss });
    await page.locator("#heading-sized").waitFor();
    const style = (selector: string, property: string) =>
      page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
    const width = async (selector: string) => Math.round((await page.locator(selector).boundingBox())!.width);

    // Widths: the hook sizes the component; unset, it fills its container as before.
    assert.equal(await width("#input"), 150);
    assert.equal(await width("#input-default"), 400);
    assert.equal(await width("#select"), 160);
    assert.equal(await width("#select-default"), 400);
    assert.equal(await width("#nav"), 170);
    assert.equal(await width("#nav-default"), 400);
    assert.equal(await width("#field"), 300, "a field keeps its minimum in a narrower track");

    // Select takes Input's surface and border hooks.
    assert.equal(await style("#select", "background-color"), "rgb(1, 2, 3)");
    assert.equal(await style("#select", "border-top-color"), "rgb(4, 5, 6)");
    await page.locator("#select").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(await style("#select", "border-top-color"), "rgb(7, 8, 9)");

    // Form Field's label and help text.
    assert.equal(await style("#field-label", "color"), "rgb(10, 20, 30)");
    assert.equal(await style("#field-label", "font-size"), "18px");
    assert.equal(await style("#field-help", "color"), "rgb(40, 50, 60)");
    assert.equal(await style("#field-help", "font-size"), "11px");

    // Labels carry the instruction; help stays on the smaller supporting-text step.
    assert.equal(await style("#default-label", "font-size"), "16px");
    assert.equal(await style("#default-help", "font-size"), "14px");
    assert.equal(await style("#default-combobox label", "font-size"), "16px");
    await page.addStyleTag({ content: ":root { --ui-field-label-font-size: var(--ui-font-size-sm); }" });
    assert.equal(await style("#default-label", "font-size"), "14px");
    assert.equal(await style("#default-combobox label", "font-size"), "14px");
    assert.equal(await style("#field-label", "font-size"), "18px", "the instance hook wins over the shared label size");

    // A label kept on one line; unset, a button still wraps as its container does.
    assert.equal(await style("#one-line", "white-space"), "nowrap");
    assert.equal(await style("#wraps", "white-space"), "normal");
    const height = async (selector: string) => (await page.locator(selector).boundingBox())!.height;
    assert.ok(await height("#wraps") > await height("#one-line"), "the unset label wraps in a narrow row");

    // A heading level on Text: its size and weight come from its options, not the browser's.
    assert.equal(await page.locator("#heading").evaluate((element) => element.tagName), "H3");
    assert.equal(await style("#heading", "font-size"), await style(".frame", "font-size"));
    assert.equal(await style("#heading", "font-weight"), await style(".frame", "font-weight"));
    assert.equal(await page.locator("#heading-sized").evaluate((element) => element.tagName), "H2");
    assert.equal(await style("#heading-sized", "font-size"), await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement("i"));
      probe.style.fontSize = "var(--ui-font-size-lg)";
      const size = getComputedStyle(probe).fontSize;
      probe.remove();
      return size;
    }));
    assert.equal(await style("#heading-sized", "font-weight"), "600");
  }

  it("apply from an app class in HTML", async () => {
    const path = await bundle("html-app-hooks", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div class="frame">
        <ui-input id="input" class="narrow-input" aria-label="Amount"></ui-input>
        <ui-input id="input-default" aria-label="Note"></ui-input>
        <ui-select id="select" class="narrow-select" aria-label="Status"><option>Open</option></ui-select>
        <ui-select id="select-default" aria-label="Owner"><option>Ada</option></ui-select>
        <ui-nav-item id="nav" class="narrow-nav">Shipments</ui-nav-item>
        <ui-nav-item id="nav-default">Orders</ui-nav-item>
        <div class="tight"><ui-form-field id="field" class="wide-field">
          <label slot="label" id="field-label" for="name">Name</label>
          <ui-input id="name"></ui-input>
          <p slot="help" id="field-help">As it appears on the invoice.</p>
        </ui-form-field></div>
        <ui-form-field><label id="default-label" slot="label">Name</label><p id="default-help" slot="help">Shown to readers.</p></ui-form-field>
        <ui-combobox id="default-combobox" label="Owner"><option>Ada</option></ui-combobox>
        <div class="tight"><ui-button id="one-line" class="one-line">${label}</ui-button></div>
        <div class="tight"><ui-button id="wraps">${label}</ui-button></div>
        <ui-text id="heading" as="h3">Billing</ui-text>
        <ui-text id="heading-sized" as="h2" size="lg" weight="semibold">Billing</ui-text>
      </div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("apply from an app class in converted output", async () => {
    const path = await bundle("converted-app-hooks", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiCombobox as Combobox, UiFormField as FormField, UiInput as Input, UiNavItem as NavItem, UiSelect as Select, UiText as Text } from "@looma-test/components";
      createScene({
        render: () => sceneNode("div", { class: "frame" }, [
          sceneNode(Input, { id: "input", class: "narrow-input", "aria-label": "Amount" }),
          sceneNode(Input, { id: "input-default", "aria-label": "Note" }),
          sceneNode(Select, { id: "select", class: "narrow-select", "aria-label": "Status" }, () => [sceneNode("option", "Open")]),
          sceneNode(Select, { id: "select-default", "aria-label": "Owner" }, () => [sceneNode("option", "Ada")]),
          sceneNode(NavItem, { id: "nav", class: "narrow-nav" }, () => "Shipments"),
          sceneNode(NavItem, { id: "nav-default" }, () => "Orders"),
          sceneNode("div", { class: "tight" }, [sceneNode(FormField, { id: "field", class: "wide-field" }, {
            label: () => sceneNode("label", { id: "field-label", for: "name" }, "Name"),
            default: () => sceneNode(Input, { id: "name" }),
            help: () => sceneNode("p", { id: "field-help" }, "As it appears on the invoice."),
          })]),
          sceneNode(FormField, {}, { label: () => sceneNode("label", { id: "default-label" }, "Name"), help: () => sceneNode("p", { id: "default-help" }, "Shown to readers.") }),
          sceneNode(Combobox, { id: "default-combobox", label: "Owner" }, () => sceneNode("option", "Ada")),
          sceneNode("div", { class: "tight" }, [sceneNode(Button, { id: "one-line", class: "one-line" }, () => "${label}")]),
          sceneNode("div", { class: "tight" }, [sceneNode(Button, { id: "wraps" }, () => "${label}")]),
          sceneNode(Text, { id: "heading", as: "h3" }, () => "Billing"),
          sceneNode(Text, { id: "heading-sized", as: "h2", size: "lg", weight: "semibold" }, () => "Billing"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
