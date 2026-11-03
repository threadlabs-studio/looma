import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox chip truncation", () => {
  const label = "workspace:averylongidentifierthatmuststayinsideitsbadge";
  const checkTextRoom = async (page: Page) => {
    const bounds = await page.locator(".item .label").evaluateAll((labels) => labels.map((label) => {
      const badge = label.closest(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])')!, box = badge.getBoundingClientRect();
      const chip = label.closest(".item")!.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = range.getBoundingClientRect();
      const context = document.createElement("canvas").getContext("2d")!;
      context.font = getComputedStyle(label).font;
      const ink = context.measureText(label.textContent!), baseline = text.bottom - ink.fontBoundingBoxDescent;
      return { label: label.textContent, top: Math.max(box.top, chip.top), bottom: Math.min(box.bottom, chip.bottom),
        textTop: baseline - ink.actualBoundingBoxAscent, textBottom: baseline + ink.actualBoundingBoxDescent, overflowY: getComputedStyle(label).overflowY };
    }));
    assert.ok(bounds.length > 0);
    for (const box of bounds) {
      assert.equal(box.overflowY, "visible", `${box.label}: the trimmed label never clips vertical ink`);
      assert.ok(box.textBottom <= box.bottom, `${box.label}: complete descender ink stays inside the badge and chip`);
      assert.ok(box.textTop >= box.top, `${box.label}: complete ascender ink stays inside the badge and chip`);
    }
  };
  const check = async (page: Page) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 812 });
      const chip = page.getByRole("button", { name: `${label}, press Delete or Backspace to remove` });
      await chip.waitFor();
      const geometry = await chip.evaluate((item) => {
        const badge = item.querySelector<HTMLElement>(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])')!;
        const label = badge.querySelector<HTMLElement>(".label")!;
        const box = item.getBoundingClientRect();
        const badgeBox = badge.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        return { itemWidth: box.width, badgeWidth: badgeBox.width, labelInside: labelBox.right <= badgeBox.right && labelBox.left >= badgeBox.left, clipped: label.scrollWidth > label.clientWidth, overflowX: getComputedStyle(label).overflowX, ellipsis: getComputedStyle(label).textOverflow, text: label.textContent };
      });
      assert.ok(geometry.badgeWidth <= geometry.itemWidth + 1, "badge stays within the capped chip");
      assert.ok(geometry.labelInside, "label stays inside the badge");
      assert.ok(geometry.clipped, "long label is constrained");
      assert.equal(geometry.overflowX, "clip");
      assert.equal(geometry.ellipsis, "ellipsis");
      assert.equal(geometry.text, label, "full label remains available to assistive technology");
      await checkTextRoom(page);
      if (width === 375) {
        const ellipsis = await chip.screenshot();
        await chip.locator(".label").evaluate(label => { (label as HTMLElement).style.textOverflow = "clip"; });
        assert.notDeepEqual(await chip.screenshot(), ellipsis, "horizontal-only clipping still paints an ellipsis");
        await chip.locator(".label").evaluate(label => { (label as HTMLElement).style.textOverflow = ""; });
      }
      if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, ".test-build", `chip-ellipsis-${width}.png`) });
    }
    await page.getByRole("combobox", { name: "Filter" }).focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    await expect.poll(() => page.locator(".item").count(), { message: "truncation preserves keyboard removal" }).toBe(0);
  };
  it("ellipsizes native chip labels inside their badge at desktop and 375px", async () => {
    const path = await bundle("html-chip-truncation", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-combobox label="Filter" multiple items='[{"id":"long","value":"long","label":"${label}"}]'><option value="long">${label}</option></ui-combobox>`, [join(root, "tokens.css")]);
    try { await check(page); } finally { await page.close(); }
  });
  it("ellipsizes converted chip labels inside their badge at desktop and 375px", async () => {
    const path = await bundle("converted-chip-truncation", `import { createScene, sceneNode } from "@looma-test/scene"; import { UiCombobox as Combobox } from "@looma-test/components"; createScene({ render: () => sceneNode(Combobox, { label: "Filter", multiple: true, items: [{id: "long", value: "long", label: ${JSON.stringify(label)}}] }, () => sceneNode("option", {value: "long"}, ${JSON.stringify(label)})) }).mount("#app");`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    try { await check(page); } finally { await page.close(); }
  });
  for (const adapter of ["native", "Converted"]) {
    it(`keeps short ${adapter} chip text and descenders visible at desktop and 375px`, async () => {
      const items = [{ id: "date", value: "date", label: "date:today" }, { id: "entry", value: "entry", label: "entry:review" }];
      const options = items.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
      const source = adapter === "native" ? `import "@looma-test/runtime";`
        : `import { createScene, sceneNode } from "@looma-test/scene"; import { UiCombobox as Combobox } from "@looma-test/components"; createScene({ render: () => sceneNode(Combobox, { label: "Filter", multiple: true, items: ${JSON.stringify(items)} }, () => ${JSON.stringify(items)}.map(item => sceneNode("option", {value: item.value}, item.label))) }).mount("#app");`;
      const path = await bundle(`${adapter}-chip-descenders`, source);
      const page = await open(path, adapter === "native" ? `<ui-combobox label="Filter" multiple items='${JSON.stringify(items)}'>${options}</ui-combobox>` : `<div id="app"></div>`, [join(root, "tokens.css")]);
      try {
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 812 });
          await page.locator(".item .label").first().waitFor();
          await checkTextRoom(page);
          if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, ".test-build", `chip-descenders-${adapter}-${width}.png`) });
        }
      } finally { await page.close(); }
    });
  }
});
