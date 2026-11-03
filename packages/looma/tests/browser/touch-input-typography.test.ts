import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Touch input typography", () => {
  it("keeps editable fields readable inside caption typography", async () => {
    const path = await bundle("touch-caption-input", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiInput as Input } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", { style: "font-size:12px" }, () => [
        sceneNode(Input, { id: "normal", placeholder: "Search people" }),
        sceneNode(Input, { id: "small", size: "sm", placeholder: "Search pages" }),
      ]) }).mount("#app");
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")], {
      viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
    });
    for (const id of ["normal", "small"]) {
      const field = page.locator(`#${id}`);
      assert.ok(await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)) >= 16);
      await field.tap();
      await field.fill("Readable");
      await expect.poll(() => field.inputValue()).toBe("Readable");
    }
    await page.close();
  });
});
