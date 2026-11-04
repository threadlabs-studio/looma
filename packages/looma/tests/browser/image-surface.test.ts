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
    it(`owns corner resize, cancellation, and bounds in ${adapter}`, async () => {
      const path = await bundle(`image-surface-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiImage as Image } from "@looma-test/components";
        createScene({ render: () => sceneNode(Image, { id: "image", src: ${JSON.stringify(source)}, alt: "Landscape", width: 160, height: 80, selected: true, resizable: true }) }).mount("#mount");
      `);
      const page = await open(path, `<div style="width: 260px; padding: 20px; box-sizing: border-box">${adapter === "HTML" ? `<ui-image id="image" src="${source}" alt="Landscape" width="160" height="80" selected resizable></ui-image>` : '<div id="mount"></div>'}</div>`, [join(root, "tokens.css")], {}, async page => {
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
      assert.equal(await page.locator("#grid .crop-guides").evaluate(el=>getComputedStyle(el).display),"none","Crop guides remain opt-in");
      assert.ok(await page.locator("#grid").evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.close();
    });
  }
  for (const adapter of ["HTML", "Converted"]) {
    it(`keeps the complete image visible with proportionate saved crop guides in ${adapter}`, async () => {
      const path = await bundle(`image-crop-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiImage as Image } from "@looma-test/components";
        createScene({ render: () => sceneNode(Image, { id:"image", src:${JSON.stringify(source)}, alt:"Landscape", width:160, height:80, guides:"both", cropX:.25, cropY:0, cropWidth:.5, cropHeight:1 }) }).mount("#mount");
      `);
      const page = await open(path, `<div style="width:200px">${adapter === "HTML" ? `<ui-image id="image" src="${source}" alt="Landscape" width="160" height="80" guides="both" crop-x=".25" crop-y="0" crop-width=".5" crop-height="1"></ui-image>` : '<div id="mount"></div>'}</div>`, [join(root,"tokens.css")], {}, async page => {
        await page.route(source, route => route.fulfill({contentType:"image/svg+xml",body:svg}));
      });
      await page.locator("#image img").evaluate(async element => {await (element as HTMLImageElement).decode();});
      const image=(await page.locator("#image img").boundingBox())!;
      const region=await page.locator("#image .crop-square").evaluate(element=>{
        const rect=element as SVGGraphicsElement,bounds=rect.getBBox(),matrix=rect.getScreenCTM()!;
        const start=new DOMPoint(bounds.x,bounds.y).matrixTransform(matrix),end=new DOMPoint(bounds.x+bounds.width,bounds.y+bounds.height).matrixTransform(matrix);
        return {x:start.x,y:start.y,width:end.x-start.x,height:end.y-start.y};
      });
      assert.ok(Math.abs(image.width/image.height-2)<.01,"Full image retains its landscape aspect ratio");
      assert.ok(Math.abs(region.x-image.x-image.width*.25)<1);
      assert.ok(Math.abs(region.width-image.width*.5)<1);
      assert.ok(Math.abs(region.height-image.height)<1);
      assert.ok(Math.abs(region.width-region.height)<1,"Square and circle guides share the saved square crop");
      assert.equal(await page.locator("#image .crop-guides").getAttribute("aria-hidden"),"true");
      await page.close();
    });
  }
  it("renders semantic media on the server before controllers run", async () => {
    const { createHydratedScene, sceneNode } = await import("@looma-test/scene");
    const { renderSceneToString } = await import("@looma-test/scene");
    const { UiImage: Image } = await import("@looma-test/components");
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Image, { src: source, alt: "Landscape", width: 160, height: 80 }) }));
    const document = new JSDOM(html).window.document;
    assert.equal(document.querySelector(componentRoot("ui-image"))?.localName, "figure");
    const image = document.querySelector("img")!;
    assert.deepEqual([image.getAttribute("alt"), image.getAttribute("width"), image.getAttribute("height")], ["Landscape", "160", "80"]);
    assert.equal(document.querySelector(".handles")?.hasAttribute("hidden"), true);
  });
});
