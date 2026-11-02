import { loadFixture } from "../renderers/fixture";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, browser, bundle, open, look } from "../renderers/browser-driver";

describe("Form control sizes", () => {
  for (const adapter of ["html", "converted"] as const) {
    it(`shares field edges and size heights with raised selects and inset text in ${adapter}`, async () => {
      const path = await bundle(`${adapter}-field-surfaces`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiButton as Button, UiInput as Input, UiSelect as Select, UiInputGroup as InputGroup, UiCombobox as Combobox } from "@looma-test/components";
        const size = window.fieldSize;
        createScene({ render: () => sceneNode("div", { id: "fields", style: "display:grid;gap:16px;width:240px;font-family:var(--ui-font-sans)" }, [
          sceneNode(Input, { id: "text", size, value: "Text input", "aria-label": "Name" }),
          sceneNode(Select, { id: "choice", size, "aria-label": "Category" }, () => sceneNode("option", "General")),
          sceneNode(Button, { id: "picker", size, variant: "field", "aria-expanded": false }, () => "Choose color"),
          sceneNode(InputGroup, { id: "group" }, () => sceneNode(Input, { size, value: "Grouped input", "aria-label": "Address" })),
          sceneNode(Combobox, { id: "combo", size, label: "Owner", labelVisibility: "sr-only", placeholder: "Search owner", disclosure: true }, () => sceneNode("option", { value: "ada" }, "Ada")),
        ]) }).mount("#app");
      `);
      for (const touch of [false, true]) for (const size of ["sm", "md", "lg"]) {
        const markup = `
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <div id="fields" style="display:grid;gap:16px;width:240px;font-family:var(--ui-font-sans)">
            <ui-input id="text" value="Text input" aria-label="Name"></ui-input>
            <ui-select id="choice" aria-label="Category"><option>General</option></ui-select>
            <ui-button id="picker" variant="field" aria-expanded="false">Choose color</ui-button>
            <ui-input-group id="group"><ui-input value="Grouped input" aria-label="Address"></ui-input></ui-input-group>
            <ui-combobox id="combo" placeholder="Search owner" label="Owner" label-visibility="sr-only" disclosure><option value="ada">Ada</option></ui-combobox>
          </div>`.replace(/<ui-(input|select|button|combobox) /g, `<ui-$1 size="${size}" `);
        const page = await open(path, adapter === "html" ? markup : '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"></div>', [join(root, "tokens.css"), join(root, "theme-dark.css")], {
          viewport: { width: touch ? 375 : 1024, height: 800 }, hasTouch: touch, isMobile: touch, reducedMotion: "reduce",
        }, page => page.evaluate(size => { (window as unknown as { fieldSize: string }).fieldSize = size; }, size));
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
          const looks = await page.evaluate(() => ["#text", "#choice", "#picker", "#group", "#combo .field"].map(selector => {
            const element = document.querySelector(selector)!;
            const style = getComputedStyle(element);
            return { height: element.getBoundingClientRect().height, border: style.borderTopColor, shadow: style.boxShadow };
          }));
          const expected = size === "lg" ? 48 : size === "sm" ? 32 : 40;
          for (const look of looks) assert.ok(Math.abs(look.height - expected) < .05, `${adapter}/${theme}/${size}/${touch}: ${JSON.stringify(looks)}`);
          for (const look of looks) assert.equal(look.border, looks[0].border, "all fields share their quiet outline");
          assert.match(looks[0].shadow, /inset/, "text input is slightly inset");
          assert.match(looks[3].shadow, /inset/, "grouped text stays inset");
          assert.match(looks[4].shadow, /inset/, "searchable text stays inset");
          for (const look of [looks[1], looks[2]]) {
            assert.notEqual(look.shadow, "none", "selects have a slight resting lift");
            assert.doesNotMatch(look.shadow, /inset/, "selects are raised, not inset");
          }
          if (adapter === "html" && size === "md") if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.locator("#fields").screenshot({ path: join(root, ".test-build", `field-surfaces-${theme}-${touch ? 375 : 1024}.png`) });
          await page.locator("#picker").focus();
          assert.notEqual(await page.locator("#picker").evaluate(element => getComputedStyle(element).boxShadow), looks[2].shadow, "keyboard focus adds a visible halo");
          await page.locator("#picker").evaluate(element => element.setAttribute("aria-expanded", "true"));
          assert.match(await page.locator("#picker").evaluate(element => getComputedStyle(element).boxShadow), /inset/, "an open picker presses inward");
          await page.locator("#picker").evaluate(element => { element.setAttribute("aria-expanded", "false"); element.setAttribute("disabled", ""); });
          assert.equal(await page.locator("#picker").evaluate(element => getComputedStyle(element).boxShadow), "none", "disabled pickers lose their lift");
          await page.locator("#picker").evaluate(element => { element.removeAttribute("disabled"); (element as HTMLElement).blur(); });
        }
        await page.close();
      }
    });
  }
  const sizedRow = (size: "sm" | "lg") => `<div style="display: flex; align-items: flex-start; gap: 8px; inline-size: 1400px">
    <ui-input id="input" size="${size}" aria-label="Search"></ui-input>
    <ui-select id="select" size="${size}" aria-label="Status"><option>Open</option></ui-select>
    <ui-combobox id="combobox" size="${size}" label="Owner" label-visibility="sr-only" disclosure><option value="ada">Ada</option></ui-combobox>
    <ui-combobox id="multiple" size="${size}" label="Tags" label-visibility="sr-only" multiple><option value="a">A</option></ui-combobox>
    <ui-button id="button" size="${size}">Apply</ui-button>
    <ui-checkbox id="checkbox" size="${size}">Mine</ui-checkbox>
    <ui-radio id="radio" size="${size}">Week</ui-radio>
    <ui-switch id="switch" size="${size}">Archived</ui-switch>
  </div>
  <ui-input id="default" aria-label="Default"></ui-input>`;
  const row = sizedRow("sm");
  // Each control's own box, top-aligned, so the row height is each control's and not the row's.
  const measure = (page: Page) => page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const middle = (rect: DOMRect) => rect.top + rect.height / 2;
    const ids = ["input", "select", "combobox", "multiple", "button", "checkbox", "radio", "switch"];
    return {
      heights: Object.fromEntries(ids.map((id) => [id, Math.round(box(`#${id}`).height)])),
      // A field centres its one line of text, so a choice's label shares its baseline when their middles meet.
      labels: ["checkbox", "radio", "switch"].map((id) => Math.abs(Math.round(middle(box(`#${id} .label`)) - middle(box("#input"))))),
      fontSize: getComputedStyle(document.querySelector("#input")!).fontSize,
      labelFontSize: getComputedStyle(document.querySelector("#checkbox .label")!).fontSize,
      defaultHeight: box("#default").height,
      defaultFontSize: getComputedStyle(document.querySelector("#default")!).fontSize,
    };
  });
  const small = { input: 32, select: 32, combobox: 32, multiple: 32, button: 32, checkbox: 32, radio: 32, switch: 32 };

  it("line up small fields, buttons, and choices on one row, and leave md alone", async () => {
    const path = await bundle("html-form-sizes", `import "@looma-test/runtime";`);
    const page = await open(path, row, [join(root, "tokens.css")]);
    await page.waitForSelector('#switch:is([component~="ui-switch"], [data-component~="ui-switch"], .ui-switch, [ui-switch])');
    assert.match((await page.locator("#input").getAttribute("data-ui-input-state")) ?? "", /(^| )size=sm( |$)/);
    assert.match((await page.locator("#checkbox").getAttribute("data-ui-checkbox-state")) ?? "", /(^| )size=sm( |$)/);
    const sizes = await measure(page);
    assert.deepEqual(sizes.heights, small);
    assert.deepEqual(sizes.labels, [0, 0, 0]);
    assert.deepEqual([sizes.fontSize, sizes.labelFontSize], ["14px", "14px"]);
    // md is unchanged: the standard control height and body text.
    assert.ok(sizes.defaultHeight >= 40, `md stays ${sizes.defaultHeight}px`);
    assert.equal(sizes.defaultFontSize, "16px");
    await page.close();
  });

  it("line up large fields, buttons, and choices on one row", async () => {
    const path = await bundle("html-form-sizes-lg", `import "@looma-test/runtime";`);
    const page = await open(path, sizedRow("lg"), [join(root, "tokens.css")]);
    await page.waitForSelector('#switch:is([component~="ui-switch"], [data-component~="ui-switch"], .ui-switch, [ui-switch])');
    assert.match((await page.locator("#radio").getAttribute("data-ui-radio-state")) ?? "", /(^| )size=lg( |$)/);
    const sizes = await measure(page);
    assert.deepEqual(sizes.heights, { input: 48, select: 48, combobox: 48, multiple: 48, button: 48, checkbox: 48, radio: 48, switch: 48 });
    assert.deepEqual(sizes.labels, [0, 0, 0]);
    assert.deepEqual([sizes.fontSize, sizes.labelFontSize], ["16px", "16px"]);
    await page.close();
  });

  it("keep small control geometry on touch, with body-size native field text", async () => {
    const path = await bundle("html-form-sizes-touch", `import "@looma-test/runtime";`);
    const context = await browser.newContext({ hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html><body>${row}</body></html>`);
    await page.addStyleTag({ path: join(root, "tokens.css") });
    await loadFixture(page, path);
    await page.waitForSelector('#switch:is([component~="ui-switch"], [data-component~="ui-switch"], .ui-switch, [ui-switch])');
    assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
    const sizes = await measure(page);
    // Pointer capability does not silently enlarge compact controls.
    assert.deepEqual(sizes.heights, { input: 32, select: 32, combobox: 32, multiple: 32, button: 32, checkbox: 32, radio: 32, switch: 32 });
    assert.deepEqual(sizes.labels, [0, 0, 0]);
    assert.equal(sizes.fontSize, "16px");
    await context.close();
  });

  it("size an input group from its input", async () => {
    const path = await bundle("html-form-sizes-group", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-input-group id="sm"><span slot="prefix">https://</span><ui-input size="sm" aria-label="Site"></ui-input></ui-input-group>
      <ui-input-group id="md"><span slot="prefix">https://</span><ui-input aria-label="Site"></ui-input></ui-input-group>
      <ui-input-group id="lg"><span slot="prefix">https://</span><ui-input size="lg" aria-label="Site"></ui-input></ui-input-group>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#lg :is([component~="ui-input"], [data-component~="ui-input"], .ui-input, [ui-input])');
    const heights = await page.evaluate(() => ["sm", "md", "lg"].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().height)));
    assert.deepEqual(heights, [32, 40, 48]);
    await page.close();
  });

  it("take size as a converted prop", async () => {
    const path = await bundle("converted-form-sizes", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiCheckbox as Checkbox, UiInput as Input, UiSelect as Select } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", { style: "display: flex; align-items: flex-start; gap: 8px" }, [
        sceneNode(Input, { id: "input", size: "sm", "aria-label": "Search" }),
        sceneNode(Select, { id: "select", size: "sm", "aria-label": "Status" }, () => sceneNode("option", "Open")),
        sceneNode(Button, { id: "button", size: "sm" }, () => "Apply"),
        sceneNode(Checkbox, { id: "checkbox", size: "sm" }, () => "Mine"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector("#checkbox");
    assert.match((await page.locator("#input").getAttribute("data-ui-input-state")) ?? "", /(^| )size=sm( |$)/);
    const heights = await page.evaluate(() => ["input", "select", "button", "checkbox"].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().height)));
    assert.deepEqual(heights, [32, 32, 32, 32]);
    await page.close();
  });
});
