import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Badge colour", () => {
  // --ui-badge-color derives a wash and an ink from one colour: it beats the tone, the explicit hooks
  // beat it, and its text keeps 4.5:1 for any hue in every variant and theme.
  const hues = { teal: "teal", violet: "#7c3aed", amber: "#f59e0b", paleYellow: "#fef9c3", black: "black", white: "white" };
  const variants = ["subtle", "solid", "outline", "inverse"];

  it("overrides the tone, yields to explicit hooks, and keeps text contrast", async () => {
    const path = await bundle("html-badge-color", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-badge id="tone" tone="danger">Tone</ui-badge>
      <ui-badge id="neutral">Plain</ui-badge>
      <ui-badge id="coloured" tone="danger" style="--ui-badge-color: teal">Coloured</ui-badge>
      <ui-badge id="explicit" tone="danger" style="--ui-badge-color: teal; --ui-badge-surface: rgb(1, 2, 3); --ui-badge-text: rgb(4, 5, 6); --ui-badge-border: rgb(7, 8, 9)">Explicit</ui-badge>
      <div style="--ui-badge-color: teal"><ui-badge id="nested">Nested</ui-badge></div>
      ${Object.entries(hues).flatMap(([name, hue]) => variants.map((variant) =>
        `<ui-badge id="${name}-${variant}" class="hue" variant="${variant}" style="--ui-badge-color: ${hue}">${name}</ui-badge>`)).join("")}
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")]);
    await page.waitForSelector('#explicit:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
    const paint = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { surface: style.backgroundColor, text: style.color, border: style.borderTopColor };
    });
    const tone = await paint("#tone"), coloured = await paint("#coloured");
    assert.notEqual(coloured.surface, tone.surface, "the colour replaces the tone's surface");
    assert.notEqual(coloured.text, tone.text, "the colour replaces the tone's text");
    assert.notEqual(coloured.border, coloured.surface, "a coloured subtle badge has a stronger edge than its fill");
    assert.deepEqual(await paint("#explicit"), { surface: "rgb(1, 2, 3)", text: "rgb(4, 5, 6)", border: "rgb(7, 8, 9)" });
    assert.deepEqual(await paint("#nested"), coloured, "an inherited colour hook styles badges in the subtree");

    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      const ratios = await page.locator(".hue").evaluateAll((badges) => {
        const context = document.createElement("canvas").getContext("2d")!;
        const luminance = (colour: string) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = colour;
          context.fillRect(0, 0, 1, 1);
          const channels = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
        };
        return badges.map((badge) => {
          const style = getComputedStyle(badge);
          const [bright, dim] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
          return { badge: badge.id, ratio: (bright! + 0.05) / (dim! + 0.05) };
        });
      });
      assert.equal(ratios.length, Object.keys(hues).length * variants.length);
      for (const { badge, ratio } of ratios) assert.ok(ratio >= 4.5, `${theme}: ${badge} text is ${ratio.toFixed(2)}:1`);
    }

    await page.emulateMedia({ forcedColors: "active" });
    const forced = await paint("#coloured");
    assert.notEqual(forced.border, forced.surface, "forced colours draw a coloured badge's edge");
    await page.close();
  });
});
