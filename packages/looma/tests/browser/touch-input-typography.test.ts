import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Touch input typography", () => {
  it("keeps editable fields readable inside caption typography", async () => {
    const path = await bundle("touch-caption-input", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiInput as Input, UiTextarea as Textarea, UiSelect as Select, UiCombobox as Combobox } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", { style: "font-size:12px" }, () => [
        sceneNode(Input, { id: "normal", placeholder: "Search people" }),
        sceneNode(Input, { id: "small", size: "sm", placeholder: "Search pages" }),
        sceneNode(Textarea, { id: "notes", placeholder: "Notes" }),
        sceneNode(Select, { id: "stage", "aria-label": "Stage" }, () => sceneNode("option", {}, "Draft")),
        sceneNode(Combobox, { id: "person", label: "Person" }),
      ]) }).mount("#app");
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], {
      viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
    });
    for (const selector of ["#normal", "#small", "#notes", "#stage", "#person input"]) {
      assert.ok(await page.locator(selector).evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 16, selector);
    }
    for (const id of ["normal", "small", "notes"]) {
      const field = page.locator(`#${id}`);
      assert.ok(await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)) >= 16);
      await field.tap();
      await field.fill("Readable");
      await expect.poll(() => field.inputValue()).toBe("Readable");
    }
    await page.close();
  });
});
