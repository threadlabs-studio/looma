import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { type Browser } from "playwright";
import { describe, it } from "vitest";
import { asset, root, bundle, open, browser, loadFixture } from "../renderers/browser-driver";

describe("Button composed content", () => {
  for (const adapter of ["native", "Converted"]) it(`keeps neutral and accent outline tones distinct in ${adapter}`, async () => {
    const path = await bundle(`outline-tones-${adapter}`, adapter === "native" ? `import "@looma-test/runtime";` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button } from "@looma-test/components";
      createScene({ render: () => ["neutral", "accent"].map(tone => sceneNode(Button, { class: "choice", tone, stretch: true, align: "start" }, () => "Project notes")) }).mount("#app");
    `);
    const page = await open(path, adapter === "native" ? ["neutral", "accent"].map(tone => `<ui-button class="choice" tone="${tone}" stretch align="start">Project notes</ui-button>`).join("") : '<div id="app"></div>', [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")], { viewport: { width: 375, height: 812 } });
    try {
      await page.addStyleTag({ content: ".choice { --ui-button-surface: rgb(246 247 249); --ui-button-hover-surface: rgb(235 237 240); transition: none !important; }" });
      const pixel = async (index: number) => {
        const bytes = await page.locator(".choice").nth(index).screenshot();
        return page.evaluate(async base64 => {
          const image = new Image(); image.src = "data:image/png;base64," + base64; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext("2d")!; context.drawImage(image, 0, 0);
          return Array.from(context.getImageData(Math.floor(image.width * .8), Math.floor(image.height / 2), 1, 1).data).slice(0, 3);
        }, bytes.toString("base64"));
      };
      assert.equal(await page.locator(".choice[data-selected]").count(), 0, "ordinary actions have no selection state");
      for (const mode of ["light", "dark"]) {
        await page.locator("html").evaluate((element, mode) => element.setAttribute("data-theme", mode), mode);
        await page.mouse.move(0, 0);
        assert.deepEqual(await pixel(0), [246, 247, 249], `${mode}: neutral outline keeps its neutral resting surface`);
        const accent = await pixel(1);
        assert.notDeepEqual(accent, [246, 247, 249], `${mode}: accent outline retains its intentional wash over the base surface`);
        await page.locator(".choice").nth(1).hover();
        assert.notDeepEqual(await pixel(1), accent, `${mode}: accent hover retains its stronger wash`);
      }
    } finally { await page.close(); }
  });

  for (const adapter of ["native", "Converted"]) for (const engine of ["Chromium", "WebKit"]) {
    it(`keeps ${adapter} image marks beside labels and stretched row actions at the trailing edge in ${engine}`, async () => {
      const image = await asset("button-mark.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="purple"/></svg>');
      const title = "Project notes with a longer title that wraps without moving the trailing action";
      const source = adapter === "native" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiButton as Button, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => [
          sceneNode(Button, { id: "image-action", size: "sm" }, () => [sceneNode("img", { src: ${JSON.stringify(image)}, width: 16, height: 16, alt: "" }), sceneNode("span", { class: "caption" }, "Write with assistant")]),
          sceneNode(Button, { id: "image-link", variant: "link" }, () => [sceneNode("img", { src: ${JSON.stringify(image)}, width: 16, height: 16, alt: "" }), sceneNode("span", { class: "caption" }, "Open conversation")]),
          sceneNode(Button, { id: "choice", stretch: true, align: "start" }, () => [sceneNode(Icon, { name: "folder" }), sceneNode("span", { class: "choice-text" }, [sceneNode("span", ${JSON.stringify(title)}), sceneNode("span", "Shared notes")]), sceneNode(Icon, { class: "arrow", name: "chevron-right" })]),
        ] }).mount("#app");`;
      const path = await bundle(`button-adornments-${adapter}`, source);
      const driver = process.env.LOOMA_WEBKIT_MODULE || "playwright";
      const safari: Browser | undefined = engine === "WebKit" ? await (await import(/* @vite-ignore */ driver)).webkit.launch() : undefined;
      const page = await (safari ?? browser).newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      try {
        const markup = adapter === "native" ? `<ui-button id="image-action" size="sm"><img src='${image}' width="16" height="16" alt=""><span class="caption">Write with assistant</span></ui-button><ui-button id="image-link" variant="link"><img src='${image}' width="16" height="16" alt=""><span class="caption">Open conversation</span></ui-button><ui-button id="choice" stretch align="start"><ui-icon name="folder"></ui-icon><span class="choice-text"><span>${title}</span><span>Shared notes</span></span><ui-icon class="arrow" name="chevron-right"></ui-icon></ui-button>` : '<div id="app"></div>';
        await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${markup}</body></html>`);
        for (const css of [join(root, "tokens.css"), join(dirname(path), "components.css")]) await page.addStyleTag({ path: css });
        await page.addStyleTag({ content: "body { font-family: sans-serif; } img { display: block; } .choice-text { display: grid; flex: 1; min-width: 0; } svg { flex: none; }" });
        await loadFixture(page, path);
        await page.locator("#image-action img").evaluate(image => (image as HTMLImageElement).decode());
        assert.equal(await page.locator("#image-link .label").evaluate(element => getComputedStyle(element).textDecorationLine), "underline", "a composed link label retains its underline");
        assert.equal(await page.locator("#choice .arrow svg path").count(), 1, "the trailing icon paints its chevron");
        for (const width of [375, 1280]) for (const direction of ["ltr", "rtl"]) {
          await page.setViewportSize({ width, height: 812 });
          await page.locator("html").evaluate((element, direction) => element.setAttribute("dir", direction), direction);
          for (const id of ["image-action", "image-link"]) {
            const imageBox = await page.locator(`#${id} img`).boundingBox();
            const caption = await page.locator(`#${id} .caption`).boundingBox();
            assert.ok(imageBox && caption);
            assert.ok(Math.abs(imageBox.y + imageBox.height / 2 - caption.y - caption.height / 2) <= 1, `${id}: an image mark stays centered on the label's line: ${JSON.stringify({ imageBox, caption })}`);
          }
          const geometry = await page.locator("#choice").evaluate(element => {
            const box = element.getBoundingClientRect(), arrow = element.querySelector(".arrow")!.getBoundingClientRect(), style = getComputedStyle(element);
            return { gap: style.direction === "rtl" ? arrow.left - box.left - parseFloat(style.paddingLeft) - parseFloat(style.borderLeftWidth) : box.right - arrow.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth), middle: (arrow.top + arrow.bottom - box.top - box.bottom) / 2, overflow: element.scrollWidth > element.clientWidth };
          });
          assert.ok(Math.abs(geometry.gap) <= 1, `${width}/${direction}: the arrow reaches the trailing content edge, got ${geometry.gap}px`);
          assert.ok(Math.abs(geometry.middle) <= 1, "the arrow remains vertically centered beside wrapped content");
          assert.equal(geometry.overflow, false, "wrapped labels retain room for the arrow");
          if (process.env.LOOMA_SCREENSHOT_DIR && width === 375 && direction === "ltr") await page.screenshot({ path: join(process.env.LOOMA_SCREENSHOT_DIR, `button-adornments-${adapter}-${engine}.png`), clip: { x: 0, y: 0, width: 375, height: 150 } });
        }
      } finally { await page.close(); await safari?.close(); }
    });
  }
});
