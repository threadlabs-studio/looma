import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("SiteHeader automatic drawer", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`keeps one live navigation through mobile interactions and breakpoints in ${adapter}`, async () => {
    const links = Array.from({length:30},(_,index)=>`<a slot="navigation" href="#section-${index}" id="link-${index}">Section ${index+1}</a>`).join('');
    const path=await bundle(`site-drawer-${adapter}`,adapter==="HTML"?'import "@looma-test/runtime"; import {componentRegistry} from "@nextwebwg/html-next/runtime"; window.setSiteBreakpoint=value=>componentRegistry.update(document.querySelector("#site"),{breakpoint:value});':`
      import {createScene,sceneNode,createState} from "@looma-test/scene"; import { UiSiteHeader as SiteHeader, UiIconButton as IconButton } from "@looma-test/components";
      const breakpoint=createState("lg");window.setSiteBreakpoint=value=>breakpoint.value=value;
      const app=createScene({render:()=>sceneNode(SiteHeader,{id:"site",label:"Explore",breakpoint:breakpoint.value},{
        brand:()=>sceneNode("a",{href:"#home",id:"brand"},"Folio"),
        navigation:()=>Array.from({length:30},(_,i)=>sceneNode("a",{href:"#section-"+i,id:"link-"+i},"Section "+(i+1))),
        actions:()=>sceneNode(IconButton,{label:"Account"},()=>"A")
      })});app.mount("#app");window.siteApp=app;
    `);
    const page=await open(path,adapter==="HTML"?`<ui-site-header id="site" label="Explore"><a slot="brand" id="brand" href="#home">Folio</a>${links}<ui-icon-button slot="actions" label="Account">A</ui-icon-button></ui-site-header><button id="outside">Outside</button>`:'<div id="app"></div><button id="outside">Outside</button>',[join(root,"tokens.css")],{viewport:{width:375,height:640},hasTouch:true});
    try {
      const menu=page.getByRole('button',{name:'Open navigation',exact:true});
      const panel=page.getByRole('dialog',{name:'Explore',exact:true});
      const close=page.getByRole('button',{name:'Close navigation',exact:true});
      await page.locator('#link-0').waitFor({state:'hidden'});
      await page.locator('#link-0').evaluate(el=>{
        (window as any).originalNavigation=el;
        el.addEventListener('click',event=>{event.preventDefault();document.body.dataset.selected='yes';});
      });
      await expect.poll(() => menu.locator('svg path').count(), { message: 'the default control has a Lucide hamburger' }).toBe(3);
      await expect.poll(() => page.locator('#link-0').count(), { message: 'desktop and mobile share one set of links' }).toBe(1);
      for(const dir of ['ltr','rtl']) {
        await page.locator('html').evaluate((el,value)=>el.setAttribute('dir',value),dir);
        const brand=await page.locator('#brand').boundingBox(),button=await menu.boundingBox();
        assert.ok(dir==='ltr'?button!.x>=brand!.x+brand!.width:button!.x+button!.width<=brand!.x,'menu follows the brand in reading order');
        const placement=await page.locator('#site').evaluate(header=>{
          const brand=header.querySelector('#brand')!.getBoundingClientRect();
          const menu=header.querySelector('button[aria-label="Open navigation"]')!.getBoundingClientRect();
          const identity=getComputedStyle(header.querySelector('.identity')!);
          return {gap:identity.direction==='rtl'?brand.left-menu.right:menu.left-brand.right,buttonWidth:menu.width,columnGap:parseFloat(identity.columnGap),compactGap:parseFloat(identity.rowGap)};
        });
        assert.equal(placement.columnGap,placement.compactGap,`${dir}: mobile branding uses compact spacing instead of the desktop navigation gap`);
        assert.ok(placement.gap < placement.buttonWidth,`${dir}: the actual hamburger button stays close to the brand, including reserved target space`);
        await menu.focus();await page.keyboard.press('Enter');
        await panel.waitFor({state:'visible'});
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('dialog')!).transform==='matrix(1, 0, 0, 1, 0, 0)');
        const geometry=await panel.evaluate(el=>{
          const box=el.getBoundingClientRect(),nav=el.querySelector('nav')!;
          return {x:box.x,right:box.right,height:box.height,scrolls:nav.scrollHeight>nav.clientHeight,backdrop:getComputedStyle(el,'::backdrop').backgroundColor};
        });
        assert.equal(geometry.height,640);
        assert.ok(Math.abs(dir==='ltr'?geometry.x:375-geometry.right)<1,'drawer enters from the logical start edge');
        assert.equal(geometry.scrolls,true,'long menus scroll inside the panel');
        assert.equal(await page.locator('#link-0').evaluate(el=>getComputedStyle(el).fontWeight),'400','drawer destinations use the regular navigation weight');
        assert.notEqual(geometry.backdrop,'rgba(0, 0, 0, 0)');
        assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-ui-scroll-lock')),true);
        assert.equal(await panel.evaluate(el=>el.contains(document.activeElement)),true,'focus enters the drawer');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.locator('#outside').evaluate(el=>document.activeElement===el),false,'Tab cannot reach background controls');
        await page.locator('#outside').evaluate(el=>(el as HTMLElement).focus());
        assert.equal(await page.locator('#outside').evaluate(el=>document.activeElement===el),false,'the background is inert');
        await page.locator('#link-29').focus();
        assert.ok(await page.locator('#link-29').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'keyboard navigation reveals destinations');
        await page.keyboard.press('Escape');
        await panel.waitFor({state:'hidden'});
        assert.equal(await menu.evaluate(el=>document.activeElement===el),true,'dismissal restores the trigger');
        assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-ui-scroll-lock')),false);
        await menu.click();await close.click();await panel.waitFor({state:'hidden'});
        await menu.click();await page.mouse.click(dir==='ltr'?365:10,400);await panel.waitFor({state:'hidden'});
      }
      await menu.click();
      await page.locator('#link-0').click();await panel.waitFor({state:'hidden'});
      await expect.poll(() => page.locator('body').getAttribute('data-selected'), { message: 'router-style prevented navigation still selects and closes' }).toBe('yes');
      await menu.click();
      await page.setViewportSize({width:1440,height:800});
      await menu.waitFor({state:'hidden'});
      await page.locator('#link-0').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>document.querySelectorAll('dialog:modal').length),0,'desktop transition releases the modal');
      await expect.poll(() => page.locator('dialog[open]').count(), { message: 'desktop navigation is a navigation region, not a dialog' }).toBe(0);
      assert.equal(await page.locator('dialog').evaluate(el=>getComputedStyle(el).overlay),'none','desktop has no pending top-layer backdrop');
      assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-ui-scroll-lock')),false);
      assert.equal(await page.locator('#link-0').evaluate(el=>el===(window as any).originalNavigation),true,'link identity survives resizing');
      for (const [breakpoint,width] of [['sm',640],['md',768],['lg',1024]] as const) {
        await page.evaluate(value=>(window as any).setSiteBreakpoint(value),breakpoint);
        await page.setViewportSize({width:width-1,height:640});
        await menu.waitFor({state:'visible'});
        await menu.click();await panel.waitFor({state:'visible'});
        await page.setViewportSize({width,height:640});
        await menu.waitFor({state:'hidden'});
        assert.equal(await page.evaluate(()=>document.documentElement.hasAttribute('data-ui-scroll-lock')),false);
      }
      await page.setViewportSize({width:375,height:640});
      await menu.waitFor({state:'visible'});
      await page.emulateMedia({reducedMotion:'reduce'});
      await menu.click();
      assert.equal(await panel.evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
      await page.locator('#site').evaluate((el,adapter)=>{
        if(adapter==='Converted') (window as any).siteApp.unmount();
        else el.remove();
      },adapter);
      await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-ui-scroll-lock'));
    } finally {await page.close();}
  });
});
