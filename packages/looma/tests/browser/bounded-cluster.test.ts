import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Bounded Cluster", () => {
  for (const adapter of ["html", "converted"]) it(`caps ${adapter} wrapped items and reserves accessible overflow and trailing actions`, async () => {
    const path=await bundle(`bounded-cluster-${adapter}`,adapter==="html"?`import "@looma-test/runtime";`:`
      import {createScene,sceneNode} from "@looma-test/scene";
      import {UiCluster as Cluster,UiButton as Button,UiPopover as Popover} from "@looma-test/components";
      const items=()=>Array.from({length:12},(_,i)=>sceneNode('a',{id:'item-'+i,class:'item '+(i===0?'overflow':i===1?'trailing':''),href:'#item-'+i},'Item '+String(i+1).padStart(2,'0')));
      createScene({render:()=>[
        sceneNode(Cluster,{id:'bounded',maxRows:3,gap:'xs'},{default:items,
          overflow:()=>sceneNode(Button,{id:'overflow',size:'sm'},()=> 'More'),
          trailing:()=>sceneNode(Button,{id:'add',size:'sm'},()=> 'Add')}),
        sceneNode(Popover,{id:'all',for:'overflow'},()=>sceneNode(Cluster,{gap:'xs'},()=>Array.from({length:12},(_,i)=>sceneNode(Button,{size:'sm'},()=> 'Item '+String(i+1).padStart(2,'0'))))),
      ]}).mount('#app');
    `);
    const items=Array.from({length:12},(_,i)=>`<a id="item-${i}" class="item ${i===0?'overflow':i===1?'trailing':''}" href="#item-${i}">Item ${String(i+1).padStart(2,'0')}</a>`).join('');
    const body=adapter==="html"?`<ui-cluster id="bounded" max-rows="3" gap="xs">${items}<ui-button slot="overflow" id="overflow" size="sm">More</ui-button><ui-button slot="trailing" id="add" size="sm">Add</ui-button></ui-cluster><ui-popover id="all" for="overflow"><ui-cluster gap="xs">${items.replaceAll(/ id="[^"]+"/g,'')}</ui-cluster></ui-popover>`:'<div id="app"></div>';
    const page=await open(path,body,[join(root,'tokens.css')],{viewport:{width:375,height:812},hasTouch:true});
    try {
      await page.addStyleTag({content:'body {margin:12px} #bounded {inline-size:220px} .item {display:inline-flex; padding:4px; white-space:nowrap}'});
      const metrics=()=>page.locator('#bounded').evaluate(root=>{
        const children=Array.from(root.children).filter(el=>el.getBoundingClientRect().height>0);
        return {rows:new Set(children.map(el=>Math.round(el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2))).size,
          visible:Array.from(root.querySelectorAll(':scope > .item')).filter(el=>el.getBoundingClientRect().height>0).length,
          overflow:root.scrollWidth-root.clientWidth,mask:getComputedStyle(root).maskImage};
      });
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.ok((await metrics()).rows<=3,`the entire group including its controls stays within three rows: ${JSON.stringify(await metrics())}`);
      assert.ok((await metrics()).visible<12,'additional items are collapsed');
      assert.equal((await metrics()).mask,'none');
      assert.ok((await metrics()).overflow<=1);
      const restingVisible=(await metrics()).visible;
      await page.addStyleTag({content:'#add {inline-size:130px}'});
      await page.waitForFunction(previous=>Array.from(document.querySelectorAll('#bounded > .item')).filter(el=>!el.hasAttribute('hidden')).length<previous,restingVisible);
      await page.evaluate(()=>new Promise<void>(resolve=>{
        let frames=5; const settle=()=>--frames?requestAnimationFrame(settle):resolve();requestAnimationFrame(settle);
      }));
      await page.addStyleTag({content:'#add {inline-size:auto}'});
      await page.waitForFunction(previous=>Array.from(document.querySelectorAll('#bounded > .item')).filter(el=>!el.hasAttribute('hidden')).length===previous,restingVisible,{timeout:1500});
      await page.locator('#overflow').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>document.getElementById('all')!.matches(':popover-open'));
      await expect.poll(() => page.locator('#all').locator('a,button').count(), { message: 'the popup retains the complete collection' }).toBe(12);
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.activeElement===document.getElementById('overflow'));
      await page.keyboard.press('Tab');assert.equal(await page.locator('#add').evaluate(el=>el===document.activeElement),true);
      await page.addStyleTag({content:'#bounded {inline-size:1200px}'});
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('#bounded > .item')).every(el=>!el.hasAttribute('hidden')));
      assert.equal((await metrics()).visible,12);
      await expect.poll(() => page.locator('#overflow').isVisible(), { message: 'the overflow control disappears when everything fits' }).toBe(false);
      await page.addStyleTag({content:'#bounded {inline-size:220px}'});
      await page.evaluate(()=>document.documentElement.dir='rtl');
      await page.waitForFunction(()=>document.querySelectorAll('#bounded > .item[hidden]').length>0);
      assert.ok((await metrics()).rows<=3,'RTL keeps the same row cap');
    } finally {await page.close();}
  });
});
