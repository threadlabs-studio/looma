import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("CardButton layout", () => {
  it("uses a decorative neutral card edge while preserving accent outline and neutral navigation colors in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-neutral-card-edge`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiButton as Button } from "@looma-test/components";
        createScene({ render: () => [sceneNode(Button, { id: "card", variant: "card", tone: "neutral" }, () => "Changed files"),
          sceneNode(Button, { id: "outline" }, () => "View changes"), sceneNode(Button, { id: "navigation", variant: "ghost", tone: "neutral" }, () => "History")] }).mount("#app");
      `);
      const page = await open(path, adapter === "converted" ? '<div id="app"></div>' : '<ui-button id="card" variant="card" tone="neutral">Changed files</ui-button><ui-button id="outline">View changes</ui-button><ui-button id="navigation" variant="ghost" tone="neutral">History</ui-button>',
        [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")]);
      try {
        await page.addStyleTag({ content: "* { transition: none !important; } body { font-family: var(--ui-font-family-sans); }" });
        const neutral = await page.locator("#card").evaluate(element => {
          const probe = document.createElement("span"); probe.style.borderColor = "var(--ui-border)"; element.append(probe);
          const result = { actual: getComputedStyle(element).borderTopColor, expected: getComputedStyle(probe).borderTopColor }; probe.remove(); return result;
        });
        assert.equal(neutral.actual, neutral.expected, "a quiet card uses the standard decorative border");
        assert.notEqual(await page.locator("#outline").evaluate(element => getComputedStyle(element).borderTopColor), neutral.actual, "ordinary accent actions retain their purple edge");
        assert.equal(await page.locator("#navigation").evaluate(element => getComputedStyle(element).color), await page.locator("#card").evaluate(element => getComputedStyle(element).color), "neutral navigation retains its ink");
        await page.locator("#card").hover();
        assert.notEqual(await page.locator("#card").evaluate(element => getComputedStyle(element).borderTopColor), await page.locator("#card").evaluate(element => getComputedStyle(element).color), "hover keeps a decorative edge instead of an ink outline");
        await page.setViewportSize({ width: 375, height: 720 });
        await page.mouse.move(0, 700);
        if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, ".test-build", `${adapter}-neutral-card-375.png`) });
      } finally { await page.close(); }
    }
  });

  for (const adapter of ["native", "Converted"]) {
    it(`keeps ${adapter} icon/content top-aligned and action centered with equal edges at 375px and RTL`, async () => {
      const label = "Read the latest project notes and decisions, including the changes that need another look.";
      const source = adapter === "native" ? `import "@looma-test/runtime";`
        : `import {createScene,sceneNode} from "@looma-test/scene"; import { UiButton as Button, UiIcon as Icon } from "@looma-test/components"; createScene({render:()=>sceneNode(Button,{variant:"card",tone:"accent",id:"card"},{default:()=>${JSON.stringify(label)},icon:()=>sceneNode(Icon,{name:"book-user","aria-hidden":"true"})})}).mount("#app");`;
      const path = await bundle(`card-button-${adapter}`, source);
      const page = await open(path, adapter === "native" ? `<ui-button id="card" variant="card" tone="accent"><ui-icon slot="icon" name="book-user" aria-hidden="true"></ui-icon>${label}</ui-button>` : `<div id="app"></div>`, [join(root,"tokens.css")]);
      try {
        for (const width of [1280,375]) for (const dir of ["ltr","rtl"]) {
          await page.setViewportSize({width,height:812});
          await page.locator("html").evaluate((el,dir)=>el.setAttribute("dir",dir),dir);
          const geometry = await page.locator("#card").evaluate(el => {
            const style=getComputedStyle(el), box=el.getBoundingClientRect();
            const icon=el.querySelector(".card-icon")!.getBoundingClientRect(), content=el.querySelector(".card-content")!.getBoundingClientRect(), action=el.querySelector(".card-action")!.getBoundingClientRect();
            return {contentHeight:content.height,lineHeight:parseFloat(style.lineHeight),contentMiddle:(content.top+content.bottom)/2,iconHeight:icon.height,height:box.height,overflow:document.documentElement.scrollWidth>innerWidth,iconTop:icon.top,contentTop:content.top,actionMiddle:(action.top+action.bottom)/2,middle:(box.top+box.bottom)/2,paddingStart:style.paddingInlineStart,paddingEnd:style.paddingInlineEnd,borders:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],colors:[style.borderTopColor,style.borderRightColor,style.borderBottomColor,style.borderLeftColor],gap:style.columnGap};
          });
          assert.ok(geometry.height>=44); assert.ok(geometry.iconHeight>0); assert.equal(geometry.overflow,false);
          assert.ok(Math.abs(geometry.iconTop-geometry.contentTop)<=1);
          assert.ok(Math.abs(geometry.actionMiddle-geometry.middle)<=1);
          if (geometry.contentHeight <= geometry.lineHeight + 1) {
            assert.ok(Math.abs(geometry.contentMiddle-geometry.middle)<=1, "a single-line label is vertically centered within the card");
          }
          assert.equal(geometry.paddingStart,geometry.paddingEnd);
          assert.equal(new Set(geometry.borders).size,1); assert.equal(new Set(geometry.colors).size,1);
          assert.notEqual(geometry.gap,"normal");
        }
        await page.locator("#card").evaluate(el=>{ (window as unknown as {cardClicks:number}).cardClicks=0; el.addEventListener("click",()=>{(window as unknown as {cardClicks:number}).cardClicks++}); });
        await page.locator("#card").focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#card").evaluate(el=>el===document.activeElement),true);
        assert.equal(await page.evaluate(()=>(window as unknown as {cardClicks:number}).cardClicks),1);
        await page.locator("html").evaluate(el=>el.setAttribute("dir","ltr"));
        if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({path:join(root,".build",`card-button-${adapter}-375.png`)});
        await page.locator("#card .card-icon").evaluate(el=>el.replaceChildren());
        assert.equal(await page.locator("#card .card-icon").evaluate(el=>getComputedStyle(el).display),"none");

      } finally {await page.close();}
    });
  }
});
