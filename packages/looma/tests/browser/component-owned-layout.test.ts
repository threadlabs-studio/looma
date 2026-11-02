import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Component-owned layout", () => {
  for (const target of ["html", "converted"] as const) {
    it(`${target}: checkbox alignment resists ordinary consumer CSS and retains an explicit important escape hatch`, async () => {
      const source = target === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCheckbox as Checkbox } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", { id: "fixture" }, [
          sceneNode(Checkbox, { id: "ordinary", checked: true }, () => "Notify me when my link is ready"),
          sceneNode(Checkbox, { id: "overridden", checked: true, style: "align-items:center;gap:60px;padding:12px" }, () => "Notify me when my link is ready"),
          sceneNode(Checkbox, { id: "wrapped" }, { default: () => "A label long enough to wrap over several lines", description: () => "A separate description." })
        ]) }).mount("#app");`;
      const bundlePath = await bundle(`checkbox-layout-ownership-${target}`, source);
      const page = await open(bundlePath, target === "html" ? `<div id="fixture">
        <ui-checkbox id="ordinary" checked>Notify me when my link is ready</ui-checkbox>
        <ui-checkbox id="overridden" checked style="align-items:center;gap:60px;padding:12px">Notify me when my link is ready</ui-checkbox>
        <ui-checkbox id="wrapped">A label long enough to wrap over several lines<span slot="description">A separate description.</span></ui-checkbox>
      </div>` : `<div id="app"></div>`, [join(root, "tokens.css")], {reducedMotion:"reduce"});
      await page.addStyleTag({ content: `#fixture #overridden { align-items:center;gap:60px;flex-direction:column;flex-wrap:wrap;justify-content:center; } #fixture #overridden input { margin-top:40px;align-self:center;padding:20px;transform:translateY(20px); } #fixture #overridden .text { font:26px/2 serif;padding:20px;margin:20px;align-self:center;order:-1; } #fixture #overridden .label { position:absolute;transform:translateY(20px);margin-top:20px; } #fixture #overridden input::after { inset:0;inline-size:80px;block-size:80px;translate:0 40px;transform:translateY(30px); } #wrapped { inline-size:16rem; }` });
      for (const fontSize of [12, 16, 24]) {
        await page.locator("#fixture").evaluate((element, size) => { (element as HTMLElement).style.fontSize = `${size}px`; }, fontSize);
        for (const id of ["ordinary", "overridden", "wrapped"]) {
          const delta = await page.locator(`#${id}`).evaluate((element) => {
            const input = element.querySelector("input")!.getBoundingClientRect();
            const label = element.querySelector(".label")!;
            const text = label.getBoundingClientRect();
            const style = getComputedStyle(label);
            return (input.top + input.height / 2) - (text.top + parseFloat(style.paddingTop) + parseFloat(style.lineHeight) / 2);
          });
          assert.ok(Math.abs(delta) < 0.6, `${target} ${id} at ${fontSize}px centres on the first label line: ${delta}`);
        }
      }
      const mark = (id: string) => page.locator(`#${id} input`).evaluate(input => {
        const style = getComputedStyle(input, '::after');
        return Object.fromEntries(['top','left','width','height','translate','transform'].map(property => [property, style.getPropertyValue(property)]));
      });
      assert.deepEqual(await mark('overridden'), await mark('ordinary'), 'normal consumer CSS cannot move or stretch the checkmark');
      assert.equal(await page.locator("#overridden").evaluate(element => getComputedStyle(element).alignItems), "flex-start");
      await page.locator("#overridden").evaluate(element => { (element as HTMLElement).style.setProperty("align-items", "center", "important"); });
      assert.equal(await page.locator("#overridden").evaluate(element => getComputedStyle(element).alignItems), "center");
      const beforeEscape=(await page.locator('#wrapped input').boundingBox())!.y;
      await page.locator('#wrapped').evaluate(el=>(el as HTMLElement).style.setProperty('align-items','center','important'));
      const afterEscape=(await page.locator('#wrapped input').boundingBox())!.y;
      assert.ok(Math.abs(afterEscape-beforeEscape)>1,'the explicit important escape changes actual placement, not only a computed property');
      await page.close();
    });
  }
});
