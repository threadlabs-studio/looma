import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("TopBar scroll title", () => {
  for (const adapter of ['html','converted'] as const) it(`reveals the ${adapter} title after its heading scrolls out, with reduced-motion support`, async () => {
    const path=await bundle(`${adapter}-top-bar-scroll-title`,adapter==='html' ? `
      import "@looma-test/runtime";
      import {componentRegistry} from "@nextwebwg/html-next/runtime";
      window.setTarget=id=>componentRegistry.update(document.querySelector('#bar'),{titleFor:id});
    ` : `
      import {createScene,sceneNode,createState} from "@looma-test/scene";
      import { UiTopBar as TopBar, UiButton as Button } from "@looma-test/components";
      const target=createState('heading'); window.setTarget=id=>target.value=id;
      createScene({render:()=>sceneNode(TopBar,{id:'bar',titleFor:target.value},{
        leading:()=>sceneNode(Button,{size:'sm'},()=> 'Back'),
        default:()=> 'A deliberately long document heading for this narrow screen',
        actions:()=>sceneNode(Button,{size:'sm'},()=> 'Save'),
      })}).mount('#app');
    `);
    const page=await open(path,`<div id="scroll">${adapter==='html'
      ? '<ui-top-bar id="bar" title-for="heading"><ui-button slot="leading" size="sm">Back</ui-button>A deliberately long document heading for this narrow screen<ui-button slot="actions" size="sm">Save</ui-button></ui-top-bar>'
      : '<div id="app"></div>'}<h1 id="heading">Document heading</h1><div style="height:1000px"></div></div>`,
      [join(root,'tokens.css')],{viewport:{width:375,height:500}});
    try {
      await page.addStyleTag({content:'body { margin:0; } #app { display:contents; } #scroll { height:400px; overflow:auto; } h1 { margin:12px; font-size:24px; }'});
      const title=page.locator('#bar .title');
      await page.waitForFunction(()=>document.querySelector('#bar .title')?.getAttribute('aria-hidden')==='true');
      await expect.poll(() => page.getByRole('button',{name:'Back',exact:true}).isVisible()).toBe(true);
      await expect.poll(() => page.getByRole('button',{name:'Save',exact:true}).isVisible()).toBe(true);
      const height=await page.locator('#bar').evaluate(el=>el.getBoundingClientRect().height);
      await page.locator('#scroll').evaluate(el=>el.scrollTop=240);
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('#bar .title')!).opacity==='1');
      await expect.poll(() => title.getAttribute('aria-hidden')).toBe('false');
      assert.equal(await title.evaluate(el=>getComputedStyle(el).textOverflow),'ellipsis');
      assert.equal(await title.evaluate(el=>el.scrollWidth>el.clientWidth),true);
      assert.equal(await page.locator('#bar').evaluate(el=>el.getBoundingClientRect().height),height,'revealing the title does not move the bar');
      await page.locator('#scroll').evaluate(el=>el.scrollTop=0);
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('#bar .title')!).opacity==='0');
      assert.notEqual(await title.evaluate(el=>getComputedStyle(el).transform),'none','the hidden title starts below its resting position');
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.locator('#scroll').evaluate(el=>el.scrollTop=240);
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('#bar .title')!).opacity==='1');
      assert.equal(await title.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
      assert.equal(await title.evaluate(el=>getComputedStyle(el).transform),'none');
      await page.evaluate(()=>(window as unknown as {setTarget:(id:string)=>void}).setTarget(''));
      await page.locator('#scroll').evaluate(el=>el.scrollTop=0);
      await expect.poll(() => title.getAttribute('aria-hidden'), { message: 'an unobserved title keeps the ordinary always-visible behavior' }).toBe('false');
      await page.evaluate(()=>(window as unknown as {setTarget:(id:string)=>void}).setTarget('late-heading'));
      await page.evaluate(()=>{
        const heading=document.createElement('h2'); heading.id='late-heading'; heading.textContent='A heading rendered later';
        document.querySelector('#heading')!.after(heading);
      });
      await page.waitForFunction(()=>document.querySelector('#bar .title')?.getAttribute('aria-hidden')==='true');
      await page.locator('#late-heading').evaluate(el=>el.replaceWith(el.cloneNode(true)));
      await page.locator('#scroll').evaluate(el=>el.scrollTop=240);
      await page.waitForFunction(()=>document.querySelector('#bar .title')?.getAttribute('aria-hidden')==='false');
      await page.locator('#scroll').evaluate(el=>el.scrollTop=0);
      await page.waitForFunction(()=>document.querySelector('#bar .title')?.getAttribute('aria-hidden')==='true');
    } finally {await page.close();}
  });
});
