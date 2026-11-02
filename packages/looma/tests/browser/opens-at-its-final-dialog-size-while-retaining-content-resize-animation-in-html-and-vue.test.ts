import assert from "node:assert/strict";

import { join } from "node:path";

import { it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

it("opens at its final dialog size while retaining content resize animation in HTML and converted", async () => {
  for (const adapter of ["html", "converted"]) {
    const path = await bundle(`${adapter}-dialog-initial-size`, adapter === "html" ? `import "@looma-test/runtime";` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button, UiDialog as Dialog } from "@looma-test/components";
      createScene({ render: () => [sceneNode(Button, { id: "open" }, () => "Open details"),
        sceneNode(Dialog, { id: "dialog", for: "open", label: "Details" }, () => sceneNode("p", "A note with its final content already present."))] }).mount("#app");
    `);
    const page = await open(path, adapter === "html" ? '<ui-button id="open">Open details</ui-button><ui-dialog id="dialog" for="open" label="Details"><p>A note with its final content already present.</p></ui-dialog>' : '<div id="app"></div>',
      [join(root, "tokens.css")], { reducedMotion: "no-preference" });
    await page.addStyleTag({ content: ':root {--ui-dialog-duration:400ms}' });
    await page.locator("#open").click();
    const sizes = await page.locator("#dialog").evaluate(async element => {
      const frames = [];
      for (let index = 0; index < 30; index++) {
        frames.push({ painted: element.getBoundingClientRect().height, intrinsic: parseFloat(getComputedStyle(element).height) });
        await new Promise(requestAnimationFrame);
      }
      return frames;
    });
    assert.ok(Math.max(...sizes.map(size => size.intrinsic)) - Math.min(...sizes.map(size => size.intrinsic)) < 1, `${adapter}: opening content already has one intrinsic size`);
    assert.ok(Math.max(...sizes.map(size => size.painted)) - Math.min(...sizes.map(size => size.painted)) < 1, `${adapter}: the first appearance must not scale the dialog's height`);
    await page.close();
  }
});
