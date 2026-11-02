import assert from "node:assert/strict";

import { join } from "node:path";

import { it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

it("keeps warning action labels readable across standalone themes and interaction states", async () => {
  const path = await bundle("warning-action-contrast", `import "@looma-test/runtime";`);
  const page = await open(path, '<ui-button id="warning" tone="warning" variant="solid">Review warning</ui-button>',
    ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map(file => join(root, file)), { reducedMotion: "reduce" });
  const button = page.locator("#warning");
  const contrast = () => button.evaluate(element => {
    const style = getComputedStyle(element), context = document.createElement("canvas").getContext("2d")!;
    const luminance = (color: string) => {
      context.fillStyle = color; context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => value / 255)
        .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
        .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index]!, 0);
    };
    const text = luminance(style.color), fill = luminance(style.backgroundColor);
    return (Math.max(text, fill) + .05) / (Math.min(text, fill) + .05);
  });
  for (const theme of ["light", "dark", "high"]) {
    await page.evaluate(theme => {
      document.documentElement.dataset.theme = theme === "high" ? "light" : theme;
      if (theme === "high") document.documentElement.dataset.contrast = "high";
      else delete document.documentElement.dataset.contrast;
    }, theme);
    await page.mouse.move(600, 600);
    await button.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
    assert.ok(await contrast() >= 4.5, theme + ": resting warning label");
    await button.hover();
    await button.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
    assert.ok(await contrast() >= 4.5, theme + ": hovered warning label");
    await page.mouse.down();
    await button.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
    try { assert.ok(await contrast() >= 4.5, theme + ": pressed warning label"); }
    finally { await page.mouse.up(); }
  }
  await page.close();
});
