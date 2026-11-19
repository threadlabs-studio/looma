import { JSDOM } from "jsdom";
import { componentRoot } from "../renderers/selectors";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Image surface", () => {
  const source = "https://example.test/primitive-image.svg";
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><rect width="160" height="80" fill="#569d86"/></svg>';
  for (const adapter of ["HTML", "Converted"]) {
    it(`keeps inline placement within its text line in ${adapter}`, async () => {
      const path = await bundle(`image-inline-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiImage as Image } from "@looma-test/components";
        createScene({ render: () => sceneNode("p", { id: "line" }, ["Before ", sceneNode(Image, { src: ${JSON.stringify(source)}, alt: "Landscape", width: 48, height: 24, placement: "inline" }), " after."]) }).mount("#mount");
      `);
      const page = await open(path, `<style>:where(img, picture) { display: block; }</style><div style="width: 350px">${adapter === "HTML" ? `<p id="line">Before <ui-image src="${source}" alt="Landscape" width="48" height="24" placement="inline"></ui-image> after.</p>` : '<div id="mount"></div>'}</div>`, [join(root, "tokens.css")], {}, async page => {
        await page.route(source, route => route.fulfill({ contentType: "image/svg+xml", body: svg }));
      });
      await page.locator("#line img").evaluate(async element => { await (element as HTMLImageElement).decode(); });
      const positions = await page.locator("#line").evaluate(line => {
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        let before: Node | null;
        while ((before = walker.nextNode()) && before.textContent?.trim() !== "Before") { /* Ignore renderer markers and find the visible text. */ }
        if (!before) throw new Error("Before text is missing");
        const range = document.createRange(); range.selectNodeContents(before);
        const text = range.getBoundingClientRect(), image = line.querySelector("img")!.getBoundingClientRect();
        return { textRight: text.right, textTop: text.top, textBottom: text.bottom, imageLeft: image.left, imageTop: image.top, imageBottom: image.bottom };
      });
      assert.ok(positions.imageLeft >= positions.textRight - 1);
      assert.ok(positions.imageTop < positions.textBottom && positions.imageBottom > positions.textTop);
      await page.close();
    });
    it.each(["block", "inline"] as const)(`owns corner resize, cancellation, and bounds in ${adapter} %s placement`, async placement => {
      const path = await bundle(`image-surface-${adapter}-${placement}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiImage as Image } from "@looma-test/components";
        createScene({ render: () => sceneNode(Image, { id: "image", src: ${JSON.stringify(source)}, alt: "Landscape", width: 160, height: 80, placement: ${JSON.stringify(placement)}, selected: true, resizable: true }) }).mount("#mount");
      `);
      const page = await open(path, `<div style="width: 260px; padding: 20px; box-sizing: border-box">${adapter === "HTML" ? `<ui-image id="image" src="${source}" alt="Landscape" width="160" height="80" placement="${placement}" selected resizable></ui-image>` : '<div id="mount"></div>'}</div>`, [join(root, "tokens.css")], {}, async page => {
        await page.route(source, route => route.fulfill({ contentType: "image/svg+xml", body: svg }));
      });
      await page.locator("#image img").evaluate(async element => { await (element as HTMLImageElement).decode(); });
      await page.evaluate(() => {
        (window as unknown as { resizeEvents: unknown[] }).resizeEvents = [];
        document.querySelector("#image")!.addEventListener("resize", event => {
          (window as unknown as { resizeEvents: unknown[] }).resizeEvents.push((event as CustomEvent).detail);
        });
      });
      for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
        const handle = page.locator(`#image [data-corner="${corner}"]`);
        const box = (await handle.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + (corner.endsWith("left") ? -40 : 40), box.y + box.height / 2 + (corner.startsWith("top") ? -20 : 20));
        assert.ok(Math.abs((await page.locator("#image img").boundingBox())!.width - 200) < 1);
        await page.mouse.up();
        const event = await page.evaluate(() => (window as unknown as { resizeEvents: { width: number; height: number; phase: string; trigger: string }[] }).resizeEvents.at(-1));
        assert.deepEqual(event, { width: 200, height: 100, phase: "commit", trigger: "pointer" });
      }
      const handle = page.locator('#image [data-corner="bottom-right"]');
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 600, box.y + box.height / 2 + 300);
      assert.ok((await page.locator("#image img").boundingBox())!.width <= 220);
      await handle.dispatchEvent("pointercancel", { pointerId: 1 });
      await page.mouse.up();
      assert.ok(Math.abs((await page.locator("#image img").boundingBox())!.width - 160) < 1);
      const cancelled = await page.evaluate(() => (window as unknown as { resizeEvents: { phase: string }[] }).resizeEvents.at(-1)?.phase);
      assert.equal(cancelled, "cancel");
      await page.close();
    });
  }
  for (const adapter of ["HTML", "Converted"]) {
    it(`fits narrow grid tracks without horizontal scrolling in ${adapter}`, async () => {
      const path = await bundle(`image-grid-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiImage as Image } from "@looma-test/components";
        createScene({ render: () => sceneNode(Image, { src: ${JSON.stringify(source)}, alt: "Landscape", width: 480, height: 240 }) }).mount("#grid");
      `);
      const page = await open(path, `<div id="grid" style="display: grid; place-items: center; width: 260px; padding: 20px; box-sizing: border-box">${adapter === "HTML" ? `<ui-image src="${source}" alt="Landscape" width="480" height="240"></ui-image>` : '<div id="mount"></div>'}</div>`, [join(root, "tokens.css")], {}, async page => {
        await page.route(source, route => route.fulfill({ contentType: "image/svg+xml", body: svg }));
      });
      await page.locator("#grid img").evaluate(async element => { await (element as HTMLImageElement).decode(); });
      assert.ok((await page.locator("#grid img").boundingBox())!.width <= 220);
      assert.ok(await page.locator("#grid").evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.close();
    });
  }
  it.each(["block", "inline"] as const)("renders semantic %s media on the server before controllers run", async placement => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiImage: Image } = await import("@looma-test/components");
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Image, { src: source, alt: "Landscape", width: 160, height: 80, placement }) }));
    const document = new JSDOM(html).window.document;
    assert.equal(document.querySelector(componentRoot("ui-image"))?.localName, placement === "inline" ? "span" : "figure");
    const image = document.querySelector("img")!;
    assert.deepEqual([image.getAttribute("alt"), image.getAttribute("width"), image.getAttribute("height")], ["Landscape", "160", "80"]);
    if (placement === "inline") assert.equal(new JSDOM(`<p>${html}After</p>`).window.document.querySelector("p img")?.getAttribute("alt"), "Landscape");
    assert.equal(document.querySelector(".handles")?.hasAttribute("hidden"), true);
  });
});
