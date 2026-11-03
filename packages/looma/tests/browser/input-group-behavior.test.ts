import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Input group behavior", () => {
  const long = "a-value-long-enough-to-scroll-inside-a-narrow-field";
  // Each field is an Input in a group, bar #plain; ids name the inner inputs.
  const html = `
    <button id="before">Before</button>
    <form id="form">
      <label id="site-label" for="site">Website</label>
      <ui-input-group id="g-site"><span slot="prefix" class="prefix">https://</span><ui-input id="site" name="site" value="example.com" autocomplete="url" aria-describedby="site-hint" data-testid="site"></ui-input></ui-input-group>
      <p id="site-hint">Your public address.</p>
      <ui-input-group id="g-sub"><ui-input id="sub" name="sub" aria-label="Subdomain" required></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
      <ui-input-group id="g-both"><span slot="prefix" class="prefix">https://</span><ui-input id="both" name="both" aria-label="Both"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
      <ui-input id="plain" name="plain" aria-label="Plain"></ui-input>
    </form>
    <ui-input-group id="g-invalid"><ui-input id="invalid" invalid aria-label="Invalid"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    <ui-input-group id="g-disabled"><ui-input id="disabled" disabled aria-label="Disabled"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    <ui-input-group id="g-readonly"><ui-input id="readonly" readonly value="fixed" aria-label="Read only"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    <ui-input id="plain-invalid" invalid aria-label="Plain invalid"></ui-input>
    <ui-input id="plain-disabled" disabled aria-label="Plain disabled"></ui-input>
    <ui-form-field id="field">
      <label slot="label">Workspace</label>
      <ui-input-group><ui-input id="ff" name="ff"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
      <span slot="help">Letters and hyphens.</span>
    </ui-form-field>
    <div dir="rtl" style="width: 375px">
      <ui-input-group id="g-rtl"><span slot="prefix" class="prefix">https://</span><ui-input id="rtl" aria-label="RTL" value="${long}"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    </div>
    <ui-input-group><ui-input id="auto" aria-label="Autofocus" autofocus></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>`;
  const vue = `
    import { createScene, sceneNode, createState } from "@looma-test/scene";
    import { UiFormField as FormField, UiInput as Input, UiInputGroup as InputGroup } from "@looma-test/components";
    const site = createState("example.com");
    const log = [];
    const siteRef = createState(null);
    Object.assign(window, { site, log, siteRef });
    // Affixes are slots: a prefix and a suffix span beside the Input.
    const affixes = ({ prefix, suffix }) => ({
      ...(prefix ? { prefix: () => sceneNode("span", { class: "prefix" }, prefix) } : {}),
      ...(suffix ? { suffix: () => sceneNode("span", { class: "suffix" }, suffix) } : {}),
    });
    const grouped = (id, text, input) => sceneNode(InputGroup, { id }, { default: () => sceneNode(Input, input), ...affixes(text) });
    createScene({
      render: () => [
        sceneNode("button", { id: "before" }, "Before"),
        sceneNode("form", { id: "form" }, [
          sceneNode("label", { id: "site-label", for: "site" }, "Website"),
          grouped("g-site", { prefix: "https://" }, {
            id: "site", name: "site", value: site.value, "bind:value": (value) => { site.value = value; },
            autocomplete: "url", "aria-describedby": "site-hint", "data-testid": "site", ref: siteRef,
            onInput: () => log.push("input"), onBlur: () => log.push("blur"),
          }),
          sceneNode("p", { id: "site-hint" }, "Your public address."),
          grouped("g-sub", { suffix: ".example.com" }, { id: "sub", name: "sub", "aria-label": "Subdomain", required: true }),
          grouped("g-both", { prefix: "https://", suffix: ".example.com" }, { id: "both", name: "both", "aria-label": "Both" }),
          sceneNode(Input, { id: "plain", name: "plain", "aria-label": "Plain" }),
        ]),
        grouped("g-invalid", { suffix: ".example.com" }, { id: "invalid", invalid: true, "aria-label": "Invalid" }),
        grouped("g-disabled", { suffix: ".example.com" }, { id: "disabled", disabled: true, "aria-label": "Disabled" }),
        grouped("g-readonly", { suffix: ".example.com" }, { id: "readonly", readonly: true, value: "fixed", "aria-label": "Read only" }),
        sceneNode(Input, { id: "plain-invalid", invalid: true, "aria-label": "Plain invalid" }),
        sceneNode(Input, { id: "plain-disabled", disabled: true, "aria-label": "Plain disabled" }),
        sceneNode(FormField, { id: "field" }, {
          label: () => sceneNode("label", "Workspace"),
          default: () => grouped(undefined, { suffix: ".example.com" }, { id: "ff", name: "ff" }),
          help: () => sceneNode("span", "Letters and hyphens."),
        }),
        sceneNode("div", { dir: "rtl", style: "width: 375px" }, [
          grouped("g-rtl", { prefix: "https://", suffix: ".example.com" }, { id: "rtl", "aria-label": "RTL", value: ${JSON.stringify(long)} }),
        ]),
        grouped(undefined, { suffix: ".example.com" }, { id: "auto", "aria-label": "Autofocus", autofocus: true }),
      ],
    }).mount("#app");
  `;

  const style = (page: Page, selector: string, property: string) =>
    page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
  const active = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "");
  const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
  const entries = (page: Page) => page.locator("#form").evaluate((form) =>
    Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));

  // The accessibility tree Chromium gives assistive technology: each textbox's name and description.
  async function textboxes(page: Page) {
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    await client.detach();
    return Object.fromEntries(nodes
      .filter((node) => node.role?.value === "textbox" && !node.ignored)
      .map((node) => [String(node.name?.value ?? ""), String(node.description?.value ?? "")]));
  }

  async function checkInputGroup(page: Page) {
    await page.waitForFunction(() => document.querySelector("#ff")?.getAttribute("aria-describedby")?.split(" ").length === 2, undefined, { timeout: 3000 })
      .catch(async () => assert.fail(await page.locator("#field").evaluate((element) => element.outerHTML)));
    assert.equal(await active(page), "auto", "autofocus lands on the inner input");

    // Without an affix, Input is the bare native input it always was.
    assert.equal(await page.locator("#plain").evaluate((element) => `${element.localName} in ${element.parentElement?.id}`), "input in form");
    assert.equal(await style(page, "#plain", "border-top-width"), "1px");

    // One box: the group draws the Input's border, and the input inside draws none.
    assert.equal(await style(page, "#g-site", "border-top-width"), "1px");
    assert.equal(await style(page, "#g-site", "border-top-color"), await style(page, "#plain", "border-top-color"));
    assert.equal(await style(page, "#g-site", "border-radius"), await style(page, "#plain", "border-radius"));
    assert.equal(await style(page, "#g-site", "background-color"), await style(page, "#plain", "background-color"));
    assert.equal(await style(page, "#site", "background-color"), "rgba(0, 0, 0, 0)");
    assert.equal((await box(page, "#g-site")).height, (await box(page, "#plain")).height, "the group is an Input's height");

    // Attributes land on the inner input; FormData holds its value, never an affix.
    const site = page.locator("#site");
    assert.equal(await site.evaluate((element) => element.localName), "input");
    await expect.poll(() => site.getAttribute("autocomplete")).toBe("url");
    await expect.poll(() => site.getAttribute("data-testid")).toBe("site");
    assert.equal(await page.locator("#sub").evaluate((element) => (element as HTMLInputElement).required), true);
    assert.deepEqual(await entries(page), [["site", "example.com"], ["sub", ""], ["both", ""], ["plain", ""]]);
    await page.locator("#sub").fill("my-team");
    assert.deepEqual(await entries(page), [["site", "example.com"], ["sub", "my-team"], ["both", ""], ["plain", ""]]);

    // The name stays the label; the affix is the description, before the consumer's own and a Form Field's help.
    const tree = await textboxes(page);
    assert.equal(tree["Website"], "https:// Your public address.");
    assert.equal(tree["Subdomain"], ".example.com");
    assert.equal(tree["Both"], "https:// .example.com");
    assert.equal(tree["Workspace"], ".example.com Letters and hyphens.");
    assert.equal(tree["Plain"], "");
    await expect.poll(() => page.locator("#g-site .affix").first().getAttribute("aria-hidden")).toBe("true");

    // Exactly one tab stop per field, the inner input, in DOM order both ways.
    await expect.poll(() => page.locator(":is([component~='ui-input-group'], [data-component~='ui-input-group'], .ui-input-group, [ui-input-group])[tabindex], :is([component~='ui-input-group'], [data-component~='ui-input-group'], .ui-input-group, [ui-input-group]) span[tabindex]").count()).toBe(0);
    await page.locator("#before").focus();
    const forward = [];
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("Tab");
      forward.push(await active(page));
    }
    assert.deepEqual(forward, ["site", "sub", "both", "plain"]);
    const backward = [];
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("Shift+Tab");
      backward.push(await active(page));
    }
    assert.deepEqual(backward, ["both", "sub", "site", "before"]);

    // The ring is the plain Input's, shown when the inner input is focus-visible, by keyboard or pointer.
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await active(page), "plain");
    await page.waitForTimeout(250);
    const ring = { border: await style(page, "#plain", "border-top-color"), shadow: await style(page, "#plain", "box-shadow") };
    await page.locator("#site").click();
    await page.waitForTimeout(250);
    assert.deepEqual({ border: await style(page, "#g-site", "border-top-color"), shadow: await style(page, "#g-site", "box-shadow") }, ring);
    assert.equal(await style(page, "#site", "outline-style"), "none");
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await style(page, "#g-site", "outline-style"), "solid");
    assert.equal(await style(page, "#g-site", "outline-width"), "2px");
    await page.locator("#plain").focus();
    assert.equal(await style(page, "#plain", "outline-style"), "solid");
    await page.emulateMedia({ forcedColors: "none" });

    // Hover matches the plain Input's.
    await page.locator("#before").focus();
    await page.locator("#plain").hover();
    await page.waitForTimeout(250);
    const hover = await style(page, "#plain", "border-top-color");
    await page.locator("#g-sub .suffix").hover();
    await page.waitForTimeout(250);
    assert.equal(await style(page, "#g-sub", "border-top-color"), hover);

    // A click on an affix focuses the input, selects nothing, and leaves a focused input's caret alone.
    await page.locator("#before").focus();
    await page.locator("#g-both .prefix").click();
    assert.equal(await active(page), "both");
    await page.locator("#both").fill("docs");
    await page.locator("#both").evaluate((input) => (input as HTMLInputElement).setSelectionRange(2, 2));
    await page.locator("#g-both .suffix").click();
    assert.equal(await active(page), "both");
    assert.deepEqual(await page.locator("#both").evaluate((input) => [(input as HTMLInputElement).selectionStart, (input as HTMLInputElement).selectionEnd]), [2, 2]);
    await page.locator("#g-both .suffix").dblclick();
    assert.equal(await page.evaluate(() => window.getSelection()?.toString() ?? ""), "");
    await expect.poll(() => page.locator("#both").inputValue()).toBe("docs");
    await page.locator("#before").focus();
    await page.locator("#g-sub .suffix").tap();
    assert.equal(await active(page), "sub", "a tap focuses the input too");

    // Labels target the inner input, from outside and from a Form Field.
    await page.locator("#before").focus();
    await page.locator("#site-label").click();
    assert.equal(await active(page), "site");
    await page.locator("#field label").click();
    assert.equal(await active(page), "ff");
    await page.locator("#site").evaluate((input) => (input as HTMLInputElement).blur());
    await page.locator("#site").evaluate((input) => (input as HTMLInputElement).focus());
    assert.equal(await active(page), "site");

    // Paste and composed text act on the inner input.
    await page.locator("#sub").fill("");
    await page.locator("#plain").fill("pasted");
    await page.locator("#plain").selectText();
    await page.keyboard.press("ControlOrMeta+C");
    await page.locator("#plain").fill("");
    await page.locator("#sub").focus();
    await page.keyboard.press("ControlOrMeta+V");
    await page.keyboard.insertText("-text");
    await expect.poll(() => page.locator("#sub").inputValue()).toBe("pasted-text");

    // Invalid, disabled, and read-only look and behave as a plain Input's.
    assert.equal(await style(page, "#g-invalid", "border-top-color"), await style(page, "#plain-invalid", "border-top-color"));
    assert.equal(await style(page, "#g-disabled", "background-color"), await style(page, "#plain-disabled", "background-color"));
    assert.equal(await style(page, "#g-disabled", "cursor"), "not-allowed");
    await page.locator("#before").focus();
    await page.locator("#g-disabled .suffix").click({ force: true });
    assert.equal(await active(page), "before");
    await page.locator("#g-readonly .suffix").click();
    assert.equal(await active(page), "readonly");
    await page.keyboard.type("x");
    await expect.poll(() => page.locator("#readonly").inputValue()).toBe("fixed");

    // At 375px, right to left: the prefix leads on the right, both affixes stay in the box, and the
    // long value scrolls inside the input.
    const [group, prefix, input, suffix] = await Promise.all(
      ["#g-rtl", "#g-rtl .prefix", "#rtl", "#g-rtl .suffix"].map((selector) => box(page, selector)));
    assert.ok(prefix.x > input.x && input.x > suffix.x, "prefix, input, suffix run right to left");
    assert.ok(suffix.x >= group.x && prefix.x + prefix.width <= group.x + group.width, "the affixes stay in the box");
    assert.equal(group.width, 375);
    assert.ok(await page.locator("#rtl").evaluate((element) => element.scrollWidth > element.clientWidth), "the value scrolls");
  }

  const touch = { hasTouch: true };

  it("focuses, describes, and submits like a lone Input, in HTML", async () => {
    const path = await bundle("html-input-group-behavior", `import "@looma-test/runtime";`);
    const page = await open(path, html, [join(root, "tokens.css")], touch);
    await checkInputGroup(page);
    await page.close();
  });

  it("focuses, describes, and submits like a lone Input, in converted output", async () => {
    const path = await bundle("converted-input-group-behavior", vue);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")], touch);
    await checkInputGroup(page);

    // v-model, listeners, and a template ref reach the inner input.
    type Window = { site: { value: string }; log: string[]; siteRef: { value: HTMLInputElement } };
    await page.locator("#site").fill("docs.example.com");
    await page.locator("#before").focus();
    assert.equal(await page.evaluate(() => (window as unknown as Window).site.value), "docs.example.com");
    assert.deepEqual([...new Set(await page.evaluate(() => (window as unknown as Window).log))].sort(), ["blur", "input"]);
    await page.evaluate(() => (window as unknown as Window).siteRef.value.focus());
    assert.equal(await active(page), "site");
    await page.close();
  });
});
