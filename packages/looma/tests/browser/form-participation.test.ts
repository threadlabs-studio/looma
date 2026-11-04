import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

// Every Looma control that can carry a name sits in a real form here, in HTML and in converted output, and is
// used the way a person would use it. The form's own FormData is the contract: what a submit sends.
// tools/scripts/form-participation-rule.test.mjs fails if a named control is missing from this block.
describe("Form participation", () => {
  const options = (values: readonly [string, string][]) => values.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const fruit = options([["apple", "Apple"], ["pear", "Pear"]]);
  const tags = options([["alpha", "Alpha"], ["beta", "Beta"]]);
  const topics = options([["problem", "Problem"], ["help", "Help"]]);
  const html = `
    <form id="form">
      <ui-input id="title" name="title" value="Draft"></ui-input>
      <ui-date-field id="due-date" name="due" value="2026-10-30" locale="en-GB" label="Due date"></ui-date-field>
      <ui-date-picker id="appointment" name="appointment" value="2026-10-30" today="2026-10-30" locale="en-GB" label="Appointment"></ui-date-picker>
      <ui-date-picker name="off-date-picker" value="2026-10-30" disabled></ui-date-picker>
      <ui-date-range-picker id="period" value='{"start":"2026-10-10","end":"2026-10-15"}' start-name="period-start" end-name="period-end" today="2026-10-30" locale="en-GB"></ui-date-range-picker>
      <ui-date-range-picker value='{"start":"2026-10-10","end":"2026-10-15"}' start-name="off-start" end-name="off-end" disabled></ui-date-range-picker>
      <ui-time-field id="opening-time" name="opening" value="09:30" label="Opening time"></ui-time-field>
      <ui-time-picker id="closing-time" name="closing" value="16:15" locale="en-GB" label="Closing time"></ui-time-picker>
      <ui-time-picker name="off-time-picker" value="16:15" disabled></ui-time-picker>
      <ui-file-input name="attachment" label="Attachments"></ui-file-input>
      <ui-number-input id="distance" name="distance" value="42px" unit="px" label="Distance"></ui-number-input>
      <ui-number-input name="off-number" value="99" disabled></ui-number-input>
      <ui-slider id="progress" name="progress" value="25" label="Progress"></ui-slider>
      <ui-slider name="off-slider" value="75" disabled></ui-slider>
      <ui-input name="off-input" value="Hidden" disabled></ui-input>
      <ui-color-picker id="brand-colour" name="brand-colour" value="#7c3aed" label="Brand colour"></ui-color-picker>
      <ui-color-picker name="off-colour" disabled value="#ff0000" label="Disabled colour"></ui-color-picker>
      <ui-input-group><span slot="prefix">https://</span><ui-input id="site" name="site" value="docs"></ui-input><span slot="suffix">.example.com</span></ui-input-group>
      <ui-textarea id="body" name="body" value="Hello"></ui-textarea>
      <ui-select id="topic" name="topic" value="help">${topics}</ui-select>
      <ui-listbox id="regions" name="regions" rows="3" multiple values='["north","west"]'><option value="north">North</option><option value="south">South</option><option value="west">West</option></ui-listbox>
      <ui-checkbox id="agree" name="agree" value="yes">Agree</ui-checkbox>
      <ui-checkbox id="news" name="news" value="weekly" checked>News</ui-checkbox>
      <ui-checkbox name="unticked">Unticked</ui-checkbox>
      <ui-checkbox name="off-check" checked disabled>Off</ui-checkbox>
      <ui-switch id="alerts" name="alerts" value="push">Alerts</ui-switch>
      <ui-switch name="off-switch" checked disabled>Off</ui-switch>
      <ui-radio-group id="size" name="size" value="m" label="Size">
        <ui-radio value="s">Small</ui-radio><ui-radio value="m">Medium</ui-radio><ui-radio id="size-l" value="l" disabled>Large</ui-radio>
      </ui-radio-group>
      <ui-radio-group name="off-group" value="a" label="Off" disabled><ui-radio value="a">A</ui-radio></ui-radio-group>
      <ui-segmented-control id="status" name="status" label="Status" value="active" items='[{value:"active",label:"Active"},{value:"archived",label:"Archived"}]'></ui-segmented-control>
      <ui-segmented-control name="off-status" label="Off status" value="active" disabled items='[{value:"active",label:"Active"}]'></ui-segmented-control>
      <ui-radio id="free" name="plan" value="free">Free</ui-radio>
      <ui-radio name="plan" value="pro" checked>Pro</ui-radio>
      <ui-radio-group id="color" name="color" value="blue" label="Color"><ui-swatch tone="neutral"></ui-swatch><ui-swatch tone="blue"></ui-swatch></ui-radio-group>
      <ui-combobox id="fruit" name="fruit" label="Fruit">${fruit}</ui-combobox>
      <ui-combobox id="tags" name="tags" label="Tags" multiple>${tags}</ui-combobox>
      <ui-combobox id="city" name="city" label="City" allow-free-text></ui-combobox>
      <ui-combobox name="country" label="Country" value="no" readonly><option value="no">Norway</option></ui-combobox>
      <ui-combobox name="off-combo" label="Off" value="apple" disabled>${fruit}</ui-combobox>
      <ui-editable id="note" value="Inline"></ui-editable>
      <ui-editor label="Document" editable="false"></ui-editor>
      <ui-compact-editor label="Comment"></ui-compact-editor>
      <ui-segmented-control id="external-status" name="external-status" form="rules" label="External status" value="active" items='[{value:"active",label:"Active"},{value:"archived",label:"Archived"}]'></ui-segmented-control>
      <ui-radio-group name="external-palette" form="rules" value="blue" label="External palette"><ui-swatch tone="blue"></ui-swatch><ui-swatch tone="green"></ui-swatch></ui-radio-group>
    </form>
    <form id="rules">
      <ui-radio-group id="req-group" name="req" label="Required" required><ui-radio value="x">X</ui-radio><ui-radio value="y">Y</ui-radio></ui-radio-group>
      <ui-combobox id="req-tags" name="req-tags" label="Required tags" multiple required>${tags}</ui-combobox>
    </form>
  `;
  const vue = `
    import { createScene, sceneNode } from "@looma-test/scene";
    import { UiCalendar as Calendar, UiDateField as DateField, UiDatePicker as DatePicker, UiDateRangePicker as DateRangePicker, UiFileInput as FileInput, UiTimeField as TimeField, UiTimePicker as TimePicker, UiEditor as Editor, UiCompactEditor as CompactEditor, UiCheckbox as Checkbox, UiColorPicker as ColorPicker, UiCombobox as Combobox, UiEditable as Editable, UiInput as Input, UiInputGroup as InputGroup, UiListbox as Listbox, UiNumberInput as NumberInput, UiSlider as Slider, UiRadio as Radio, UiRadioGroup as RadioGroup, UiSegmentedControl as SegmentedControl, UiSelect as Select, UiSwatch as Swatch, UiSwitch as Switch, UiTextarea as Textarea } from "@looma-test/components";
    const list = (pairs) => () => pairs.map(([value, label]) => sceneNode("option", { value }, label));
    const fruit = list([["apple", "Apple"], ["pear", "Pear"]]);
    const tags = list([["alpha", "Alpha"], ["beta", "Beta"]]);
    const text = (value) => () => value;
    createScene({
      render: () => sceneNode("div", [
        sceneNode("form", { id: "form" }, [
          sceneNode(Input, { id: "title", name: "title", value: "Draft" }),
          sceneNode(DateField, { id: "due-date", name: "due", value: "2026-10-30", locale: "en-GB", label: "Due date" }),
          sceneNode(DatePicker, { id: "appointment", name: "appointment", value: "2026-10-30", today: "2026-10-30", locale: "en-GB", label: "Appointment" }),
          sceneNode(DatePicker, { name: "off-date-picker", value: "2026-10-30", disabled: true }),
          sceneNode(DateRangePicker, { id: "period", value: { start: "2026-10-10", end: "2026-10-15" }, startName: "period-start", endName: "period-end", today: "2026-10-30", locale: "en-GB" }),
          sceneNode(DateRangePicker, { value: { start: "2026-10-10", end: "2026-10-15" }, startName: "off-start", endName: "off-end", disabled: true }),
          sceneNode(TimeField, { id: "opening-time", name: "opening", value: "09:30", label: "Opening time" }),
          sceneNode(TimePicker, { id: "closing-time", name: "closing", value: "16:15", locale: "en-GB", label: "Closing time" }),
          sceneNode(TimePicker, { name: "off-time-picker", value: "16:15", disabled: true }),
          sceneNode(FileInput, { name: "attachment", label: "Attachments" }),
          sceneNode(NumberInput, { id: "distance", name: "distance", value: "42px", unit: "px", label: "Distance" }),
          sceneNode(NumberInput, { name: "off-number", value: "99", disabled: true }),
          sceneNode(Slider, { id: "progress", name: "progress", value: 25, label: "Progress" }),
          sceneNode(Slider, { name: "off-slider", value: 75, disabled: true }),
          sceneNode(Input, { name: "off-input", value: "Hidden", disabled: true }),
          sceneNode(ColorPicker, {id:"brand-colour",name:"brand-colour",value:"#7c3aed",label:"Brand colour"}),
          sceneNode(ColorPicker, {name:"off-colour",disabled:true,value:"#ff0000",label:"Disabled colour"}),
          sceneNode(InputGroup, null, { prefix: text("https://"), default: () => sceneNode(Input, { id: "site", name: "site", value: "docs" }), suffix: text(".example.com") }),
          sceneNode(Textarea, { id: "body", name: "body", value: "Hello" }),
          sceneNode(Select, { id: "topic", name: "topic", value: "help" }, list([["problem", "Problem"], ["help", "Help"]])),
          sceneNode(Listbox, { id: "regions", name: "regions", rows: 3, multiple: true, values: ["north", "west"] }, list([["north", "North"], ["south", "South"], ["west", "West"]])),
          sceneNode(Checkbox, { id: "agree", name: "agree", value: "yes" }, text("Agree")),
          sceneNode(Checkbox, { id: "news", name: "news", value: "weekly", checked: true }, text("News")),
          sceneNode(Checkbox, { name: "unticked" }, text("Unticked")),
          sceneNode(Checkbox, { name: "off-check", checked: true, disabled: true }, text("Off")),
          sceneNode(Switch, { id: "alerts", name: "alerts", value: "push" }, text("Alerts")),
          sceneNode(Switch, { name: "off-switch", checked: true, disabled: true }, text("Off")),
          sceneNode(RadioGroup, { id: "size", name: "size", value: "m", label: "Size" }, () => [
            sceneNode(Radio, { value: "s" }, text("Small")), sceneNode(Radio, { value: "m" }, text("Medium")), sceneNode(Radio, { id: "size-l", value: "l", disabled: true }, text("Large")),
          ]),
          sceneNode(RadioGroup, { name: "off-group", value: "a", label: "Off", disabled: true }, () => [sceneNode(Radio, { value: "a" }, text("A"))]),
          sceneNode(SegmentedControl, { id: "status", name: "status", label: "Status", value: "active", items: [{value:"active",label:"Active"},{value:"archived",label:"Archived"}] }),
          sceneNode(SegmentedControl, { name: "off-status", label: "Off status", value: "active", disabled: true, items: [{value:"active",label:"Active"}] }),
          sceneNode(Radio, { id: "free", name: "plan", value: "free" }, text("Free")),
          sceneNode(Radio, { name: "plan", value: "pro", checked: true }, text("Pro")),
          sceneNode(RadioGroup, { id: "color", name: "color", value: "blue", label: "Color" }, () => [sceneNode(Swatch, { tone: "neutral" }), sceneNode(Swatch, { tone: "blue" })]),
          sceneNode(Combobox, { id: "fruit", name: "fruit", label: "Fruit" }, fruit),
          sceneNode(Combobox, { id: "tags", name: "tags", label: "Tags", multiple: true }, tags),
          sceneNode(Combobox, { id: "city", name: "city", label: "City", allowFreeText: true }),
          sceneNode(Combobox, { name: "country", label: "Country", value: "no", readonly: true }, list([["no", "Norway"]])),
          sceneNode(Combobox, { name: "off-combo", label: "Off", value: "apple", disabled: true }, fruit),
          sceneNode(Editable, { id: "note", value: "Inline" }),
          sceneNode(Editor, { label: "Document", editable: false }),
          sceneNode(CompactEditor, { label: "Comment" }),
          sceneNode(SegmentedControl, { id: "external-status", name: "external-status", form: "rules", label: "External status", value: "active", items: [{value:"active",label:"Active"},{value:"archived",label:"Archived"}] }),
          sceneNode(RadioGroup, { name: "external-palette", form: "rules", value: "blue", label: "External palette" }, () => [sceneNode(Swatch, { tone: "blue" }), sceneNode(Swatch, { tone: "green" })]),
        ]),
        sceneNode("form", { id: "rules" }, [
          sceneNode(RadioGroup, { id: "req-group", name: "req", label: "Required", required: true }, () => [sceneNode(Radio, { value: "x" }, text("X")), sceneNode(Radio, { value: "y" }, text("Y"))]),
          sceneNode(Combobox, { id: "req-tags", name: "req-tags", label: "Required tags", multiple: true, required: true }, tags),
        ]),
      ]),
    }).mount("#app");
  `;

  // Defaults: unchecked boxes, disabled controls, the multiple combobox with nothing chosen, and the
  // in-place editor (which has no form value by design) send nothing.
  const initial = [
    ["title", "Draft"], ["due", "2026-10-30"], ["appointment", "2026-10-30"], ["period-start", "2026-10-10"], ["period-end", "2026-10-15"], ["opening", "09:30"], ["closing", "16:15"], ["attachment", "[object File]"], ["distance", "42px"], ["progress", "25"], ["brand-colour", "#7c3aed"], ["site", "docs"], ["body", "Hello"], ["topic", "help"], ["regions", "north"], ["regions", "west"], ["news", "weekly"], ["size", "m"], ["status", "active"], ["plan", "pro"],
    ["color", "blue"], ["fruit", ""], ["city", ""], ["country", "no"],
  ];
  const chosen = [
    ["title", "Final"], ["due", "2026-11-02"], ["appointment", "2026-11-02"], ["period-start", "2026-10-12"], ["period-end", "2026-10-17"], ["opening", "10:45"], ["closing", "17:45"], ["attachment", "[object File]"], ["distance", "35px"], ["progress", "100"], ["brand-colour", "#123456"], ["site", "wiki"], ["body", "Hi there"], ["topic", "problem"], ["regions", "south"], ["agree", "yes"], ["alerts", "push"], ["size", "s"], ["status", "archived"],
    ["plan", "free"], ["color", "neutral"], ["fruit", "pear"], ["tags", "alpha"], ["tags", "beta"], ["city", "Oslo"], ["country", "no"],
  ];
  const entries = (page: Page, form = "#form") => page.locator(form).evaluate((element) =>
    Array.from(new FormData(element as HTMLFormElement), ([name, value]) => [name, String(value)]));
  // Some controls resync after the browser's own reset, so the entries are given a moment to settle.
  const settles = async (page: Page, expected: string[][]) => {
    await page.waitForFunction((want) => {
      const got = Array.from(new FormData(document.querySelector("#form") as HTMLFormElement), ([name, value]) => [name, String(value)]);
      return JSON.stringify(got) === JSON.stringify(want);
    }, expected, { timeout: 2000 }).catch(() => undefined);
    assert.deepEqual(await entries(page), expected);
  };
  const pick = async (page: Page, id: string, typed: string) => {
    await page.locator(`#${id} input[role="combobox"]`).click();
    await page.locator(`#${id} input[role="combobox"]`).fill(typed);
    await page.locator(`#${id} [role="option"]`).filter({ hasText: typed }).first().click();
  };

  const exercise = async (page: Page) => {
    await page.waitForSelector('#req-tags:is([component~="ui-combobox"], [data-component~="ui-combobox"], .ui-combobox, [ui-combobox]) input[role="combobox"]');
    assert.deepEqual(await entries(page), initial);
    assert.deepEqual(await entries(page, "#rules"), [["external-status", "active"], ["external-palette", "blue"]]);

    await page.locator("#title").fill("Final");
    await page.locator('#distance input').fill('42px / 1.2');
    await page.locator('#distance input').press('Enter');
    await page.locator('#due-date [data-date-editor]').fill('02/11/2026');
    await page.locator('#due-date [data-date-editor]').press('Enter');
    await page.locator('#appointment [data-picker-field] [data-date-editor]').fill('02/11/2026');
    await page.locator('#appointment [data-picker-field] [data-date-editor]').press('Enter');
    await page.locator('#period [data-range-field="start"] [data-date-editor]').fill('12/10/2026');
    await page.locator('#period [data-range-field="start"] [data-date-editor]').press('Enter');
    await page.locator('#period [data-range-field="end"] [data-date-editor]').fill('17/10/2026');
    await page.locator('#period [data-range-field="end"] [data-date-editor]').press('Enter');
    await page.locator('#opening-time [data-date-editor]').fill('10:45');
    await page.locator('#opening-time [data-date-editor]').press('Enter');
    await page.locator('#closing-time [data-date-editor]').fill('17:45');
    await page.locator('#closing-time [data-date-editor]').press('Enter');
    await page.locator('#progress input[type="range"]').press('End');
    await page.getByRole("button", { name: "Brand colour", exact: true }).click();
    await page.locator('#brand-colour input[aria-label="Hex colour"]').fill('#123456');
    await page.locator('#brand-colour input[aria-label="Hex colour"]').press('Escape');
    await page.locator("#site").fill("wiki");
    await page.locator("#body").fill("Hi there");
    await page.locator("#topic").selectOption("problem");
    await page.locator('#regions [data-index="0"]').click();
    await page.locator('#regions [data-index="2"]').click();
    await page.locator('#regions [data-index="1"]').click();
    await page.locator("#agree input").check();
    await page.locator("#news input").uncheck();
    await page.locator("#alerts input").check();
    await page.locator('#size input[value="s"]').check();
    await page.locator("#status").getByText("Archived", {exact:true}).click();
    await page.locator("#external-status").getByText("Archived", {exact:true}).click();
    await page.locator("#free input").check();
    await page.locator('#color input[value="neutral"]').check();
    await pick(page, "fruit", "Pear");
    await page.locator("#note .preview").click();
    await pick(page, "tags", "Alpha");
    await pick(page, "tags", "Beta");
    await page.locator('#city input[role="combobox"]').fill("Oslo");
    await page.locator("#title").focus();
    await expect.poll(() => page.locator('#fruit input[role="combobox"]').inputValue(), { message: "the field shows the label" }).toBe("Pear");
    assert.deepEqual(await entries(page), chosen);
    // A radio its author disabled stays disabled inside an enabled group.
    await expect.poll(() => page.locator("#size-l input").isDisabled()).toBe(true);

    await page.locator("#form").evaluate((form) => (form as HTMLFormElement).reset());
    await settles(page, initial);
    assert.equal(await page.locator('#brand-colour .colour').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(124, 58, 237)');
    await expect.poll(() => page.locator("#agree input").isChecked()).toBe(false);
    await expect.poll(() => page.locator("#news input").isChecked()).toBe(true);
    await expect.poll(() => page.locator('#fruit input[role="combobox"]').inputValue()).toBe("");
    await expect.poll(() => page.locator("#tags .item").count()).toBe(0);

    // A required group is required to assistive technology and to the form's own validation, and a
    // required multiple combobox is satisfied by its chosen items, not by text left in its input.
    const valid = () => page.locator("#rules").evaluate((form) => (form as HTMLFormElement).checkValidity());
    await expect.poll(() => page.locator('#req-group [role="radiogroup"], #req-group[role="radiogroup"]').first().getAttribute("aria-required")).toBe("true");
    assert.deepEqual(await page.locator("#req-group input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).required)), [true, true]);
    assert.equal(await valid(), false);
    await page.locator('#req-group input[value="y"]').check();
    await pick(page, "req-tags", "Alpha");
    await page.locator("#title").focus();
    assert.equal(await valid(), true);
    assert.deepEqual(await entries(page, "#rules"), [["external-status", "archived"], ["external-palette", "blue"], ["req", "y"], ["req-tags", "alpha"]]);
  };

  it("submits each HTML control's value, leaves out what a native control would, and resets", async () => {
    const path = await bundle("html-form", `import "@looma-test/runtime";`);
    const page = await open(path, html, [join(root, "tokens.css")]);
    await exercise(page);
    await page.close();
  });

  it("submits the same entries from the converted components", async () => {
    const path = await bundle("converted-form-participation", vue);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await exercise(page);
    await page.close();
  });
});
