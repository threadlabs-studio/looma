import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Avatar fallbacks and counts", () => {
  it("shows a person glyph, supports square and decorative avatars, and counts unauthored people in HTML", async () => {
    const path = await bundle("html-avatar-coverage", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-avatar id="anonymous"></ui-avatar>
      <ui-avatar id="decorative" name="Ada Lovelace" decorative></ui-avatar>
      <ui-avatar-group id="group" max="2" total="7" overflow-label="{count} other contributors">
        <ui-avatar id="square" name="Ada Lovelace" shape="square"></ui-avatar>
        <ui-avatar name="Grace Hopper"></ui-avatar>
      </ui-avatar-group>
    `, [join(root, "tokens.css")]);
    await expect.poll(() => page.locator("#anonymous").getAttribute("aria-label")).toBe("Avatar");
    await expect.poll(() => page.locator('#anonymous :is([component~="ui-icon"], [data-component~="ui-icon"], .ui-icon, [ui-icon])').count()).toBe(1);
    await expect.poll(() => page.locator("#anonymous .fallback ui-icon, #anonymous .fallback :is([component~='ui-icon'], [data-component~='ui-icon'], .ui-icon, [ui-icon])").first().isVisible(), { message: await page.locator("#anonymous .fallback").evaluate((element) => element.outerHTML) }).toBe(true);
    await expect.poll(() => page.locator("#anonymous .fallback > span:first-child").isVisible()).toBe(false);
    await expect.poll(() => page.locator("#decorative").getAttribute("aria-hidden")).toBe("true");
    await expect.poll(() => page.locator("#decorative").getAttribute("role")).toBe(null);
    assert.equal(await page.locator("#square").evaluate((element) => getComputedStyle(element).borderTopLeftRadius), "8px");
    await expect.poll(() => page.locator("#group .overflow").textContent()).toBe("+5");
    await expect.poll(() => page.locator("#group .overflow").getAttribute("aria-label")).toBe("5 other contributors");
    await page.close();
  });

  it("passes decorative, shape, total, and overflow label through the converter", async () => {
    const path = await bundle("converted-avatar-coverage", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiAvatar as Avatar, UiAvatarGroup as AvatarGroup } from "@looma-test/components";
      createScene({ render: () => sceneNode(AvatarGroup, { id: "group", max: 1, total: 4, overflowLabel: "{count} more teammates" }, () => [
        sceneNode(Avatar, { id: "square", name: "Ada Lovelace", shape: "square", decorative: true }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await expect.poll(() => page.locator("#square").getAttribute("aria-hidden")).toBe("true");
    assert.equal(await page.locator("#square").evaluate((element) => getComputedStyle(element).borderTopLeftRadius), "8px");
    await expect.poll(() => page.locator("#group .overflow").getAttribute("aria-label")).toBe("3 more teammates");
    await page.close();
  });
});
