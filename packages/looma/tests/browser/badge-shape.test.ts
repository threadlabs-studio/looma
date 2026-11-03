import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Badge shape", () => {
  it("keeps compact text pills padded without enlarging fixed marks in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-compact-pill`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge } from "@looma-test/components";
        createScene({ render: () => [
          sceneNode(Badge, { id: "compact", size: "xs" }, () => "On track"),
          sceneNode(Badge, { id: "regular" }, () => "On track"),
          sceneNode(Badge, { id: "circle", shape: "circle", size: "xs" }, () => "7"),
          sceneNode(Badge, { id: "square", shape: "square", size: "xs" }, () => "A")
        ] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-badge id="compact" size="xs">On track</ui-badge>
        <ui-badge id="regular">On track</ui-badge>
        <ui-badge id="circle" shape="circle" size="xs">7</ui-badge>
        <ui-badge id="square" shape="square" size="xs">A</ui-badge>
      ` : '<div id="app"></div>', [join(root, "tokens.css")]);
      await page.waitForSelector('#compact:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.locator(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element), bounds = element.getBoundingClientRect();
          return { id: element.id, start: parseFloat(style.paddingInlineStart), end: parseFloat(style.paddingInlineEnd), width: bounds.width, height: bounds.height };
        }));
        const compact = geometry.find(mark => mark.id === "compact")!, regular = geometry.find(mark => mark.id === "regular")!;
        assert.equal(compact.start, 4, `${adapter}/${width}: compact pill separates text from its leading edge`);
        assert.equal(compact.end, 4, `${adapter}/${width}: compact pill separates text from its trailing edge`);
        assert.equal(regular.start, 8, "ordinary pill spacing stays unchanged");
        assert.equal(regular.end, 8, "ordinary pill spacing stays unchanged");
        for (const [id, size] of [["circle", 16], ["square", 24]] as const) {
          const mark = geometry.find(mark => mark.id === id)!;
          assert.equal(mark.start, 0, "fixed shapes retain their own centered geometry");
          assert.equal(mark.end, 0, "fixed shapes retain their own centered geometry");
          assert.equal(mark.width, size);
          assert.equal(mark.height, size);
        }
      }
      await page.close();
    }
  });

  it("draws a tag flat at the start and pointed at the end, leaving the pill as it was", async () => {
    const path = await bundle("html-badge-shape", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-badge id="pill">Pill</ui-badge>
      <ui-badge id="tag" shape="tag">Tag</ui-badge>
      <ui-badge id="rtl" shape="tag" dir="rtl">Tag</ui-badge>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#rtl:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
    const shape = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { clip: style.clipPath, radius: style.borderTopLeftRadius, border: style.borderTopColor, end: style.paddingInlineEnd, start: style.paddingInlineStart };
    });
    const pill = await shape("#pill"), tag = await shape("#tag"), rtl = await shape("#rtl");
    assert.equal(pill.clip, "none");
    assert.notEqual(pill.radius, "0px");
    assert.match(tag.clip, /^polygon\(/);
    assert.equal(tag.radius, "0px");
    assert.equal(tag.border, "rgba(0, 0, 0, 0)");
    // The point takes room of its own, so the label never runs into it.
    assert.ok(parseFloat(tag.end) > parseFloat(tag.start));
    assert.ok(parseFloat(rtl.start) > parseFloat(rtl.end));
    assert.notEqual(rtl.clip, tag.clip);
    await page.close();
  });

  it("keeps an outline around pill and pointed tag shapes in light, dark, and forced colours", async () => {
    const path = await bundle("html-badge-outline", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-badge id="pill" variant="outline" tone="danger">Danger</ui-badge>
      <ui-badge id="tag" variant="outline" shape="tag" tone="danger">Danger</ui-badge>
      <ui-badge id="rtl" variant="outline" shape="tag" tone="danger" dir="rtl">Danger</ui-badge>
      ${["neutral", "accent", "info", "success", "warning", "danger"].map((tone) => `<ui-badge id="tone-${tone}" variant="outline" tone="${tone}">${tone}</ui-badge>`).join("")}
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css"), join(root, "theme-high-contrast.css")]);
    const paint = (selector: string) => page.locator(selector).evaluate((element) => ({
      border: getComputedStyle(element).borderTopColor,
      outer: getComputedStyle(element).backgroundColor,
      inner: getComputedStyle(element, "::before").backgroundColor,
      innerClip: getComputedStyle(element, "::before").clipPath,
    }));
    for (const theme of ["light", "dark", "high contrast"]) {
      await page.evaluate((value) => {
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.removeAttribute("data-contrast");
        document.documentElement.setAttribute(value === "high contrast" ? "data-contrast" : "data-theme", value === "high contrast" ? "high" : value);
      }, theme);
      const pill = await paint("#pill");
      const tag = await paint("#tag");
      const rtl = await paint("#rtl");
      assert.notEqual(pill.border, pill.outer, `${theme}: pill draws an outline`);
      assert.equal(tag.outer, pill.border, `${theme}: tag's outer shape uses the border colour`);
      assert.equal(tag.inner, pill.outer, `${theme}: tag's inner shape uses the surface colour`);
      assert.notEqual(tag.innerClip, rtl.innerClip, `${theme}: the pointed inner edge mirrors in RTL`);
      const ratios = await page.evaluate(() => {
        const context = document.createElement("canvas").getContext("2d")!;
        const luminance = (colour: string) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = colour;
          context.fillRect(0, 0, 1, 1);
          const channels = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
        };
        return ["neutral", "accent", "info", "success", "warning", "danger"].map((tone) => {
          const style = getComputedStyle(document.getElementById(`tone-${tone}`)!);
          const [bright, dim] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
          return { tone, ratio: (bright! + 0.05) / (dim! + 0.05) };
        });
      });
      for (const { tone, ratio } of ratios) assert.ok(ratio >= 4.5, `${theme}: ${tone} outline text is ${ratio.toFixed(2)}:1`);
    }
    await page.emulateMedia({ forcedColors: "active" });
    const pill = await paint("#pill"), tag = await paint("#tag");
    assert.notEqual(pill.border, pill.outer, "forced colours: pill keeps an edge");
    assert.notEqual(tag.outer, tag.inner, "forced colours: tag keeps its pointed edge");
    await page.close();
  });
});
