import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open, asset } from "../renderers/browser-driver";

describe("SiteHeader", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`centers branding and navigation containers beside growing actions in ${adapter}`, async () => {
    const src = await asset("brand-mark.svg", '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"></svg>');
    const path = await bundle(`site-header-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime";` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSiteHeader as SiteHeader, UiButton as Button } from "@looma-test/components";
      createScene({render:()=>sceneNode(SiteHeader,{id:"site",sticky:true},{
        brand:()=>sceneNode("a",{href:"#home",id:"brand"},[sceneNode("img",{width:40,height:40,alt:"Brand mark",src:${JSON.stringify(src)}}),sceneNode("span",{id:"brand-title"},"Fellowship")]),
        navigation:()=>[sceneNode("a",{href:"#guide",id:"destination"},"Guide"),sceneNode("a",{href:"#components"},"Components")],
        actions:()=>sceneNode(Button,{id:"action",variant:"solid",tone:"accent"},()=>"Join briefing"),
      })}).mount("#app");
    `);
    const page=await open(path, adapter === "HTML" ? `<ui-site-header id="site" sticky><a slot="brand" href="#home" id="brand"><img width="40" height="40" alt="Brand mark" src="${src}"><span id="brand-title">Fellowship</span></a><a slot="navigation" href="#guide" id="destination">Guide</a><a slot="navigation" href="#components">Components</a><ui-button slot="actions" id="action" variant="solid" tone="accent">Join briefing</ui-button></ui-site-header>` : '<div id="app"></div>', [join(root,"tokens.css")], {viewport:{width:1440,height:800}});
    try {
      await page.addStyleTag({content:'body { display:grid; place-items:center; margin:0; } #app { inline-size:100%; display:grid; place-items:center; }'});
      assert.equal(await page.locator('#site').evaluate(el=>el.getBoundingClientRect().width),1440,'a site header fills its container even in a centered preview');
      await page.addStyleTag({content:':root { --ui-accent-active:#24376e; --ui-link-color:#a2bcff; }'});
      await page.locator('#destination').evaluate(element=>element.setAttribute('aria-current','page'));
      assert.equal(await page.locator('#destination').evaluate(element=>getComputedStyle(element).color),'rgb(162, 188, 255)','selected navigation uses contextual link ink, independent of pressed action fill');
      await page.locator('#destination').evaluate(element=>element.removeAttribute('aria-current'));
      await page.locator('#destination').hover();
      assert.equal(await page.locator('#destination').evaluate(element=>getComputedStyle(element).color),'rgb(162, 188, 255)','hovered navigation also uses contextual link ink');
      await page.mouse.move(0,0);
      for(const dir of ["ltr","rtl"]) {
        await page.locator('html').evaluate((el,dir)=>el.setAttribute('dir',dir),dir);
        for(const height of [32,64]) {
          await page.locator('#action').evaluate((el,height)=>(el as HTMLElement).style.setProperty('--ui-button-min-block-size',height+'px'),height);
          const alignment=await page.locator('#site').evaluate(header=>{
            const center=(el:Element)=>{const b=el.getBoundingClientRect();return b.y+b.height/2;};
            return {
              groups:Math.abs(center(header.querySelector('.identity')!)-center(header.querySelector('.actions')!)),
              text:Math.abs(center(header.querySelector('#brand-title')!)-center(header.querySelector('#destination')!)),
            };
          });
          assert.ok(alignment.groups<1,`${dir}/${height}: action and text groups stay centred`);
          assert.ok(alignment.text<1,`${dir}/${height}: branding and navigation containers stay centred`);
        }
      }
      await page.locator('#brand').evaluate(element=>{
        const title=document.createElement('span'); title.textContent='Example documentation with a deliberately long product title';
        title.style.cssText='min-inline-size:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'; element.replaceChildren(title);
      });
      await page.setViewportSize({width:375,height:800});
      await page.locator("#destination").waitFor({state:"hidden"});
      const mobile=await page.locator('#site').evaluate(header=>{
        const identity=header.querySelector('.identity')!.getBoundingClientRect(), actions=header.querySelector('.actions')!.getBoundingClientRect();
        return {delta:Math.abs(identity.y+identity.height/2-actions.y-actions.height/2), width:identity.width};
      });
      assert.ok(mobile.delta<1,'long branding stays in the same mobile row as actions');
      assert.ok(mobile.width>0,'branding retains visible space');
      await expect.poll(() => page.locator('#brand').isVisible(), { message: 'the brand stays visible when navigation collapses' }).toBe(true);
      await expect.poll(() => page.locator('#destination').isVisible()).toBe(false);
      const menu=page.getByRole('button',{name:'Open navigation',exact:true});
      await expect.poll(() => menu.isVisible()).toBe(true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await menu.click();
      await expect.poll(() => page.getByRole('dialog',{name:'Main'}).isVisible()).toBe(true);
      await expect.poll(() => page.locator('#destination').isVisible()).toBe(true);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog',{name:'Main'}).waitFor({state:'hidden'});
      await expect.poll(() => menu.getAttribute('aria-expanded')).toBe('false');
    } finally {await page.close();}
  });
});
