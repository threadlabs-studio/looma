import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "vitest";
import { bundle, open, root } from "../renderers/browser-driver";

const styles = [join(root, "tokens.css"), join(root, "theme-light.css")];

describe("Catalog behavior", () => {
  it("renders recursive compact nodes and marks as escaped semantic content", async () => {
    const script = await bundle("compact-parts", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCompactMark, UiCompactNode } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", [
        sceneNode(UiCompactMark, { id: "mark", text: "<script>literal</script>", marks: [{ type: "bold" }, { type: "italic" }], index: 1 }),
        sceneNode(UiCompactNode, { id: "node", node: { type: "unknown", content: [{ type: "paragraph", content: [{ type: "text", text: "First" }, { type: "hardBreak" }, { type: "text", text: "Last", marks: [{ type: "code" }] }] }] } }),
      ]) }).mount("#app");
    `);
    const page = await open(script, '<div id="app"></div>', styles);
    await expect.poll(() => page.locator("#mark em strong, em#mark strong").textContent()).toBe("<script>literal</script>");
    await expect.poll(() => page.locator("#mark script").count()).toBe(0);
    await expect.poll(() => page.locator("#node p").textContent()).toBe("FirstLast");
    await expect.poll(() => page.locator("#node p br").count()).toBe(1);
    await expect.poll(() => page.locator("#node p code").textContent()).toBe("Last");
    await page.close();
  });

  it("reveals nearby affordances, ignores disabled controls and clears touch proximity", async () => {
    const script = await bundle("affordance-scope", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiAffordanceScope } from "@looma-test/components";
      createScene({ render: () => sceneNode(UiAffordanceScope, { nearRadius: 16, guide: "none" }, () => [
        sceneNode("button", { id: "near", "data-ui-affordance": "", style: "position:absolute;left:100px;top:100px;width:100px;height:40px" }, "Add item"),
        sceneNode("button", { id: "disabled", disabled: true, "data-ui-affordance": "", style: "position:absolute;left:100px;top:160px;width:100px;height:40px" }, "Unavailable"),
      ]) }).mount("#app");
    `);
    const page = await open(script, '<div id="app"></div>', styles);
    await page.mouse.move(90, 120);
    await page.waitForFunction(() => document.querySelector("#near")?.getAttribute("data-ui-proximity") === "near");
    await page.mouse.move(90, 180);
    await page.waitForFunction(() => !document.querySelector("#near")?.hasAttribute("data-ui-proximity"));
    await expect.poll(() => page.locator("#disabled").getAttribute("data-ui-proximity")).toBe(null);
    await page.mouse.move(110, 120);
    await page.waitForFunction(() => document.querySelector("#near")?.hasAttribute("data-ui-proximity"));
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: 110, clientY: 120 })));
    await page.waitForFunction(() => !document.querySelector("#near")?.hasAttribute("data-ui-proximity"));
    await page.close();
  });

  it("edits a footnote, reports text and closes on an unhandled Escape", async () => {
    const script = await bundle("footnote-editor", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorFootnoteEditor } from "@looma-test/components";
      window.events = [];
      createScene({ render: () => sceneNode(UiEditorFootnoteEditor, { note: "Original note", onText: event => window.events.push(["text", event.detail.text]), onDone: () => window.events.push(["done"]) }) }).mount("#app");
    `);
    const page = await open(script, '<div id="app"></div>', styles);
    await expect.poll(() => page.getByRole("dialog", { name: "Edit footnote" }).count()).toBe(1);
    const field = page.getByRole("textbox", { name: "Footnote", exact: true });
    await expect.poll(() => field.inputValue()).toBe("Original note");
    await field.fill("Updated note");
    await field.press("Escape");
    assert.deepEqual(await page.evaluate(() => (window as any).events), [["text", "Updated note"], ["done"]]);
    await page.close();
  });

  it("exposes formatting state and reports enabled toolbar actions", async () => {
    const script = await bundle("formatting-tools", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorFormattingTools } from "@looma-test/components";
      window.events = [];
      const item = (id, label, disabled = false) => ({ id, label, disabled, kind: "icon", icon: "bold", active: id === "bold", expanded: false, shortcut: "" });
      createScene({ render: () => sceneNode(UiEditorFormattingTools, {
        items: [item("bold", "Bold"), item("unavailable", "Unavailable", true)],
        onToolAction: event => window.events.push(["action", event.detail.id]),
        onToolPress: event => window.events.push(["press", event.detail.id]),
        onToolFocus: event => window.events.push(["focus", event.detail.id]),
      }) }).mount("#app");
    `);
    const page = await open(script, '<div id="app"></div>', styles);
    const bold = page.getByRole("button", { name: "Bold", exact: true });
    await expect.poll(() => bold.getAttribute("aria-pressed")).toBe("true");
    await expect.poll(() => page.getByRole("button", { name: "Unavailable", exact: true }).isDisabled()).toBe(true);
    await bold.focus();
    await bold.click();
    assert.deepEqual(await page.evaluate(() => (window as any).events), [["focus", "bold"], ["press", "bold"], ["action", "bold"]]);
    await page.close();
  });

  it("keeps floating actions accessible, disabled when requested and responsive", async () => {
    const script = await bundle("floating-action", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiFloatingActionButton } from "@looma-test/components";
      const disabled = createState(false); window.disable = () => { disabled.value = true; }; window.clicks = 0;
      createScene({ render: () => sceneNode(UiFloatingActionButton, { label: "Compose", mobileOnly: true, disabled: disabled.value, onClick: () => window.clicks++ }, () => "+") }).mount("#app");
    `);
    const page = await open(script, '<div id="app"></div>', styles, { viewport: { width: 375, height: 812 } });
    const action = page.getByRole("button", { name: "Compose", exact: true });
    await expect.poll(() => action.isVisible()).toBe(true);
    await action.click();
    assert.equal(await page.evaluate(() => (window as any).clicks), 1);
    await page.evaluate(() => (window as any).disable());
    await page.waitForFunction(() => document.querySelector<HTMLButtonElement>('button[aria-label="Compose"]')?.disabled);
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect.poll(() => action.isVisible()).toBe(false);
    await page.close();
  });
  it("preserves separator semantics while orientation and selection change", async () => {
    const script = await bundle("separator", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiSeparator } from "@looma-test/components";
      const vertical = createState(false); window.selectSeparator = () => { vertical.value = true; };
      createScene({ render: () => sceneNode("div", { style: "--ui-border-width:3px" }, [
        sceneNode(UiSeparator, { id: "separator", orientation: vertical.value ? "vertical" : "horizontal", selected: vertical.value }),
      ]) }).mount("#app");
    `);
    const page = await open(script, '<div id="app"></div>', styles);
    const separator = page.getByRole("separator");
    await expect.poll(() => separator.getAttribute("aria-orientation")).toBe("horizontal");
    assert.equal(await separator.evaluate(element => element.localName), "hr");
    assert.equal(await separator.evaluate(element => getComputedStyle(element).borderTopWidth), "3px");
    await page.evaluate(() => (window as any).selectSeparator());
    await expect.poll(() => separator.getAttribute("aria-orientation")).toBe("vertical");
    await expect.poll(() => separator.evaluate(element => getComputedStyle(element).borderInlineStartWidth)).toBe("3px");
    assert.equal(await separator.evaluate(element => getComputedStyle(element).borderTopWidth), "0px");
    assert.equal(await separator.evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    await page.close();
  });

});
