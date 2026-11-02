import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open, look } from "../renderers/browser-driver";

describe("Theme levels", () => {
  it("applies global, inherited group, and instance values in that order across themes", async () => {
    const path = await bundle("html-theme-levels", `import "@looma-test/runtime";`);
    const body = `
      <style>:root { --ui-radius-md: 12px; --ui-danger: rgb(180, 10, 30); }</style>
      <ui-input id="global-input" aria-label="Global" invalid></ui-input>
      <ui-button id="global-danger" tone="danger" variant="solid">Delete</ui-button>
      <section id="group" style="--ui-field-radius: 3px; --ui-field-danger: rgb(150, 20, 40); --ui-action-radius: 5px; --ui-overlay-radius: 9px; --ui-overlay-surface: rgb(237, 239, 242); --ui-overlay-border: rgb(22, 33, 44); --ui-overlay-shadow: none">
        <ui-input id="group-input" aria-label="Grouped" invalid></ui-input>
        <ui-input id="local-input" aria-label="Local" invalid style="--ui-input-radius: 7px"></ui-input>
        <ui-select id="group-select" aria-label="Grouped select" invalid><option>One</option></ui-select>
        <ui-select id="local-select" aria-label="Local select" invalid style="--ui-select-radius: 6px; --ui-select-invalid-border: rgb(90, 70, 130)"><option>One</option></ui-select>
        <ui-listbox id="group-listbox" aria-label="Grouped listbox" invalid><option>One</option><option>Two</option></ui-listbox>
        <ui-listbox id="local-listbox" aria-label="Local listbox" invalid style="--ui-listbox-radius: 6px; --ui-listbox-invalid-border: rgb(90, 70, 130)"><option>One</option><option>Two</option></ui-listbox>
        <ui-textarea id="group-textarea" aria-label="Grouped textarea" invalid></ui-textarea>
        <ui-form-field id="group-field" invalid><ui-input aria-label="Field input"></ui-input><span slot="error" role="alert" id="field-message">Required</span></ui-form-field>
        <ui-button id="group-button">Save</ui-button>
        <ui-button id="group-danger" tone="danger" variant="solid">Delete</ui-button>
        <ui-icon-button id="group-icon-button" label="More"><ui-icon name="ellipsis"></ui-icon></ui-icon-button>
        <ui-menu id="group-menu"><ui-menu-item value="one">One</ui-menu-item></ui-menu>
        <ui-menu id="local-menu" style="--ui-menu-radius: 4px; --ui-menu-surface: rgb(210, 211, 212); --ui-menu-border: rgb(80, 81, 82); --ui-menu-shadow: none"><ui-menu-item value="two">Two</ui-menu-item></ui-menu>
      </section>`;
    const css = ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file));
    const page = await open(path, body, css);
    await page.waitForSelector('#group-input:is([component~="ui-input"], [data-component~="ui-input"], .ui-input, [ui-input])');
    const look = (selector: string, property: string) => page.locator(selector).evaluate((element, name) => {
      const value = getComputedStyle(element).getPropertyValue(name);
      if (!name.endsWith('color')) return value;
      const context = document.createElement('canvas').getContext('2d')!;
      context.fillStyle = value; context.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
      return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a! / 255})`;
    }, property);

    const hasSurfacePaint = (selector: string, color: string) => page.locator(selector).evaluate((element, expected) => {
      const style = getComputedStyle(element);
      return style.backgroundColor === expected || style.backgroundImage.includes(expected);
    }, color);

    for (const [theme, value] of [["data-theme", "light"], ["data-theme", "dark"], ["data-contrast", "high"]] as const) {
      await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.removeAttribute("data-contrast"); });
      await page.evaluate(([name, setting]) => document.documentElement.setAttribute(name, setting), [theme, value]);
      assert.equal(await look("#global-input", "border-top-left-radius"), "12px", `${value}: global radius`);
      for (const id of ["group-input", "group-select", "group-listbox", "group-textarea"]) {
        assert.equal(await look(`#${id}`, "border-top-left-radius"), "3px", `${value}: ${id} inherits the field radius`);
        assert.equal(await look(`#${id}`, "border-top-color"), "rgb(150, 20, 40)", `${value}: ${id} inherits field danger`);
      }
      assert.equal(await look("#local-input", "border-top-left-radius"), "7px", `${value}: component hook wins`);
      assert.equal(await look("#local-select", "border-top-left-radius"), "6px", `${value}: local select radius wins`);
      assert.equal(await look("#local-select", "border-top-color"), "rgb(90, 70, 130)", `${value}: local select danger wins`);
      assert.equal(await look("#local-listbox", "border-top-left-radius"), "6px", `${value}: local listbox radius wins`);
      assert.equal(await look("#local-listbox", "border-top-color"), "rgb(90, 70, 130)", `${value}: local listbox danger wins`);
      assert.equal(await look("#field-message", "color"), "rgb(150, 20, 40)", `${value}: field message shares danger`);
      for (const id of ["group-button", "group-icon-button"]) {
        assert.equal(await look(`#${id}`, "border-top-left-radius"), "5px", `${value}: ${id} inherits action radius`);
      }
      assert.equal(await look("#group-menu .surface", "border-top-left-radius"), "9px", `${value}: menu inherits overlay radius`);
      assert.equal(await hasSurfacePaint("#group-menu .surface", "rgb(237, 239, 242)"), true, `${value}: menu inherits overlay surface in its material paint`);
      assert.equal(await look("#group-menu .surface", "border-top-color"), "rgb(22, 33, 44)", `${value}: menu inherits overlay border`);
      assert.equal(await look("#group-menu .surface", "box-shadow"), "none", `${value}: menu inherits overlay shadow`);
      assert.equal(await look("#local-menu .surface", "border-top-left-radius"), "4px", `${value}: local menu radius wins`);
      assert.equal(await hasSurfacePaint("#local-menu .surface", "rgb(210, 211, 212)"), true, `${value}: local menu surface wins in its material paint`);
      assert.equal(await look("#local-menu .surface", "border-top-color"), "rgb(80, 81, 82)", `${value}: local menu border wins`);
      assert.equal(await look("#global-danger", "background-color"), await look("#group-danger", "background-color"), `${value}: field danger does not change destructive actions`);
    }
    await page.close();
  });

  it("keeps inherited group values in the generated components", async () => {
    const path = await bundle("converted-theme-levels", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiIcon as Icon, UiIconButton as IconButton, UiInput as Input, UiMenu as Menu, UiMenuItem as MenuItem } from "@looma-test/components";
      createScene({ render: () => sceneNode("section", {
        style: "--ui-field-radius: 3px; --ui-field-danger: rgb(150, 20, 40); --ui-action-radius: 5px; --ui-overlay-radius: 9px",
      }, [
        sceneNode(Input, { id: "field", invalid: true, "aria-label": "Field" }),
        sceneNode(Button, { id: "action" }, () => "Save"),
        sceneNode(IconButton, { id: "icon-action", label: "More" }, () => sceneNode(Icon, { name: "ellipsis" })),
        sceneNode(Menu, { id: "menu" }, () => sceneNode(MenuItem, { value: "one" }, () => "One")),
        sceneNode(Menu, { id: "local-menu", style: "--ui-menu-radius: 4px" }, () => sceneNode(MenuItem, { value: "two" }, () => "Two")),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const look = (selector: string, property: string) => page.locator(selector).evaluate((element, name) =>
      getComputedStyle(element).getPropertyValue(name), property);
    assert.equal(await look("#field", "border-top-left-radius"), "3px");
    assert.equal(await look("#field", "border-top-color"), "rgb(150, 20, 40)");
    assert.equal(await look("#action", "border-top-left-radius"), "5px");
    assert.equal(await look("#icon-action", "border-top-left-radius"), "5px");
    assert.equal(await look("#menu .surface", "border-top-left-radius"), "9px");
    assert.equal(await look("#local-menu .surface", "border-top-left-radius"), "4px");
    await page.close();
  });

  it("applies the global round radius to round controls and status shapes", async () => {
    const path = await bundle("html-round-radius", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-avatar id="avatar" name="Ada Lovelace"></ui-avatar>
      <ui-switch id="switch">Enabled</ui-switch>
      <ui-avatar-group id="avatars" max="1"><ui-avatar name="Ada"></ui-avatar><ui-avatar name="Grace"></ui-avatar></ui-avatar-group>
    `, [join(root, "tokens.css")]);
    await page.addStyleTag({ content: ":root { --ui-radius-round: 6px; }" });
    const radius = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).borderTopLeftRadius);
    assert.equal(await radius("#avatar"), "6px");
    assert.equal(await radius("#switch input"), "6px");
    assert.equal(await radius("#avatars .overflow"), "6px");
    await page.close();
  });
});
