import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Component rendering and behavior", () => {
  it("update a bound prop once per choice, though the choice is two events", async () => {
    const path = await bundle("converted-radio-model", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiRadio as Radio, UiRadioGroup as RadioGroup } from "@looma-test/components";
      const choice = createState("open");
      const updates = [];
      window.updates = updates;
      createScene({
        render: () => sceneNode(RadioGroup, {
          id: "access",
          label: "Access",
          value: choice.value,
          "bind:value": (value) => { updates.push(value); choice.value = value; },
        }, () => [
          sceneNode(Radio, { value: "open" }, () => "Open"),
          sceneNode(Radio, { value: "private" }, () => "Private"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);

    // A choice is reported as select and as change; a bound consumer hears it once.
    await page.locator('#access input[value="private"]').click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { updates: string[] }).updates), ["private"]);
    await page.locator('#access input[value="open"]').click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { updates: string[] }).updates), ["private", "open"]);
    await page.close();
  });

  it("name a choice by its label and describe it by its description", async () => {
    const path = await bundle("converted-radio-description", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiRadio as Radio, UiRadioGroup as RadioGroup } from "@looma-test/components";
      createScene({
        render: () => [
          sceneNode(RadioGroup, { label: "Who can open it", value: "open" }, () => [
            sceneNode(Radio, { value: "open" }, { default: () => "Open", description: () => "Everyone on the site can open it." }),
            sceneNode(Radio, { value: "private" }, () => "Private"),
          ]),
        ],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);

    // The description is on its own line and is not part of the name.
    const open_ = page.getByRole("radio", { name: "Open", exact: true });
    await expect.poll(() => open_.count()).toBe(1);
    const description = await open_.evaluate((input) => document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent);
    assert.equal(description, "Everyone on the site can open it.");
    const [label, line] = await page.locator("label", { has: open_ }).evaluate((label) =>
      [".label", ".description"].map((part) => label.querySelector(part)!.getBoundingClientRect().top));
    assert.ok(line > label, "the description sits under the label");
    // A choice with no description shows no empty line.
    await expect.poll(() => page.locator("label", { has: page.getByRole("radio", { name: "Private" }) }).locator(".description").isVisible()).toBe(false);
    await page.close();
  });

  it("frames a multiline textarea and its bottom action in one accessible input group", async () => {
    const path = await bundle("converted-multiline-input-group", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiTextarea as Textarea, UiInputGroup as InputGroup } from "@looma-test/components";
      createScene({ render: () => sceneNode("form", { id: "form" }, [
        sceneNode(InputGroup, { id: "multiline", multiline: true }, {
          default: () => sceneNode(Textarea, { id: "message", name: "message", rows: 3, value: "A draft", "aria-label": "Message" }),
          suffix: () => "Plain text",
          action: () => sceneNode(Button, { id: "send", type: "submit" }, () => "Send"),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    await page.addStyleTag({ content: "* { transition: none !important; }" });
    const group = page.locator("#multiline"), textarea = page.getByRole("textbox", { name: "Message" });
    assert.equal(await textarea.evaluate(element => getComputedStyle(element).borderTopWidth), "0px", "the textarea shares the outer frame");
    const frame = (await group.boundingBox())!, field = (await textarea.boundingBox())!, action = (await page.locator("#send").boundingBox())!;
    assert.ok(action.y >= field.y + field.height, "the action sits below the text");
    assert.ok(action.x >= frame.x && action.x + action.width <= frame.x + frame.width, "the action stays inside the frame");
    await group.locator(".action").click({ position: { x: 2, y: 2 } });
    assert.equal(await textarea.evaluate(element => element === document.activeElement), true, "a press around the action focuses the textarea");
    const focusShadow = await group.evaluate(element => getComputedStyle(element).boxShadow);
    assert.notEqual(focusShadow, "none");
    await textarea.evaluate(element => element.setAttribute("aria-invalid", "true"));
    assert.notEqual(await group.evaluate(element => getComputedStyle(element).boxShadow), focusShadow, "invalid focus reaches the frame");
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await group.evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    await page.emulateMedia({ forcedColors: "none" });
    await textarea.evaluate(element => { element.removeAttribute("aria-invalid"); (element as HTMLTextAreaElement).disabled = true; });
    assert.equal(await group.evaluate(element => getComputedStyle(element).cursor), "not-allowed");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.close();
  });

  it("put an input group's action at its end, inside its border, at the field's height", async () => {
    const path = await bundle("converted-input-group-action", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiInput as Input, UiInputGroup as InputGroup } from "@looma-test/components";
      createScene({
        render: () => [
          sceneNode(InputGroup, { id: "plain" }, { default: () => sceneNode(Input, { "aria-label": "Site" }), suffix: () => ".example.com" }),
          sceneNode(InputGroup, { id: "with-action" }, {
            default: () => sceneNode(Input, { "aria-label": "Site" }),
            suffix: () => ".example.com",
            action: () => sceneNode(Button, { id: "go", size: "sm", variant: "solid" }, () => "Continue"),
          }),
        ],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const box = (selector: string) => page.locator(selector).evaluate((element) => element.getBoundingClientRect().toJSON());
    const plain = await box("#plain");
    const group = await box("#with-action");
    const button = await box("#go");
    assert.equal(group.height, plain.height, "a small action keeps the field's height");
    assert.ok(button.right <= group.right && button.right > group.right - 8, "the action sits at the end, inside the border");
    // Focusing the action does not light the field's focus ring; focusing the input does.
    const shadow = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).boxShadow);
    const resting = await shadow("#with-action");
    await page.locator("#go").focus();
    assert.equal(await shadow("#with-action"), resting, "a focused action leaves the field's ring off");
    await page.locator("#with-action input").focus();
    assert.notEqual(await shadow("#with-action"), resting, "a focused input lights it");
    await page.close();
  });

  it("ring an active avatar, and not another", async () => {
    const path = await bundle("converted-avatar-active", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiAvatar as Avatar, UiAvatarGroup as AvatarGroup } from "@looma-test/components";
      createScene({
        render: () => [sceneNode(AvatarGroup, { label: "On this page" }, () => [
          sceneNode(Avatar, { id: "editing", name: "Ada Lovelace", alt: "Ada Lovelace, editing", active: true }),
          sceneNode(Avatar, { id: "viewing", name: "Grace Hopper", size: "sm" }),
        ]), sceneNode(AvatarGroup, { id: "small", label: "Small", size: "sm", max: 1 }, () => [
          sceneNode(Avatar, { id: "small-first", name: "Ada Lovelace", size: "sm" }),
          sceneNode(Avatar, { id: "small-second", name: "Grace Hopper", size: "sm" }),
        ])],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const outline = (id: string) => page.locator(`#${id}`).evaluate((element) => getComputedStyle(element).outlineStyle);
    assert.equal(await outline("editing"), "solid");
    assert.equal(await outline("viewing"), "none");
    await expect.poll(() => page.locator("#editing").getAttribute("aria-label")).toBe("Ada Lovelace, editing");
    const width = (id: string) => page.locator(`#${id}`).evaluate((element) => element.getBoundingClientRect().width);
    assert.ok(await width("viewing") < await width("editing"), "sm is smaller than md");
    // A small group's +N badge is as small as its avatars.
    const badge = await page.locator("#small").getByRole("img", { name: "1 more" }).evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(Math.round(badge), Math.round(await width("small-first")));
    await page.close();
  });

  it("render, style, and behave with no HTML Next runtime", async () => {
    const path = await bundle("converted-app", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiButton as Button, UiCheckbox as Checkbox, UiTabs as Tabs, UiCombobox as Combobox, UiCallout as Callout, UiStack as Stack, UiInput as Input } from "@looma-test/components";
      import { trackInputModality } from "@threadlabs/looma/components/shared/input-modality.js";
      trackInputModality(document);
      const checked = createState(false);
      const name = createState("Ada");
      window.name_ = name;
      const changes = [];
      window.changes = changes;
      createScene({
        render: () => sceneNode(Stack, { gap: "s" }, () => [
          sceneNode(Button, { id: "save", variant: "solid", class: "consumer" }, () => "Save"),
          sceneNode(Checkbox, { id: "agree", checked: checked.value, onChange: (event) => changes.push(event.detail) }, () => "Agree"),
          sceneNode(Tabs, { id: "tabs", label: "Views" }, () => [
            sceneNode("section", { "aria-label": "One" }, "First"),
            sceneNode("section", { "aria-label": "Two" }, "Second"),
          ]),
          sceneNode(Combobox, { id: "fruit", label: "Fruit" }, () => [
            sceneNode("option", { value: "apple" }, "Apple"),
            sceneNode("option", { value: "pear" }, "Pear"),
          ]),
          sceneNode(Callout, { tone: "warning" }, () => "Careful"),
          sceneNode(Input, { id: "name", value: name.value, "bind:value": (value) => { name.value = value; } }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);

    const button = page.locator("#save");
    assert.equal(await button.evaluate((element) => element.localName), "button");
    assert.equal(await button.evaluate(element => element.classList.contains("consumer")), true);
    await expect.poll(() => button.getAttribute("data-appearance")).toBe("solid");
    await expect.poll(() => button.getAttribute("data-tone")).toBe("neutral");
    assert.notEqual(await button.evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");

    const modality = () => page.evaluate(() => document.documentElement.getAttribute("data-ui-input-modality"));
    assert.equal(await modality(), null);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    assert.equal(await modality(), "touch");

    await page.locator("#agree input").click();
    await expect.poll(() => page.locator("#agree input").isChecked()).toBe(true);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes), [
      { checked: true, value: "on", trigger: "pointer" },
    ]);

    const tabs = page.locator('#tabs [role="tab"]');
    await expect.poll(() => tabs.allTextContents()).toStrictEqual(["One", "Two"]);
    await tabs.nth(1).click();
    await expect.poll(() => tabs.nth(1).getAttribute("aria-selected")).toBe("true");
    await expect.poll(() => page.locator('#tabs section[aria-label="One"]').isHidden()).toBe(true);

    // Two-way binding on a native form-control root.
    await expect.poll(() => page.locator("#name").inputValue()).toBe("Ada");
    await page.locator("#name").fill("Grace");
    assert.equal(await page.evaluate(() => (window as unknown as { name_: { value: string } }).name_.value), "Grace");
    await page.evaluate(() => { (window as unknown as { name_: { value: string } }).name_.value = "Hopper"; });
    await page.waitForFunction(() => (document.querySelector("#name") as HTMLInputElement).value === "Hopper");

    await page.locator("#fruit input").click();
    await page.locator("#fruit input").fill("pe");
    const options = page.locator('#fruit [role="option"]');
    await expect.poll(() => options.allInnerTexts()).toStrictEqual(["Pear"]);
    await options.first().click();
    await expect.poll(() => page.locator("#fruit input").inputValue()).toBe("Pear");
    await page.close();
  });
});
