import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Light dismiss", () => {
  it("needs a real press: a pointerdown with no coordinates keeps a modal dialog open", async () => {
    const path = await bundle("converted-light-dismiss", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiDialog as Dialog } from "@looma-test/components";
      createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, modal: true, closedby: "any", label: "Details" }, () => "Body") }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const dialog = page.locator("#dialog");
    await dialog.waitFor();
    // An activation with no pointer (assistive technology, or a synthetic event) reports 0,0, and
    // lands on the document rather than inside the dialog.
    await page.evaluate(() => {
      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerType: "touch" }));
    });
    await page.waitForTimeout(50);
    assert.equal(await dialog.evaluate((element) => (element as HTMLDialogElement).open), true, "the dialog stays open");
    await page.close();
  });
});
