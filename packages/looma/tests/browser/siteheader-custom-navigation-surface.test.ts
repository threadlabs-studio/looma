import { expect } from "../renderers/test-context";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("SiteHeader custom navigation surface", () => {
  for(const adapter of ['HTML','Converted'] as const) it(`allows a custom documentation-sidebar trigger without duplicating the automatic control in ${adapter}`, async()=>{
    const path=await bundle(`site-custom-${adapter}`,adapter==='HTML'?'import "@looma-test/runtime";':`
      import {createScene,sceneNode,createState} from "@looma-test/scene";import { UiSiteHeader as SiteHeader, UiIconButton as IconButton } from "@looma-test/components";
      const custom=createState(true);window.useAutomaticNavigation=()=>custom.value=false;
      createScene({render:()=>sceneNode(SiteHeader,null,{
        brand:()=>sceneNode('a',{href:'#home'},'Folio'),
        navigation:()=>sceneNode('a',{id:'guide',href:'#guide'},'Guide'),
        menu:()=>custom.value?sceneNode(IconButton,{id:'custom',label:'Browse documentation',popovertarget:'docs'},()=> 'Docs'):null,
      })}).mount('#app');
    `);
    const page=await open(path,`${adapter==='HTML'?'<ui-site-header><a slot="brand" href="#home">Folio</a><a slot="navigation" id="guide" href="#guide">Guide</a><ui-icon-button slot="menu" id="custom" label="Browse documentation" popovertarget="docs">Docs</ui-icon-button></ui-site-header>':'<div id="app"></div>'}<nav id="docs" popover>Documentation sidebar</nav>`,[join(root,'tokens.css')],{viewport:{width:375,height:700}});
    try{
      const custom=page.getByRole('button',{name:'Browse documentation',exact:true});
      const automatic=page.getByRole('button',{name:'Open navigation',exact:true});
      await expect.poll(() => custom.isVisible()).toBe(true);
      await expect.poll(() => automatic.isVisible()).toBe(false);
      await page.locator('#guide').waitFor({state:'hidden'});
      await custom.click();await expect.poll(() => page.locator('#docs').isVisible()).toBe(true);
      await page.keyboard.press('Escape');
      await page.setViewportSize({width:1440,height:800});
      await custom.waitFor({state:'hidden'});await expect.poll(() => page.locator('#guide').isVisible()).toBe(true);
      await page.setViewportSize({width:375,height:700});
      await custom.waitFor({state:'visible'});
      if(adapter==='HTML') await custom.evaluate(el=>el.remove());
      else await page.evaluate(()=>(window as any).useAutomaticNavigation());
      await automatic.waitFor({state:'visible'});await automatic.click();
      await expect.poll(() => page.getByRole('dialog',{name:'Main',exact:true}).isVisible()).toBe(true);
    }finally{await page.close();}
  });
});
