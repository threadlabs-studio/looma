import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "vitest";
import { root, bundle, open } from "../renderers/browser-driver";

describe("Card fill", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`fills a bounded column with a short body and keeps long content scrollable in ${adapter}`, async () => {
    const frame = "display:flex;flex-direction:column;block-size:480px;inline-size:280px";
    const path = await bundle(`card-fill-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
      import {createScene,sceneNode as h} from "@looma-test/scene"; import {UiCard as Card,UiScrollArea as ScrollArea} from "@looma-test/components";
      createScene({render:()=>h("div",{id:"frame",style:${JSON.stringify(frame)}},[
        h("header",{},"Panel heading"),
        h(Card,{id:"panel",fill:true,variant:"subtle",tone:"accent",padding:"xs"},()=>
          h(ScrollArea,{id:"scroller",fill:true,tabindex:0},()=>h("div",{id:"body"},"A short list."))),
        h("footer",{id:"footer"},"Persistent actions"),
      ])}).mount("#app");
    `);
    const page = await open(path, adapter === "HTML" ? `
      <div id="frame" style="${frame}"><header>Panel heading</header>
        <ui-card id="panel" fill variant="subtle" tone="accent" padding="xs"><ui-scroll-area id="scroller" fill tabindex="0"><div id="body">A short list.</div></ui-scroll-area></ui-card>
        <footer id="footer">Persistent actions</footer>
      </div>` : '<div id="app"></div>', [join(root,"tokens.css")]);
    try {
      const measure = () => page.evaluate(() => {
        const frame = document.querySelector("#frame")!.getBoundingClientRect();
        const panel = document.querySelector("#panel")!.getBoundingClientRect();
        const footer = document.querySelector("#footer")!.getBoundingClientRect();
        return {frameBottom:frame.bottom,panelBottom:panel.bottom,panelHeight:panel.height,footerTop:footer.top,footerBottom:footer.bottom};
      });
      const short = await measure();
      assert.ok(short.panelHeight > 400, "the surface fills the space even when its content is short");
      assert.ok(Math.abs(short.footerBottom-short.frameBottom)<1, "the footer stays at the column edge");
      assert.ok(Math.abs(short.panelBottom-short.footerTop)<1, "the surface reaches the footer");
      await page.locator("#body").evaluate(body => {
        for(let i=0;i<40;i++){const paragraph=document.createElement("p");paragraph.textContent=`Item ${i}`;body.append(paragraph);}
      });
      const long = await measure();
      assert.ok(Math.abs(long.footerTop-short.footerTop)<1, "long content does not displace the footer");
      await page.locator("#scroller").focus();
      await page.keyboard.press("End");
      await page.waitForFunction(()=>document.querySelector("#scroller")!.scrollTop>0);
      assert.ok(Math.abs((await measure()).panelBottom-short.panelBottom)<1);
    } finally {await page.close();}
  });
});
