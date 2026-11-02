import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Chip editor", () => {
  for (const target of ["html", "converted"] as const) {
    it(`reports text, colour, and done, and keeps the arrow keys among the swatches (${target})`, async () => {
      const path = target === "html"
        ? await bundle("html-chip-editor", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            const editor = document.querySelector("#chip");
            for (const name of ["label", "color", "done"]) editor.addEventListener(name, (event) => window.fixtureEvents.push([name, event.detail]));
          `)
        : await bundle("converted-chip-editor", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiEditorChipEditor as EditorChipEditor } from "@looma-test/components";
            window.fixtureEvents = [];
            const record = (name) => (event) => window.fixtureEvents.push([name, event.detail]);
            createScene({ render: () => sceneNode(EditorChipEditor, { id: "chip", label: "Draft", color: "blue", onLabel: record("label"), onColor: record("color"), onDone: record("done") }) }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-editor-chip-editor id="chip" label="Draft" color="blue"></ui-editor-chip-editor>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const events = () => page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents);
      const dialog = page.getByRole("dialog", { name: "Edit chip" });
      const text = dialog.getByRole("textbox", { name: "Chip text" });
      await text.waitFor();
      await expect.poll(() => text.inputValue()).toBe("Draft");
      await expect.poll(() => dialog.getByRole("radio", { name: "Blue" }).isChecked()).toBe(true);
      // The group keeps its name for screen readers while its legend is hidden.
      assert.equal(await dialog.getByRole("radiogroup", { name: "Chip color" }).locator("legend").evaluate((legend) => legend.getBoundingClientRect().width), 1);
      await text.fill("Done");
      await text.evaluate((input) => (input as HTMLInputElement).select());
      await dialog.getByRole("radio", { name: "Green" }).click();
      assert.equal(await text.evaluate((input) => input === document.activeElement), true, "a pointer choice returns to the text");
      await dialog.getByRole("radio", { name: "Green" }).focus();
      await page.keyboard.press("ArrowRight");
      assert.equal(await dialog.getByRole("radio", { name: "Yellow" }).evaluate((radio) => radio === document.activeElement), true, "the arrow keys stay among the swatches");
      await text.press("Enter");
      assert.deepEqual(await events(), [
        ["label", { label: "Done" }],
        ["color", { color: "green" }],
        ["color", { color: "yellow" }],
        ["done", {}],
      ]);
      await page.close();
    });
  }
});
