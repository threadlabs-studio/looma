import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Avatar group xs", () => {
  it("overlaps xs avatars and sizes the +N badge to match", async () => {
    const path = await bundle("html-avatar-group-xs", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-avatar-group id="xs" size="xs" max="2" label="Looked after by">
        <ui-avatar name="Ada Lovelace" size="xs"></ui-avatar>
        <ui-avatar name="Grace Hopper" size="xs"></ui-avatar>
        <ui-avatar name="Alan Turing" size="xs"></ui-avatar>
      </ui-avatar-group>
      <ui-avatar-group id="md" label="People"><ui-avatar name="Ada Lovelace"></ui-avatar><ui-avatar name="Grace Hopper"></ui-avatar></ui-avatar-group>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#xs :is([component~="ui-avatar"], [data-component~="ui-avatar"], .ui-avatar, [ui-avatar])');
    const layout = (id: string) => page.evaluate((selector) => {
      const group = document.querySelector(selector)!;
      const avatars = [...group.querySelectorAll<HTMLElement>(':is([component~="ui-avatar"], [data-component~="ui-avatar"], .ui-avatar, [ui-avatar])')].filter((element) => element.getBoundingClientRect().width > 0);
      const badge = group.querySelector<HTMLElement>(".overflow")!;
      const [first, second] = avatars.map((element) => element.getBoundingClientRect());
      return { overlap: first!.right - second!.left, avatar: first!.height, badge: badge.hidden ? 0 : badge.getBoundingClientRect().height, text: badge.textContent?.trim() };
    }, id);
    const [xs, md] = [await layout("#xs"), await layout("#md")];
    assert.equal(xs.badge, xs.avatar, "the +N badge is the xs avatar's size");
    assert.ok(xs.avatar < 24, "the avatars are xs");
    assert.equal(xs.text, "+1");
    assert.ok(xs.overlap > 0 && xs.overlap < md.overlap, `xs avatars overlap less (${xs.overlap}px) than md (${md.overlap}px)`);
    await page.close();
  });
});
