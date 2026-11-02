import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Independent leading controls and text baselines", () => {
  it("keeps leading checkbox clicks independent, visible row hover and the first text baseline in HTML and converted", async () => {
    for (const framework of ["html", "converted"]) {
      const path = await bundle(`${framework}-leading-baselines`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCheckbox as Checkbox, UiCluster as Cluster, UiList as List, UiListItem as ListItem, UiStack as Stack, UiText as Text } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", [
          sceneNode(List, () => [
            sceneNode(ListItem, { id: "plain", leadingInteractive: true }, { leading: () => sceneNode(Checkbox, { id: "include", label: "Include document", size: "sm" }), default: () => sceneNode("a", { href: "#document" }, [sceneNode("span", { id: "icon" }, "D"), "Document"]) }),
            sceneNode(ListItem, { id: "current", current: true }, () => sceneNode("a", { href: "#current" }, "Current document")),
          ]),
          sceneNode(Cluster, { id: "baseline", align: "baseline", wrap: "nowrap" }, () => [
            sceneNode(Text, { id: "number", size: "md", weight: "normal", font: "sans" }, () => "61"),
            sceneNode(Stack, () => sceneNode("div", { style: "font: 16px/24px var(--ui-font-family-sans, sans-serif); width: 190px" }, [sceneNode("p", { id: "prose", style: "margin: 0" }, "Existing text that wraps onto more than one line of prose.")])),
          ]),
        ]) }).mount("#app");
      `);
      const html = framework === "converted" ? '<div id="app"></div>' : `
        <ui-list><ui-list-item id="plain" leading-interactive><ui-checkbox slot="leading" id="include" label="Include document" size="sm"></ui-checkbox><a href="#document"><span id="icon">D</span>Document</a></ui-list-item>
        <ui-list-item id="current" current><a href="#current">Current document</a></ui-list-item></ui-list>
        <ui-cluster id="baseline" align="baseline" wrap="nowrap"><ui-text id="number" size="md" weight="normal" font="sans">61</ui-text><ui-stack><div style="font: 16px/24px var(--ui-font-family-sans, sans-serif); width: 190px"><p id="prose" style="margin: 0">Existing text that wraps onto more than one line of prose.</p></div></ui-stack></ui-cluster>`;
      const page = await open(path, html, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
      await page.waitForSelector('#plain:is([component~="ui-list-item"], [data-component~="ui-list-item"], .ui-list-item, [ui-list-item])');
      const input = page.getByRole("checkbox", { name: "Include document", exact: true });
      await expect.poll(() => input.count(), { message: `${framework} names the unlabeled checkbox` }).toBe(1);
      await input.check({timeout: 3000});
      await expect.poll(() => input.isChecked()).toBe(true);
      assert.equal(await page.evaluate(() => location.hash), "", "checkbox does not follow the row link");
      const current = await page.locator("#current").evaluate(el => getComputedStyle(el).backgroundColor);
      const row = await page.locator("#plain").boundingBox();
      assert.ok(row);
      await page.mouse.move(row.x + 2, row.y + 2);
      await page.waitForTimeout(200);
      assert.equal(await page.locator("#plain").evaluate(el => getComputedStyle(el).backgroundColor), current, "whole-row hover uses the quiet selection surface");
      await page.locator("#current a").hover();
      await page.waitForTimeout(200);
      assert.equal(await page.locator("#current").evaluate(el => getComputedStyle(el).backgroundColor), current, "hover retains current selection");
      await page.locator("#icon").click();
      assert.equal(await page.evaluate(() => location.hash), "#document", "the ordinary leading icon still follows its row link");
      const glyphs = await page.evaluate(() => ["number", "prose"].map(id => {
        const el = document.getElementById(id)!;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node && !node.textContent?.trim()) node = walker.nextNode();
        if (!node) throw new Error("Expected a visible text node");
        const range = document.createRange(); range.setStart(node!, 0); range.setEnd(node!, 1);
        return range.getBoundingClientRect().y;
      }));
      assert.ok(Math.abs(glyphs[0]! - glyphs[1]!) < 1, `${framework} aligns first glyphs through a wrapped column: ${glyphs}`);
      await page.close();
    }
  });
});
