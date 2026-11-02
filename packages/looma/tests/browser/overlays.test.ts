import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Overlays", () => {
  it("show search focus and close a dismissible search shell on the first Escape, even from its search field", async () => {
    const path = await bundle("converted-search-shell", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiSearchShell as SearchShell } from "@looma-test/components";
      const open = createState(true);
      const closes = [];
      window.closes = closes;
      createScene({
        render: () => sceneNode(SearchShell, {
          id: "search", open: open.value, modal: true, dismissible: true, label: "Search",
          onClose: (event) => { closes.push(event.detail); open.value = false; },
        }, { search: () => sceneNode("input", { id: "query", type: "search", "aria-label": "Search" }) }),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const field = page.locator("#query");
    await field.fill("wel");
    assert.equal(await field.evaluate((element) => element === document.activeElement), true);
    assert.notEqual(await field.evaluate((element) => getComputedStyle(element).outlineStyle), "none", "the search field shows focus");
    await page.keyboard.press("Escape");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { closes: unknown[] }).closes), [
      { open: false, reason: "escape", trigger: "keyboard" },
    ]);
    assert.equal(await page.locator("#search dialog").evaluate((dialog) => (dialog as HTMLDialogElement).open), false);
    await page.close();
  });
  it("closes a dismissible search shell from its backdrop and restores the trigger", async () => {
    const path = await bundle("search-shell-backdrop", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiSearchShell as SearchShell } from "@looma-test/components";
      const shown = createState(false);
      window.closes = [];
      createScene({ render: () => sceneNode("div", [
        sceneNode("button", { id: "search-trigger", onClick: () => { shown.value = true; } }, "Search commands"),
        sceneNode(SearchShell, { open: shown.value, dismissible: true, modal: true, label: "Search commands", onClose: event => { window.closes.push(event.detail); shown.value = false; } }, {
          search: () => sceneNode("input", { type: "search", "aria-label": "Find a command" }),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")]);
    await page.getByRole("button", { name: "Search commands", exact: true }).click();
    await page.getByRole("searchbox", { name: "Find a command", exact: true }).fill("notes");
    await page.getByRole("dialog", { name: "Search commands", exact: true }).click({ position: { x: 10, y: 10 } });
    await page.getByRole("dialog", { name: "Search commands", exact: true }).waitFor({ state: "hidden" });
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("search-trigger");
    assert.deepEqual(await page.evaluate(() => (window as any).closes), [{ open: false, reason: "light-dismiss", trigger: "pointer" }]);
    await page.close();
  });

  it("announce each anchor toggle to a controlled popover consumer exactly once, with its trigger", async () => {
    const path = await bundle("converted-popover-controlled", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiButton as Button, UiPopover as Popover } from "@looma-test/components";
      const open = createState(false);
      const events = [];
      window.popover = { open, events };
      createScene({
        render: () => sceneNode("div", [
          sceneNode(Button, { id: "trigger" }, () => "Icon"),
          sceneNode(Popover, {
            id: "picker", for: "trigger", open: open.value,
            onOpen: (event) => { events.push(["open", event.detail]); open.value = true; },
            onClose: (event) => { events.push(["close", event.detail]); open.value = false; },
          }, () => "Choose an icon"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    type Probe = { popover: { open: { value: boolean }, events: unknown[] } };
    const state = () => page.evaluate(() => {
      const { open, events } = (window as unknown as Probe).popover;
      return { open: open.value, events };
    });
    await page.locator("#trigger").click();
    await page.locator("#picker").waitFor({ state: "visible" });
    assert.deepEqual(await state(), { open: true, events: [["open", { open: true, reason: "action", trigger: "pointer" }]] });
    await page.locator("#trigger").click();
    await page.locator("#picker").waitFor({ state: "hidden" });
    assert.deepEqual(await state(), {
      open: false,
      events: [
        ["open", { open: true, reason: "action", trigger: "pointer" }],
        ["close", { open: false, reason: "action", trigger: "pointer" }],
      ],
    });
    // The consumer can close it too, and the anchor then opens it again.
    await page.locator("#trigger").click();
    await page.evaluate(() => { (window as unknown as Probe).popover.open.value = false; });
    await page.locator("#picker").waitFor({ state: "hidden" });
    await page.locator("#trigger").click();
    await page.locator("#picker").waitFor({ state: "visible" });
    await page.close();
  });

  it("keeps dialog close visuals equal to a shared small IconButton when touch is used", async () => {
    const path = await bundle("converted-dialog-touch", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiDialog as Dialog, UiIconButton as IconButton, UiIcon as Icon } from "@looma-test/components";
      import { trackInputModality } from "@threadlabs/looma/components/shared/input-modality.js";
      trackInputModality(document);
      createScene({ render: () => [sceneNode(IconButton, { id: "reference", size: "sm", round: true, label: "Reference" }, () => sceneNode(Icon, {name:"x"})), sceneNode(Dialog, { id: "dialog", open: true, closedby: "any", label: "Details" }, () => "Body")] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const close = page.locator("#dialog").getByRole("button", {name:"Close",exact:true});
    const size = () => close.evaluate((element) => (element as HTMLElement).offsetWidth);
    const reference = await page.locator("#reference").evaluate(element => (element as HTMLElement).offsetWidth);
    assert.equal(await size(), reference);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    assert.equal(await size(), reference, "touch does not enlarge the visible control or its focus ring");
    await expect.poll(() => close.locator("svg").count(), { message: "close uses the shared icon rather than CSS strokes" }).toBe(1);
    await page.close();
  });
});
