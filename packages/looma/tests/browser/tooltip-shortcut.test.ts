import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tooltip shortcut", () => {
  it("shows a shortcut after the label behind a divider, and nothing when there is none", async () => {
    const path = await bundle("html-tooltip-shortcut", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <button id="one" style="position: fixed; left: 200px; top: 200px">Search</button>
      <button id="two" style="position: fixed; left: 500px; top: 200px">Close</button>
      <ui-tooltip id="with" for="one" open placement="bottom">Search<kbd slot="shortcut">⌘K</kbd></ui-tooltip>
      <ui-tooltip id="without" for="two" placement="bottom">Close</ui-tooltip>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const layout = await page.evaluate(() => {
      const tip = document.querySelector("#with")!;
      const surface = tip.querySelector(".surface")!;
      const kbd = tip.querySelector("kbd")!;
      const shortcut = kbd.closest(".shortcut")!;
      const label = document.createRange();
      label.selectNodeContents(surface.querySelector(".label")!);
      const style = getComputedStyle(shortcut);
      const empty = document.querySelector("#without .shortcut");
      return {
        afterLabel: kbd.getBoundingClientRect().left > label.getBoundingClientRect().right,
        sameLine: Math.abs((kbd.getBoundingClientRect().top + kbd.getBoundingClientRect().bottom) / 2 - (label.getBoundingClientRect().top + label.getBoundingClientRect().bottom) / 2) < 3,
        divider: style.borderInlineStartWidth,
        smaller: Number.parseFloat(style.fontSize) < Number.parseFloat(getComputedStyle(surface).fontSize),
        text: tip.textContent?.replace(/\s+/g, ""),
        emptyHidden: !empty || getComputedStyle(empty).display === "none",
      };
    });
    assert.deepEqual(layout, { afterLabel: true, sameLine: true, divider: "1px", smaller: true, text: "Search⌘K", emptyHidden: true });
    await page.close();
  });

  it("sets a slotted kbd in the label's type, not the browser's monospace, in converted output", async () => {
    const path = await bundle("converted-shortcut-kbd", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiMenu as Menu, UiMenuItem as MenuItem, UiTooltip as Tooltip } from "@looma-test/components";
      createScene({ render: () => sceneNode("main", [
        sceneNode("button", { id: "one", style: { position: "fixed", left: "200px", top: "200px" } }, "Search"),
        sceneNode(Tooltip, { for: "one", open: true, placement: "bottom" }, { default: () => "Search", shortcut: () => sceneNode("kbd", "⌘K") }),
        sceneNode(Menu, { inline: true, "aria-label": "File" }, () => [
          sceneNode(MenuItem, { value: "new" }, { default: () => "New file", shortcut: () => sceneNode("kbd", "⌘N") }),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const fonts = await page.evaluate(() => Array.from(document.querySelectorAll("kbd"), (kbd) => ({
      kbd: getComputedStyle(kbd).fontFamily,
      region: getComputedStyle(kbd.parentElement!).fontFamily,
    })));
    assert.equal(fonts.length, 2);
    for (const font of fonts) assert.equal(font.kbd, font.region);
    await page.close();
  });
});
