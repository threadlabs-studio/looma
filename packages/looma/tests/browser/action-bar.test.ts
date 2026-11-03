import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Action bar", () => {
  // Each bar: tertiary, secondary, and primary buttons whose ids share the bar's prefix.
  const bars = [
    { id: "wide", style: "width: 600px" },
    { id: "narrow", style: "width: 280px" },
    { id: "rtl", style: "width: 600px", dir: "rtl" },
  ];

  async function checkActionBar(page: Page) {
    await page.locator("#wide-p").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1, `${what}: ${a} vs ${b}`);

    // Wide: tertiary at the start edge; secondary just before primary, which ends the row.
    const wide = await box("#wide");
    const [t, s, p] = [await box("#wide-t"), await box("#wide-s"), await box("#wide-p")];
    near(t.x, wide.x, "tertiary starts the row");
    near(p.x + p.width, wide.x + wide.width, "primary ends the row");
    assert.ok(s.x + s.width < p.x && p.x - (s.x + s.width) <= 16, "secondary sits just before primary");
    assert.ok(t.x + t.width < s.x - 100, "the spare space is between tertiary and the rest");
    assert.deepEqual([t.y, s.y].map(Math.round), [p.y, p.y].map(Math.round));

    // Without tertiary or secondary actions, the primary still ends the row.
    const solo = await box("#solo");
    const soloPrimary = await box("#solo-p");
    near(soloPrimary.x + soloPrimary.width, solo.x + solo.width, "a lone primary ends the row");

    // RTL mirrors: primary at the left edge, tertiary at the right.
    const rtl = await box("#rtl");
    near((await box("#rtl-p")).x, rtl.x, "primary ends an RTL row on the left");
    const rtlTertiary = await box("#rtl-t");
    near(rtlTertiary.x + rtlTertiary.width, rtl.x + rtl.width, "tertiary starts an RTL row on the right");

    // Narrow: full width, stacked primary first, by the bar's own width, not the viewport's.
    const narrow = await box("#narrow");
    const stacked = [await box("#narrow-p"), await box("#narrow-s"), await box("#narrow-t")];
    for (const item of stacked) near(item.width, narrow.width, "a stacked action is full width");
    assert.ok(stacked[0].y < stacked[1].y && stacked[1].y < stacked[2].y, "primary, secondary, tertiary from the top");

    // Tab order follows the source, tertiary to primary, at every width.
    for (const id of ["wide", "narrow", "rtl"]) {
      await page.locator(`#${id}-t`).focus();
      const order = [await page.evaluate(() => document.activeElement?.id)];
      for (let step = 0; step < 2; step += 1) {
        await page.keyboard.press("Tab");
        order.push(await page.evaluate(() => document.activeElement?.id));
      }
      assert.deepEqual(order, [`${id}-t`, `${id}-s`, `${id}-p`]);
    }

    // In a dialog's actions, the bar fills the footer.
    const footer = await box("#dialog footer");
    const [dialogTertiary, dialogPrimary] = [await box("#dialog-t"), await box("#dialog-p")];
    const inset = await page.locator("#dialog footer").evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
    near(dialogTertiary.x, footer.x + inset, "tertiary starts the dialog footer");
    near(dialogPrimary.x + dialogPrimary.width, footer.x + footer.width - inset, "primary ends the dialog footer");
  }

  it("orders actions by priority, stacks them in a narrow container, and mirrors in RTL, in HTML", async () => {
    const path = await bundle("html-action-bar", `import "@looma-test/runtime";`);
    const bar = (id: string) => `
      <ui-action-bar id="${id}">
        <ui-button id="${id}-t" slot="tertiary" variant="ghost">Cancel</ui-button>
        <ui-button id="${id}-s" slot="secondary">Save as draft</ui-button>
        <ui-button id="${id}-p" slot="primary" variant="solid">Save</ui-button>
      </ui-action-bar>`;
    const page = await open(path, `
      ${bars.map(({ id, style, dir }) => `<div style="${style}"${dir ? ` dir="${dir}"` : ""}>${bar(id)}</div>`).join("")}
      <div style="width: 600px"><ui-action-bar id="solo"><ui-button id="solo-p" slot="primary">Save</ui-button></ui-action-bar></div>
      <ui-dialog id="dialog" open label="Unsaved changes">Body${bar("dialog").replace("<ui-action-bar", '<ui-action-bar slot="actions"')}</ui-dialog>`,
    [join(root, "tokens.css")]);
    await checkActionBar(page);
    await page.close();
  });

  it("orders actions by priority, stacks them in a narrow container, and mirrors in RTL, in converted output", async () => {
    const path = await bundle("converted-action-bar", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiActionBar as ActionBar, UiButton as Button, UiDialog as Dialog } from "@looma-test/components";
      const bar = (id, props = {}) => sceneNode(ActionBar, { id, ...props }, {
        tertiary: () => sceneNode(Button, { id: id + "-t", variant: "ghost" }, () => "Cancel"),
        secondary: () => sceneNode(Button, { id: id + "-s" }, () => "Save as draft"),
        primary: () => sceneNode(Button, { id: id + "-p", variant: "solid" }, () => "Save"),
      });
      createScene({ render: () => [
        ...${JSON.stringify(bars)}.map(({ id, style, dir }) => sceneNode("div", { style, dir }, [bar(id)])),
        sceneNode("div", { style: "width: 600px" }, [sceneNode(ActionBar, { id: "solo" }, { primary: () => sceneNode(Button, { id: "solo-p" }, () => "Save") })]),
        sceneNode(Dialog, { id: "dialog", open: true, label: "Unsaved changes" }, { default: () => "Body", actions: () => bar("dialog") }),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkActionBar(page);
    await page.close();
  });
});
