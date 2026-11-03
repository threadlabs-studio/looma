import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Swatch", () => {
  for (const target of ["html", "converted"] as const) {
    it(`is a radio named by its tone, chosen through its group, with a ring when checked (${target})`, async () => {
      const tones = ["neutral", "blue", "purple"];
      const path = target === "html"
        ? await bundle("html-swatch", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            document.querySelector("#colors").addEventListener("select", (event) => window.fixtureEvents.push(event.detail.value));
          `)
        : await bundle("converted-swatch", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiRadioGroup as RadioGroup, UiSwatch as Swatch } from "@looma-test/components";
            window.fixtureEvents = [];
            createScene({ render: () => sceneNode(RadioGroup, { id: "colors", label: "Color", value: "blue", onSelect: (event) => window.fixtureEvents.push(event.detail.value) },
              () => ${JSON.stringify(tones)}.map((tone) => sceneNode(Swatch, { tone }))) }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-radio-group id="colors" label="Color" value="blue">${tones.map((tone) => `<ui-swatch tone="${tone}"></ui-swatch>`).join("")}</ui-radio-group>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const group = page.getByRole("radiogroup", { name: "Color" });
      await group.waitFor();
      assert.deepEqual(await group.getByRole("radio").evaluateAll((radios) => radios.map((radio) => [radio.getAttribute("aria-label"), (radio as HTMLInputElement).value])),
        [["Neutral", "neutral"], ["Blue", "blue"], ["Purple", "purple"]]);
      const blue = group.getByRole("radio", { name: "Blue" });
      await expect.poll(() => blue.isChecked()).toBe(true);
      const ring = await blue.evaluate((radio) => [getComputedStyle(radio).outlineStyle, getComputedStyle(radio).outlineWidth, getComputedStyle(radio).borderRadius]);
      assert.deepEqual(ring, ["solid", "2px", "50%"]);
      assert.notEqual(await group.getByRole("radio", { name: "Purple" }).evaluate((radio) => getComputedStyle(radio).backgroundColor),
        await blue.evaluate((radio) => getComputedStyle(radio).backgroundColor), "each tone has its own colour");
      await blue.focus();
      await page.keyboard.press("ArrowRight");
      await expect.poll(() => group.getByRole("radio", { name: "Purple" }).isChecked()).toBe(true);
      await group.getByRole("radio", { name: "Neutral" }).click();
      assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents), ["purple", "neutral"]);
      await page.close();
    });
  }
});
