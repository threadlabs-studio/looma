import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Badge box", () => {
  const tones = ["neutral", "accent", "info", "success", "warning", "danger"];
  const variants = ["subtle", "solid", "inverse"];

  // Sizes to its label in a plain block (a table cell), as in a flex row. Subtle variants have a
  // distinct edge; solid variants carry their fill to the edge. Forced colors draw every edge.
  async function checkBadges(page: Page) {
    await page.waitForSelector('#flex :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
    const compact = await page.locator('#compact :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').boundingBox();
    assert.ok(compact && compact.height <= 18 && compact.width <= 18, `compact count badge is ${JSON.stringify(compact)}`);
    const width = (selector: string) => page.locator(selector).evaluate((element) => element.getBoundingClientRect().width);
    const sizes = async () => {
      const block = await width('#block :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      assert.ok(block < 200, `a badge in a 400px block is ${block}px wide`);
      assert.ok(Math.abs(block - await width('#flex :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])')) < 0.5, "a badge in a block is as wide as in a flex row");
      // max-width: 100% still caps a long label (the host is content-box, so padding sits outside it).
      assert.equal(await page.locator('#narrow :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluate((element) => getComputedStyle(element).width), "60px");
    };
    assert.equal(await page.evaluate(() => CSS.supports("text-box-trim: trim-both")), true);
    await sizes();

    const edges = () => page.locator('#tones :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      const badge = element.getAttribute("data-ui-badge-state") ?? element.outerHTML;
      return { badge, border: style.borderTopColor, surface: style.backgroundColor };
    }));
    const drawn = await edges();
    assert.equal(drawn.length, tones.length * variants.length);
    for (const { badge, border, surface } of drawn) {
      if (!badge.includes("variant=inverse") && (badge.includes("variant=subtle") || badge.includes("tone=neutral"))) assert.notEqual(border, surface, `${badge} has a defined edge`);
      else assert.equal(border, surface, `${badge} carries its solid fill to the edge`);
    }

    await page.emulateMedia({ forcedColors: "active" });
    for (const { badge, border, surface } of await edges()) {
      assert.notEqual(border, surface, `${badge} has no edge in forced colors`);
      assert.notEqual(border, "rgba(0, 0, 0, 0)", `${badge} has no edge in forced colors`);
    }
    await page.emulateMedia({ forcedColors: "none" });

    // A browser without text-box-trim skips the @supports block: drop it and measure again.
    await page.evaluate(() => {
      const drop = (list: CSSRuleList, remove: (index: number) => void) => {
        for (let index = list.length - 1; index >= 0; index -= 1) {
          const rule = list[index];
          if (rule instanceof CSSSupportsRule && rule.conditionText.includes("text-box-trim")) remove(index);
          else if (rule instanceof CSSGroupingRule) drop(rule.cssRules, (at) => rule.deleteRule(at));
          else if (rule instanceof CSSStyleRule && rule.cssRules.length) drop(rule.cssRules, (at) => rule.deleteRule(at));
        }
      };
      for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) drop(sheet.cssRules, (at) => sheet.deleteRule(at));
    });
    assert.notEqual(await page.locator('#block :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluate((element) => getComputedStyle(element).textBoxTrim), "trim-both");
    await sizes();
  }

  const body = (badge: (attributes: string, label: string) => string) => `
    <div id="compact">${badge('size="xs" variant="solid" tone="warning"', "1")}</div>
    <div id="block" style="width: 400px">${badge("", "Open")}</div>
    <div id="flex" style="display: flex; width: 400px">${badge("", "Open")}</div>
    <div id="narrow" style="width: 60px">${badge("", "A label longer than its container")}</div>
    <div id="tones">${variants.flatMap((variant) => tones.map((tone) => badge(`variant="${variant}" tone="${tone}"`, tone))).join("")}</div>`;

  it("centers status text optically while preserving ellipsis and descenders in HTML and converted", async () => {
    const cases = [
      ...["md", "xs"].flatMap(size => ["Current", "Paid", "Docs", "Design", "gjpqy a long status with descenders"].map((label, index) => ({ id: `status-${size}-${index}`, label, size, shape: "pill" }))),
      { id: "tag", label: "Current", size: "md", shape: "tag" },
      { id: "square", label: "R", size: "xs", shape: "square" },
    ];
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-badge-text-center`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge } from "@looma-test/components";
        createScene({ render: () => ${JSON.stringify(cases)}.map(({ label, ...props }) => sceneNode(Badge, props, () => label)) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? cases.map(({ id, label, size, shape }) => `<ui-badge id="${id}" size="${size}" shape="${shape}">${label}</ui-badge>`).join(" ") : '<div id="app"></div>',
        [join(root, "tokens.css")]);
      await page.waitForSelector('#status-md-0:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      await page.locator('[id$="-4"]').evaluateAll(elements => elements.forEach(element => { (element as HTMLElement).style.maxWidth = "110px"; }));
      for (const font of ["system-ui", "Arial"]) {
        await page.addStyleTag({ content: `:root { --ui-font-family-sans: ${font}; }` });
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 720 });
          const placements = await page.locator(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluateAll(elements => elements.map(element => {
            const label = element.querySelector(".label")!, style = getComputedStyle(label), box = element.getBoundingClientRect();
            const range = document.createRange(); range.selectNodeContents(label);
            const text = range.getBoundingClientRect(), canvas = document.createElement("canvas").getContext("2d")!;
            canvas.font = style.font;
            const cap = canvas.measureText("H"), ink = canvas.measureText(label.textContent!);
            const baseline = text.bottom - ink.fontBoundingBoxDescent;
            return { id: element.id, capOffset: baseline - cap.actualBoundingBoxAscent / 2 - (box.top + box.bottom) / 2,
              top: baseline - ink.actualBoundingBoxAscent - box.top, bottom: box.bottom - baseline - ink.actualBoundingBoxDescent,
              overflowY: style.overflowY, ellipsis: style.textOverflow, truncated: label.scrollWidth > label.clientWidth };
          }));
          for (const placement of placements) {
            assert.ok(Math.abs(placement.capOffset) < 0.25, `${adapter}/${font}/${width}: ${placement.id} centers its cap and baseline ${JSON.stringify(placement)}`);
            assert.ok(placement.top >= 0 && placement.bottom >= 0, `${adapter}/${font}/${width}: complete ascenders and descenders remain inside the badge ${JSON.stringify(placement)}`);
          }
          for (const placement of placements.filter(placement => placement.id.endsWith("-4"))) {
            assert.equal(placement.truncated, true, "a constrained label still truncates");
            assert.equal(placement.ellipsis, "ellipsis");
            assert.equal(placement.overflowY, "visible", "truncation preserves vertical glyph ink");
          }
          if (width === 375 && font === "system-ui") {
            const ellipsis = await page.locator("#status-md-4").screenshot();
            await page.locator("#status-md-4 .label").evaluate(label => { (label as HTMLElement).style.textOverflow = "clip"; });
            assert.notDeepEqual(await page.locator("#status-md-4").screenshot(), ellipsis, "ellipsis paints when only horizontal overflow is clipped");
            await page.locator("#status-md-4 .label").evaluate(label => { (label as HTMLElement).style.textOverflow = ""; });
          }
        }
      }
      await page.close();
    }
  });

  it("spaces and centers ordinary SVG plus text children in badges and buttons", async () => {
    const icon = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-ordinary-icon-text`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiButton as Button } from "@looma-test/components";
        const icon = () => sceneNode("svg", { width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": "true" }, [sceneNode("path", { d: "m5 12 4 4 10-10", fill: "none", stroke: "currentColor", "stroke-width": 2 })]);
        createScene({ render: () => [sceneNode(Badge, { id: "ordinary-badge" }, () => [icon(), "Ready"]), sceneNode(Button, { id: "ordinary-button" }, () => [icon(), "Save"]), sceneNode(Badge, { id: "ordinary-square", shape: "square" }, () => icon()), sceneNode(Badge, { id: "slot-square", shape: "square" }, { icon })] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `<ui-badge id="ordinary-badge">${icon}Ready</ui-badge><ui-button id="ordinary-button">${icon}Save</ui-button><ui-badge id="ordinary-square" shape="square">${icon}</ui-badge><ui-badge id="slot-square" shape="square">${icon.replace('<svg', '<svg slot="icon"')}</ui-badge>` : '<div id="app"></div>', [join(root, "tokens.css")]);
      await page.waitForSelector(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        for (const id of ['ordinary-badge', 'ordinary-button']) {
          const geometry = await page.locator(`#${id}`).evaluate(element => {
            const label = element.querySelector('.label') ?? element;
            const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
            const range = document.createRange(); range.selectNodeContents(text);
            const word = range.getBoundingClientRect(), icon = element.querySelector('svg')!.getBoundingClientRect(), clip = label.getBoundingClientRect();
            return { alignment: Math.abs((word.top + word.bottom) / 2 - (icon.top + icon.bottom) / 2), gap: word.left - icon.right, top: icon.top - clip.top, bottom: clip.bottom - icon.bottom };
          });
          assert.ok(geometry.alignment <= 2, `${adapter}/${width}/${id}: ordinary icon aligns with text: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.gap >= 3, `${adapter}/${width}/${id}: ordinary icon has spacing: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.top >= -1 && geometry.bottom >= -1, `${adapter}/${width}/${id}: ordinary icon is fully visible: ${JSON.stringify(geometry)}`);
        }
        for (const id of ['ordinary-square', 'slot-square']) {
          const centering = await page.locator(`#${id}`).evaluate(element => {
            const icon = element.querySelector('svg')!.getBoundingClientRect(), badge = element.getBoundingClientRect();
            return { x: Math.abs((icon.left + icon.right - badge.left - badge.right) / 2), y: Math.abs((icon.top + icon.bottom - badge.top - badge.bottom) / 2) };
          });
          assert.ok(centering.x < 1 && centering.y < 1, `${adapter}/${width}/${id}: an icon without text is centered: ${JSON.stringify(centering)}`);
        }
      }
      await page.close();
    }
  });

  it("keeps an icon centered and unclipped beside chip text in HTML and converted", async () => {
    const svg = '<svg slot="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-badge-icon-label`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge } from "@looma-test/components";
        createScene({ render: () => sceneNode(Badge, { id: "chip", tone: "success" }, { icon: () => sceneNode("svg", { width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": "true" }, [sceneNode("path", { d: "m5 12 4 4 10-10", fill: "none", stroke: "currentColor", "stroke-width": 2 })]), default: () => "Yes" }) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `<ui-badge id="chip" tone="success">${svg} Yes</ui-badge>` : '<div id="app"></div>', [join(root, "tokens.css")]);
      await page.waitForSelector('#chip:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.locator('#chip').evaluate(element => {
          const label = element.querySelector('.label')!;
          const word = label.getBoundingClientRect(), icon = element.querySelector('svg')!.getBoundingClientRect(), clip = element.getBoundingClientRect();
          return { alignment: Math.abs((word.top + word.bottom) / 2 - (icon.top + icon.bottom) / 2), iconTop: icon.top, iconBottom: icon.bottom, clipTop: clip.top, clipBottom: clip.bottom, gap: word.left - icon.right };
        });
        assert.ok(geometry.alignment <= 2, `${adapter}: icon and text share a center: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.iconTop >= geometry.clipTop - 1 && geometry.iconBottom <= geometry.clipBottom + 1, `${adapter}: icon is not clipped: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.gap >= 3, `${adapter}: icon has visible separation from text: ${JSON.stringify(geometry)}`);
        const constrained = await page.locator('#chip').evaluate(element => {
          const label = element.querySelector('.label')!;
          label.textContent = 'A long label with descenders gjpqy';
          (element as HTMLElement).style.maxWidth = '110px';
          const icon = element.querySelector('svg')!.getBoundingClientRect(), chip = element.getBoundingClientRect();
          const range = document.createRange(); range.selectNodeContents(label);
          const text = range.getBoundingClientRect(), clip = chip;
          const canvas = document.createElement('canvas').getContext('2d')!;
          canvas.font = getComputedStyle(label).font;
          const metrics = canvas.measureText(label.textContent!);
          const baseline = text.bottom - metrics.fontBoundingBoxDescent;
          const result = { clipped: label.scrollWidth > label.clientWidth, overflow: getComputedStyle(label).textOverflow, vertical: getComputedStyle(label).overflowY, visible: icon.left >= chip.left && icon.right <= chip.right && icon.top >= chip.top && icon.bottom <= chip.bottom,
            top: baseline - metrics.actualBoundingBoxAscent - clip.top, bottom: clip.bottom - baseline - metrics.actualBoundingBoxDescent };
          label.textContent = 'Yes'; (element as HTMLElement).style.maxWidth = '';
          return result;
        });
        assert.equal(constrained.clipped, true);
        assert.equal(constrained.overflow, 'ellipsis');
        assert.equal(constrained.visible, true, 'only the label truncates; the leading icon stays whole');
        assert.equal(constrained.vertical, 'visible', 'label truncation never clips vertical glyph ink');
        assert.ok(constrained.top >= -0.5 && constrained.bottom >= -0.5, 'the badge preserves complete ascenders and descenders');
      }
      await page.close();
    }
  });

  it("sizes to its label and shades subtle edges in every tone, in HTML", async () => {
    const path = await bundle("html-badge-box", `import "@looma-test/runtime";`);
    const page = await open(path, body((attributes, label) => `<ui-badge ${attributes}>${label}</ui-badge>`), [join(root, "tokens.css")]);
    await checkBadges(page);
    await page.close();
  });

  it("sizes to its label and shades subtle edges in every tone, in converted output", async () => {
    const path = await bundle("converted-badge-box", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiBadge as Badge } from "@looma-test/components";
      const tones = ${JSON.stringify(tones)}, variants = ${JSON.stringify(variants)};
      createScene({ render: () => [
        sceneNode("div", { id: "compact" }, [sceneNode(Badge, { size: "xs", variant: "solid", tone: "warning" }, () => "1")]),
        sceneNode("div", { id: "block", style: "width: 400px" }, [sceneNode(Badge, null, () => "Open")]),
        sceneNode("div", { id: "flex", style: "display: flex; width: 400px" }, [sceneNode(Badge, null, () => "Open")]),
        sceneNode("div", { id: "narrow", style: "width: 60px" }, [sceneNode(Badge, null, () => "A label longer than its container")]),
        sceneNode("div", { id: "tones" }, variants.flatMap((variant) => tones.map((tone) => sceneNode(Badge, { variant, tone }, () => tone)))),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkBadges(page);
    await page.close();
  });
});
