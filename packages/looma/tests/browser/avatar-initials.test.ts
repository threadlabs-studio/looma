import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Avatar initials", () => {
  it("meet text contrast on their surface", async () => {
    const path = await bundle("html-avatar-contrast", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-avatar id="person" name="Ada Lovelace"></ui-avatar>
      <ui-badge id="badge" tone="accent" variant="subtle">Tag</ui-badge>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#person:is([component~="ui-avatar"], [data-component~="ui-avatar"], .ui-avatar, [ui-avatar])');
    await page.waitForSelector('#badge:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
    // Text on the soft accent surface is the theme's subtle accent text, as a subtle accent badge's is:
    // a theme whose accent is too light to read on its own soft tint tunes that one token for both.
    const colour = (id: string) => page.evaluate((selector) => getComputedStyle(document.querySelector(selector)!).color, id);
    assert.equal(await colour("#person"), await colour("#badge"));
    const ratio = await page.evaluate(() => {
      // Resolve any CSS colour (oklch, color-mix) to sRGB the way the browser paints it.
      const context = document.createElement("canvas").getContext("2d")!;
      const rgb = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const luminance = (channels: number[]) => {
        const [r, g, b] = channels.map((value) => {
          const c = value / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const style = getComputedStyle(document.querySelector("#person")!);
      const [light, dark] = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))].sort((a, b) => b - a);
      return (light! + 0.05) / (dark! + 0.05);
    });
    assert.ok(ratio >= 4.5, `initials contrast is ${ratio.toFixed(2)}:1`);
    await page.close();
  });
});
