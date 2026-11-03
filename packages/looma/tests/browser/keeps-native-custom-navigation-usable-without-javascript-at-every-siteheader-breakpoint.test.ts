import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { it } from "vitest";

import { root, browser, bundle } from "../renderers/browser-driver";
import { componentRoot } from "../renderers/selectors";

it("keeps native custom navigation usable without JavaScript at every SiteHeader breakpoint", async () => {
  const {createHydratedScene,sceneNode} = await import("@looma-test/scene"), {renderSceneToString} = await import("@looma-test/scene");
  const {UiSiteHeader:SiteHeader,UiIconButton:IconButton}=await import("@looma-test/components");
  const headers=await renderSceneToString(createHydratedScene({render:()=>(["sm","md","lg"] as const).map(breakpoint=>sceneNode(SiteHeader,{breakpoint},{
    brand:()=>sceneNode("a",{href:"#home"},"Fellowship documentation"),
    navigation:()=>sceneNode("a",{href:"#guide"},"Guide"),
    menu:()=>sceneNode(IconButton,{label:"Navigation "+breakpoint,popovertarget:"docs-"+breakpoint},()=>"Docs"),
  }))}));
  const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:375,height:800}});
  page.setDefaultTimeout(5000);
  const stylesheetBundle = await bundle("site-header-no-script-styles", 'import { UiSiteHeader, UiIconButton } from "@looma-test/components"; window.fixtureComponents = [UiSiteHeader, UiIconButton];');
  const css=await Promise.all([join(root,"tokens.css"),join(dirname(stylesheetBundle),"components.css")].map(path=>readFile(path,"utf8")));
  await page.goto("data:text/html;charset=utf-8,"+encodeURIComponent('<!doctype html><style>'+css.join("\n")+'</style>'+headers+["sm","md","lg"].map(name=>'<nav id="docs-'+name+'" popover>Documentation</nav>').join("")));
  try {
    for(const [name,width] of [["sm",640],["md",768],["lg",1024]] as const) {
      const trigger=page.getByRole("button",{name:"Navigation "+name,exact:true});
      await page.setViewportSize({width:width-1,height:800});
      await expect.poll(() => trigger.isVisible()).toBe(true);
      const placement=await trigger.evaluate((button, selector)=>{
        const brand=button.closest(selector)!.querySelector('.brand')!.getBoundingClientRect();
        const box=button.getBoundingClientRect();
        return {gap:box.left-brand.right,width:box.width};
      }, componentRoot("ui-site-header"));
      assert.ok(placement.gap < placement.width,'native custom menus also stay close to the brand before upgrade');
      await trigger.click();await expect.poll(() => page.locator("#docs-"+name).isVisible()).toBe(true);
      await page.keyboard.press("Escape");await expect.poll(() => page.locator("#docs-"+name).isVisible()).toBe(false);
      await page.setViewportSize({width,height:800});await trigger.waitFor({state:"hidden"});
    }
    await expect.poll(() => page.locator("dialog[open]").count()).toBe(0);
  } finally {await page.close();}
});
