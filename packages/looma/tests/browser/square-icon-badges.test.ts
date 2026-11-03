import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Square icon badges", () => {
  it("centres equal-size heading marks in HTML and converted and follows shared radius and spacing", async () => {
    for (const framework of ["html", "converted"]) {
      const path = await bundle(`${framework}-square-badges`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => [
          sceneNode(Badge, { id: "square", shape: "square", tone: "success", "aria-hidden": "true" }, () => sceneNode(Icon, { name: "bell" })),
          sceneNode(Badge, { id: "small", shape: "square", size: "xs", tone: "accent", "aria-hidden": "true" }, () => sceneNode(Icon, { name: "bell" })),
          sceneNode(Badge, { id: "large", shape: "square", size: "lg", "aria-hidden": "true" }, () => sceneNode(Icon, { name: "bell" })),
          sceneNode(Badge, { id: "pill" }, () => "Published"),
        ] }).mount("#app");
      `);
      const body = framework === "converted" ? `<div id="app"></div>` : `
        <ui-badge id="square" shape="square" tone="success" aria-hidden="true"><ui-icon name="bell"></ui-icon></ui-badge>
        <ui-badge id="small" shape="square" size="xs" tone="accent" aria-hidden="true"><ui-icon name="bell"></ui-icon></ui-badge>
        <ui-badge id="large" shape="square" size="lg" aria-hidden="true"><ui-icon name="bell"></ui-icon></ui-badge>
        <ui-badge id="pill">Published</ui-badge>`;
      const page = await open(path, body, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
      await page.waitForSelector('#square:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      for (const [id, size] of [["square", 32], ["small", 24], ["large", 40]] as const) {
        const box = await page.locator(`#${id}`).boundingBox();
        const icon = await page.locator(`#${id} svg`).boundingBox();
        assert.ok(box && icon && box.width === size && box.height === size, `${framework} ${id} is a square`);
        assert.ok(Math.abs(box.x + box.width / 2 - icon.x - icon.width / 2) < 1);
        assert.ok(Math.abs(box.y + box.height / 2 - icon.y - icon.height / 2) < 1);
        await expect.poll(() => page.locator(`#${id}`).getAttribute("aria-hidden")).toBe("true");
      }
      assert.equal(await page.locator('#square').evaluate(el => getComputedStyle(el).borderRadius), '8px');
      assert.notEqual(await page.locator('#square').evaluate(el => getComputedStyle(el).backgroundColor), await page.locator('#pill').evaluate(el => getComputedStyle(el).backgroundColor));
      assert.ok((await page.locator('#pill').boundingBox())!.width > 32, "ordinary badges still fit their text");
      await page.locator('body').evaluate(el => { el.style.setProperty('--ui-radius-md', '3px'); el.style.setProperty('--ui-space-4', '20px'); });
      assert.equal((await page.locator('#square').boundingBox())!.width, 40);
      assert.equal(await page.locator('#square').evaluate(el => getComputedStyle(el).borderRadius), '3px');
      await page.locator('#square').evaluate(el => { (el as HTMLElement).style.setProperty('--ui-badge-square-size', '36px'); });
      assert.equal((await page.locator('#square').boundingBox())!.height, 36);
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await page.locator('#square').evaluate(el => getComputedStyle(el).forcedColorAdjust), 'auto');
      await page.close();
    }
  });
});
