import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("SiteHeader brand images", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`keeps wide brand images inside their allocation beside mobile controls in ${adapter}`, async () => {
    const src = 'data:image/svg+xml,%3Csvg%20xmlns="http://www.w3.org/2000/svg"%20width="600"%20height="80"%3E%3Crect%20width="600"%20height="80"%20fill="teal"/%3E%3C/svg%3E';
    const path = await bundle(`site-brand-image-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
      import {createScene,sceneNode} from "@looma-test/scene";
      import {UiSiteHeader,UiIconButton,UiIcon} from "@looma-test/components";
      createScene({render:()=>sceneNode(UiSiteHeader,{id:"site"},{
        brand:()=>sceneNode("a",{href:"#home",id:"brand"},[sceneNode("img",{id:"mark",alt:"",src:${JSON.stringify(src)},style:{blockSize:"32px",inlineSize:"auto",flexShrink:0}}),sceneNode("span",{style:{overflow:"hidden",whiteSpace:"nowrap"}},"Folio")]),
        menu:()=>sceneNode(UiIconButton,{label:"Documentation",popovertarget:"docs"},()=>sceneNode(UiIcon,{name:"menu"})),
        actions:()=>["Search","Account","Appearance"].map(label=>sceneNode(UiIconButton,{label},()=>sceneNode(UiIcon,{name:"search"}))),
      })}).mount("#app");
    `);
    const markup = `<ui-site-header id="site"><a slot="brand" href="#home" id="brand"><img id="mark" alt="" src='${src}' style="block-size:32px;inline-size:auto;flex-shrink:0"><span style="overflow:hidden;white-space:nowrap">Folio</span></a><ui-icon-button slot="menu" label="Documentation" popovertarget="docs"><ui-icon name="menu"></ui-icon></ui-icon-button>${["Search","Account","Appearance"].map(label=>`<ui-icon-button slot="actions" label="${label}"><ui-icon name="search"></ui-icon></ui-icon-button>`).join('')}</ui-site-header>`;
    const page = await open(path,(adapter === "HTML" ? markup : '<div id="app"></div>')+'<nav id="docs" popover>Documentation</nav>',[join(root,"tokens.css")],{viewport:{width:375,height:700}});
    try {
      await page.waitForFunction(()=>document.querySelector<HTMLImageElement>('#mark')?.naturalWidth === 600);
      for (const dir of ["ltr","rtl"]) {
        await page.locator('html').evaluate((element,dir)=>element.setAttribute('dir',dir),dir);
        const geometry = await page.locator('#site').evaluate(header=>{
          const mark = header.querySelector('#mark')!.getBoundingClientRect(), brand = header.querySelector('#brand')!.getBoundingClientRect(), menu = header.querySelector('button[aria-label="Documentation"]')!.getBoundingClientRect();
          return {inside:mark.left>=brand.left-1&&mark.right<=brand.right+1,separate:mark.right<=menu.left||mark.left>=menu.right,fit:getComputedStyle(header.querySelector('#mark')!).objectFit};
        });
        assert.ok(geometry.inside,`${dir}: the wide image stays inside the brand allocation`);
        assert.ok(geometry.separate,`${dir}: the image does not overlap the navigation button`);
        assert.equal(geometry.fit,'contain','fixed-height wordmarks preserve their aspect ratio');
        await page.getByRole('button',{name:'Documentation',exact:true}).press('Enter');
        await page.locator('#docs').waitFor({state:'visible'});
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      }
    } finally {await page.close();}
  });
});
