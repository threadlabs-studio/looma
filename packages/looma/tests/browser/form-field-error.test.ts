import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Form field error", () => {
  it("reads in the danger colour", async () => {
    const path = await bundle("html-field-error", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-form-field invalid>
        <label slot="label" for="name">Name</label>
        <ui-input id="name" name="name"></ui-input>
        <span slot="error" id="message">That name is taken.</span>
      </ui-form-field>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#name:is([component~="ui-input"], [data-component~="ui-input"], .ui-input, [ui-input])');
    const colours = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--ui-danger)";
      document.body.append(probe);
      const danger = getComputedStyle(probe).color;
      probe.remove();
      return { danger, message: getComputedStyle(document.querySelector("#message")!).color };
    });
    assert.equal(colours.message, colours.danger);
    await page.close();
  });

  it("keeps the label-to-control gap when a label action is taller than the label text", async () => {
    const path = await bundle("html-field-label-action", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-grid style="width: 800px">
        <ui-form-field id="plain">
          <label slot="label" for="plain-input">Name</label>
          <ui-input id="plain-input"></ui-input>
        </ui-form-field>
        <ui-form-field id="action">
          <label slot="label" for="action-input">Price</label>
          <ui-icon-button slot="labelAction" id="action-help" label="Help for Price" variant="ghost" size="sm" round><ui-icon name="help"></ui-icon></ui-icon-button>
          <ui-input id="action-input"></ui-input>
        </ui-form-field>
      </ui-grid>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#action-input:is([component~="ui-input"], [data-component~="ui-input"], .ui-input, [ui-input])');
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const gap = (field: string) => box(`#${field} :is([component~="ui-input"], [data-component~="ui-input"], .ui-input, [ui-input])`).top - box(`#${field} label`).bottom;
      return { plain: gap("plain"), action: gap("action"), button: box("#action-help"), label: box("#action label") };
    });
    assert.ok(geometry.button.height > geometry.label.height, "the action is taller than the label text");
    assert.equal(geometry.action, geometry.plain);
    assert.ok(geometry.button.left >= geometry.label.right, "the action follows the label");
    assert.ok(Math.abs((geometry.button.top + geometry.button.bottom) / 2 - (geometry.label.top + geometry.label.bottom) / 2) <= 1, "centred on the label line");
    await page.close();
  });
});
