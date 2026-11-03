import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Avatar sizes", () => {
  it("steps down from md to sm to xs, with initials that still fit", async () => {
    const path = await bundle("html-avatar-sizes", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-avatar id="md" name="Ada Lovelace"></ui-avatar>
      <ui-avatar id="sm" name="Ada Lovelace" size="sm"></ui-avatar>
      <ui-avatar id="xs" name="Ada Lovelace" size="xs"></ui-avatar>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#xs:is([component~="ui-avatar"], [data-component~="ui-avatar"], .ui-avatar, [ui-avatar])');
    const measure = (id: string) => page.evaluate((selector) => {
      const element = document.querySelector<HTMLElement>(selector)!;
      // The sizes are the circle inside its 1px border.
      return { width: element.clientWidth, height: element.clientHeight, fontSize: parseFloat(getComputedStyle(element).fontSize), fits: element.scrollWidth <= element.clientWidth };
    }, id);
    const [md, sm, xs] = [await measure("#md"), await measure("#sm"), await measure("#xs")];
    assert.deepEqual([md.width, sm.width, xs.width], [40, 28, 20]);
    assert.equal(xs.height, 20);
    assert.ok(xs.fontSize < sm.fontSize && sm.fontSize < md.fontSize, "initials shrink with each size");
    assert.ok(xs.fits, "xs initials fit inside the circle");
    await page.close();
  });

  it("centres the initials in the circle whatever line of text surrounds it", async () => {
    const path = await bundle("html-avatar-centred", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <span style="font-size: 12px; line-height: 2.2">Looked after by: <ui-avatar id="inline" name="Grace Hopper" size="xs"></ui-avatar> Grace</span>
      <ui-avatar id="alone" name="Grace Hopper" size="xs"></ui-avatar>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#inline:is([component~="ui-avatar"], [data-component~="ui-avatar"], .ui-avatar, [ui-avatar])');
    const offset = (id: string) => page.evaluate((selector) => {
      const avatar = document.querySelector<HTMLElement>(selector)!;
      const text = [...avatar.querySelectorAll("*"), avatar].map((element) => [...element.childNodes])
        .flat().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
      const range = document.createRange();
      range.selectNodeContents(text);
      const glyphs = range.getBoundingClientRect();
      const circle = avatar.getBoundingClientRect();
      return (glyphs.top + glyphs.height / 2) - (circle.top + circle.height / 2);
    }, id);
    const [inline, alone] = [await offset("#inline"), await offset("#alone")];
    assert.ok(Math.abs(inline) <= 1, `initials sit ${inline}px off centre inside a line of text`);
    assert.ok(Math.abs(inline - alone) <= 0.5, "an avatar's initials sit the same in a line of text as on their own");
    await page.close();
  });
});
