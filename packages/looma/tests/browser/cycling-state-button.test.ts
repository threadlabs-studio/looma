import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Cycling state button", () => {
  it("shares neutral action and field boundaries below accent emphasis", async () => {
    for (const adapter of ['html', 'converted']) {
      const path = await bundle('neutral-outline-' + adapter, adapter === 'html' ? `import '@looma-test/runtime';` : `import {createScene,sceneNode} from "@looma-test/scene";import { UiButton as Button, UiIconButton as IconButton, UiInput as Input, UiSelect as Select, UiTextarea as Textarea, UiCombobox as Combobox, UiNumberInput as NumberInput } from '@looma-test/components';createScene({render:()=>[sceneNode(Textarea,{id:'textarea'}),sceneNode(Combobox,{id:'combo',label:'Colleague'},()=>sceneNode('option',{value:'sam'},'Sam')),sceneNode(NumberInput,{id:'number',label:'Amount'}),sceneNode(Button,{id:'solid',variant:'solid',tone:'neutral'},()=>'File'),sceneNode(IconButton,{id:'solid-icon',variant:'solid',tone:'neutral',label:'File'}),sceneNode(Input,{id:'field',value:'Frodo'}),sceneNode(Select,{id:'select'},()=>sceneNode('option',{},'Sam')),sceneNode(Button,{id:'text',variant:'outline',tone:'neutral'},()=>'Archive'),sceneNode(IconButton,{id:'icon',variant:'outline',tone:'neutral',label:'Archive'}),sceneNode(Button,{id:'accent',variant:'outline',tone:'accent'},()=>'Accent')]}).mount('#app');`);
      const page = await open(path, adapter === 'html' ? '<ui-textarea id="textarea"></ui-textarea><ui-combobox id="combo" label="Colleague"><option value="sam">Sam</option></ui-combobox><ui-number-input id="number" label="Amount"></ui-number-input><ui-button id="solid" variant="solid" tone="neutral">File</ui-button><ui-icon-button id="solid-icon" variant="solid" tone="neutral" label="File"></ui-icon-button><ui-input id="field" value="Frodo"></ui-input><ui-select id="select"><option>Sam</option></ui-select><ui-button id="text" variant="outline" tone="neutral">Archive</ui-button><ui-icon-button id="icon" variant="outline" tone="neutral" label="Archive"></ui-icon-button><ui-button id="accent" variant="outline" tone="accent">Accent</ui-button>' : '<div id="app"></div>', [join(root,'tokens.css'), join(root,'theme-light.css'), join(root,'theme-dark.css')]);
      const paint = (id: string) => page.locator(id).evaluate(el => { const s=getComputedStyle(el); return {border:s.borderColor,surface:s.backgroundColor,text:s.color}; });
      try {
        for (const mode of ['light','dark']) {
          await page.locator('html').evaluate((el, mode) => el.setAttribute('data-theme', mode), mode);
          await page.mouse.move(1,1);
          await page.waitForTimeout(200);
          assert.deepEqual(await paint('#text'), await paint('#icon'), `${adapter}/${mode}: shared rest treatment`);
          assert.notEqual((await paint('#text')).border, (await paint('#accent')).border);
          for(const id of ['#field','#select','#textarea','#combo .field','#number input','#solid','#solid-icon']) assert.equal((await paint(id)).border,(await paint('#text')).border,`${adapter}/${mode}: ${id} shares the neutral control boundary`);
          const contrast = await page.evaluate(() => {
            const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!; canvas.width = canvas.height = 1;
            const light = (color: string) => { ctx.fillStyle = color; ctx.fillRect(0,0,1,1); const rgb = [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v => { const s=v/255; return s<=.04045?s/12.92:((s+.055)/1.055)**2.4; }); return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
            const probe=document.body.appendChild(document.createElement('i')); probe.style.backgroundColor='var(--ui-surface)'; const surface=light(getComputedStyle(probe).backgroundColor); probe.remove();
            return ['text','icon','field','accent'].map(id => { const border=light(getComputedStyle(document.getElementById(id)!).borderTopColor); return (Math.max(border,surface)+.05)/(Math.min(border,surface)+.05); });
          });
          assert.ok(Math.abs(contrast[0]-contrast[2])<.01 && contrast[0]<contrast[3], `${adapter}/${mode}: neutral edges stay closest to the canvas`);
          await page.locator('#text').hover(); await page.waitForTimeout(200); const hover=await paint('#text');
          await page.locator('#icon').hover(); await page.waitForTimeout(200);
          assert.deepEqual(hover, await paint('#icon'), `${adapter}/${mode}: shared hover treatment`);
        }
      } finally { await page.close(); }
    }
  });
  for(const adapter of ['html','converted']) it(`cycles named icon states without moving focus in ${adapter}`, async () => {
    const items=[{value:'automatic',label:'Automatic',icon:'monitor'},{value:'light',label:'Light',icon:'sun'},{value:'dark',label:'Dark',icon:'moon'}];
    const path=await bundle('cycle-state-'+adapter,adapter==='html'?`import '@looma-test/runtime';import {componentRegistry} from '@nextwebwg/html-next/runtime';window.changes=[];document.addEventListener('change',event=>window.changes.push(event.detail));window.selectCycle=()=>componentRegistry.update(document.getElementById('cycle'),{index:2});window.disableCycle=()=>componentRegistry.update(document.getElementById('cycle'),{disabled:true});`:`import {createScene,sceneNode,createState} from "@looma-test/scene";import { UiCycleButton as CycleButton } from '@looma-test/components';const index=createState(0),disabled=createState(false);window.changes=[];window.selectCycle=()=>index.value=2;window.disableCycle=()=>disabled.value=true;createScene({render:()=>sceneNode(CycleButton,{id:'cycle',label:'Appearance',items:${JSON.stringify(items)},index:index.value,disabled:disabled.value,'bind:index':value=>index.value=value,onChange:event=>window.changes.push(event.detail)})}).mount('#app');`);
    const page=await open(path,adapter==='html'?`<ui-cycle-button id="cycle" label="Appearance" items='${JSON.stringify(items)}'></ui-cycle-button>`:'<div id="app"></div>',[join(root,'tokens.css')]);
    try {
      const button=page.locator('#cycle button');
      await page.addStyleTag({content:'#cycle {display:block;align-items:stretch;justify-content:start;padding:20px;gap:30px}'});
      assert.deepEqual(await page.locator('#cycle').evaluate(el=>{const s=getComputedStyle(el);return [s.display,s.alignItems,s.justifyContent,s.padding,s.gap];}),['inline-flex','center','center','0px','0px'],'application styles do not change the control’s internal layout');
      assert.equal(await button.evaluate(el=>el.tagName),'BUTTON');
      await expect.poll(() => button.getAttribute('aria-label')).toBe('Appearance: Automatic');
      assert.ok(await button.locator('svg path,svg rect').count());
      await button.click();
      await expect.poll(() => button.getAttribute('aria-label')).toBe('Appearance: Light');
      await button.press('Enter');await expect.poll(() => button.getAttribute('aria-label')).toBe('Appearance: Dark');
      await button.press('Space');await expect.poll(() => button.getAttribute('aria-label')).toBe('Appearance: Automatic');
      assert.equal(await button.evaluate(el=>el===document.activeElement),true);
      assert.deepEqual(await page.evaluate(()=>(window as any).changes.map((entry:any)=>entry.value)),['light','dark','automatic']);
      await page.evaluate(()=>(window as any).selectCycle());await page.waitForFunction(()=>document.querySelector('#cycle button')?.getAttribute('aria-label')==='Appearance: Dark');
      await page.evaluate(()=>(window as any).disableCycle());await page.waitForFunction(()=>(document.querySelector('#cycle button') as HTMLButtonElement).disabled);
    } finally {await page.close();}
  });
});
