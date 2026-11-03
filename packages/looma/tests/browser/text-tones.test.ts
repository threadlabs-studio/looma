import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Text tones", () => {
  it("colours info and warning with the tone's text token", async () => {
    const path = await bundle("html-text-tones", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-text id="info" tone="info">Scheduled for pickup.</ui-text>
      <ui-text id="warning" tone="warning">Needs a carrier.</ui-text>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#warning:is([component~="ui-text"], [data-component~="ui-text"], .ui-text, [ui-text])');
    const colours = await page.evaluate(() => {
      const resolve = (token: string) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const color = (id: string) => getComputedStyle(document.querySelector(id)!).color;
      return {
        info: [color("#info"), resolve("--ui-info-subtle-text")],
        warning: [color("#warning"), resolve("--ui-warning-subtle-text")],
      };
    });
    assert.equal(colours.info[0], colours.info[1]);
    assert.equal(colours.warning[0], colours.warning[1]);
    await page.close();
  });
});
