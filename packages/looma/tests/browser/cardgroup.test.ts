import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("CardGroup", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`aligns native Card regions, wraps and isolates nested cards in ${adapter}`, async () => {
    const path=await bundle(`card-group-${adapter}`,adapter === "HTML" ? 'import "@looma-test/runtime";' : `
      import {createScene,sceneNode} from "@looma-test/scene"; import { UiCardGroup as CardGroup, UiCard as Card } from "@looma-test/components";
      createScene({render:()=>sceneNode(CardGroup,{id:"group",gap:"l"},()=>[0,1,2].map(i=>sceneNode(Card,{class:"card"},{
        header:()=>sceneNode("header",{"data-region":"header"},i===0?"A short title":"A deliberately longer heading that wraps across multiple lines"),
        default:()=>sceneNode("section",{"data-region":"content"},[i===1?"Long content. ".repeat(30):"Short content.",...(i===0?[sceneNode(Card,{id:"nested"},()=>"Independent nested card")]:[])]),
        actions:()=>sceneNode("footer",{"data-region":"actions"},[sceneNode("a",{href:"#read"},"Read"),sceneNode("a",{href:"#offer"},"Offer")]),
      })))}).mount("#app");
    `);
    const cards=[0,1,2].map(i=>`<ui-card class="card"><header slot="header" data-region="header">${i===0?"A short title":"A deliberately longer heading that wraps across multiple lines"}</header><section data-region="content">${i===1?"Long content. ".repeat(30):"Short content."}${i===0?'<ui-card id="nested">Independent nested card</ui-card>':''}</section><footer slot="actions" data-region="actions"><a href="#read">Read</a><a href="#offer">Offer</a></footer></ui-card>`).join('');
    const page=await open(path,adapter === "HTML" ? `<ui-card-group id="group" gap="l">${cards}</ui-card-group>` : '<div id="app"></div>',[join(root,"tokens.css")],{viewport:{width:700,height:900}});
    await page.addStyleTag({content:'#group .card { display:block; grid-template-rows:none; grid-row:auto; gap:0; }'});
    try {
      for(const dir of ["ltr","rtl"]) {
        await page.locator('html').evaluate((el,dir)=>el.setAttribute('dir',dir),dir);
        const rows=await page.locator('.card').evaluateAll(cards=>cards.map(card=>{
          const box=card.getBoundingClientRect();
          return {top:box.top,bottom:box.bottom,rows:[...card.querySelectorAll('[data-region]')].map(region=>region.getBoundingClientRect().top),display:getComputedStyle(card).display,tracks:getComputedStyle(card).gridTemplateRows};
        }));
        assert.equal(rows[0].display,'grid');
        assert.match(rows[0].tracks,/subgrid/);
        for(let region=0;region<3;region++) assert.ok(Math.abs(rows[0].rows[region]-rows[1].rows[region])<1,`${dir}: region ${region} aligns despite different text lengths`);
        assert.ok(rows[2].top>rows[0].bottom,'a wrapped row has its own tracks');
      }
      assert.equal(await page.locator('#nested').evaluate(el=>getComputedStyle(el).display),'flex','nested cards do not join the outer group');
      await page.setViewportSize({width:375,height:900});
      const stacked=await page.locator('.card').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().toJSON()));
      assert.ok(stacked[1].top>stacked[0].bottom);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.locator('#group').evaluate(el=>el.setAttribute('hidden',''));
      await expect.poll(() => page.locator('.card').first().isVisible(), { message: 'hidden groups hide their delegated grid' }).toBe(false);
    } finally {await page.close();}
  });
});
