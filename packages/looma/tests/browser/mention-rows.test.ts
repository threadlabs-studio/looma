import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Mention rows", () => {
  it("keep the highlighted row's initials circle distinct from the highlight", async () => {
    const path = await bundle("html-mention-row-contrast", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ul role="listbox">
        <ui-editor-mention-menu-item id="active" value="ada" initials="AL" aria-selected="true">Ada Lovelace</ui-editor-mention-menu-item>
        <ui-editor-mention-menu-item id="photo" value="grace" aria-selected="true"><ui-avatar slot="start" name="Grace Hopper" size="sm"></ui-avatar>Grace Hopper</ui-editor-mention-menu-item>
      </ul>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#photo :is([component~="ui-avatar"], [data-component~="ui-avatar"], .ui-avatar, [ui-avatar])');
    const colours = (id: string) => page.evaluate((selector) => {
      const row = document.querySelector<HTMLElement>(selector)!;
      return { row: getComputedStyle(row).backgroundColor, circle: getComputedStyle(row.querySelector(".avatar")!).backgroundColor };
    }, id);
    const active = await colours("#active");
    assert.notEqual(active.circle, active.row, "the initials circle stands apart from the highlighted row");
    assert.equal((await colours("#photo")).circle, "rgba(0, 0, 0, 0)", "a slotted photo avatar brings its own circle");
    await page.close();
  });
});
