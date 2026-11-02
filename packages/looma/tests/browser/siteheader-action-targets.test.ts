import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("SiteHeader action targets", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`reserves adjustable space for compact actions in ${adapter}`, async () => {
    const path=await bundle(`site-header-targets-${adapter}`,adapter==="HTML"?'import "@looma-test/runtime";':`
      import {createScene,sceneNode} from "@looma-test/scene"; import { UiSiteHeader as SiteHeader, UiIconButton as IconButton, UiIcon as Icon } from "@looma-test/components";
      createScene({render:()=>sceneNode(SiteHeader,{id:"targets"},{brand:()=>sceneNode("a",{href:"#home"},"Folio"),actions:()=>[
        sceneNode(IconButton,{id:"first-target",size:"sm",label:"Search"},()=>sceneNode(Icon,{name:"search"})),
        sceneNode(IconButton,{id:"second-target",size:"sm",label:"Account"},()=>sceneNode(Icon,{name:"user-round"}))
      ]})}).mount("#app");`);
    const page=await open(path,adapter==="HTML"?'<ui-site-header id="targets"><a slot="brand" href="#home">Folio</a><ui-icon-button slot="actions" id="first-target" size="sm" label="Search"><ui-icon name="search"></ui-icon></ui-icon-button><ui-icon-button slot="actions" id="second-target" size="sm" label="Account"><ui-icon name="user-round"></ui-icon></ui-icon-button></ui-site-header>':'<div id="app"></div>',[join(root,"tokens.css")],{viewport:{width:375,height:700},hasTouch:true});
    try {
      await expect.poll(() => page.getByRole('button',{name:'Open navigation',exact:true}).isVisible(), { message: 'no empty menu without navigation' }).toBe(false);
      const widths=[];
      for(const preferred of [44,30]) {
        await page.locator('html').evaluate((element,value)=>(element as HTMLElement).style.setProperty('--ui-control-min-block-size',value+'px'),preferred);
        const boxes=await page.evaluate(()=>['first-target','second-target'].map(id=>{const b=document.getElementById(id)!.getBoundingClientRect();return {x:b.x,width:b.width};}));
        const distance=boxes[1].x+boxes[1].width/2-boxes[0].x-boxes[0].width/2;
        assert.ok(distance >= (Math.max(boxes[0].width,preferred)+Math.max(boxes[1].width,preferred))/2,'neighboring invisible targets stay separate');
        widths.push(distance);
      }
      assert.ok(widths[1]<widths[0],'the comfort preference adjusts spacing without enlarging the visible buttons');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    } finally {await page.close();}
  });
});
