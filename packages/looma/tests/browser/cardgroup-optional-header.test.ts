import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("CardGroup optional header", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`keeps headerless body content in natural flow with trailing primary actions in ${adapter}`, async () => {
    const path = await bundle(`headerless-cards-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
      import {createScene,sceneNode} from "@looma-test/scene"; import { UiCardGroup as CardGroup, UiCard as Card, UiStack as Stack, UiText as Text, UiActionBar as ActionBar, UiButton as Button } from "@looma-test/components";
      createScene({render:()=>sceneNode(CardGroup,{columns:2},()=>[0,1].map(i=>sceneNode(Card,{class:"card"},{
        default:()=>sceneNode(Stack,{gap:"s"},()=>[sceneNode(Text,{"data-title":"",as:"h2"},()=>i?"A longer title that wraps naturally across several lines":"Archive"),sceneNode(Text,{"data-summary":""},()=>"A summary that stays beside its own title.")]),
        actions:()=>sceneNode(ActionBar,{}, {primary:()=>sceneNode(Button,{"data-action":""},()=>"Open")}),
      })))}).mount("#app");
    `);
    const cards=[0,1].map(i=>`<ui-card class="card"><ui-stack gap="s"><ui-text data-title as="h2">${i?"A longer title that wraps naturally across several lines":"Archive"}</ui-text><ui-text data-summary>A summary that stays beside its own title.</ui-text></ui-stack><ui-action-bar slot="actions"><ui-button data-action slot="primary">Open</ui-button></ui-action-bar></ui-card>`).join('');
    const page=await open(path,adapter === "HTML"?`<ui-card-group columns="2">${cards}</ui-card-group>`:'<div id="app"></div>',[join(root,"tokens.css")],{viewport:{width:1100,height:800}});
    try {
      for(const width of [1100,375]) for(const dir of ["ltr","rtl"]) {
        await page.setViewportSize({width,height:800});
        await page.locator('html').evaluate((element,value)=>element.setAttribute('dir',value),dir);
        const geometry=await page.locator('.card').evaluateAll(cards=>cards.map(card=>{
          const box=card.getBoundingClientRect(),style=getComputedStyle(card),title=card.querySelector('[data-title]')!.getBoundingClientRect(),summary=card.querySelector('[data-summary]')!.getBoundingClientRect(),action=card.querySelector('[data-action]')!.getBoundingClientRect();
          return {top:title.top-box.top-parseFloat(style.paddingTop)-parseFloat(style.borderTopWidth),bodyGap:summary.top-title.bottom,actionTop:action.top,end:style.direction==='rtl'?action.left-box.left-parseFloat(style.paddingLeft)-parseFloat(style.borderLeftWidth):box.right-action.right-parseFloat(style.paddingRight)-parseFloat(style.borderRightWidth)};
        }));
        for(const card of geometry){assert.ok(Math.abs(card.top)<1,'an omitted header reserves no empty band before the body');assert.ok(card.bodyGap>=0&&card.bodyGap<24,'each summary follows its own title');assert.ok(Math.abs(card.end)<1,'primary actions reach the logical trailing edge');}
        if(width===1100)assert.ok(Math.abs(geometry[0].actionTop-geometry[1].actionTop)<1,'actions still align across different body lengths');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
    } finally {await page.close();}
  });
});
