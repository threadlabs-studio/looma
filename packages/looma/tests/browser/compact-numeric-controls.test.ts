import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Compact numeric controls", () => {
  for (const adapter of ['html','converted']) it(`keeps exact editing and keyboard steps without separate buttons in ${adapter}`, async () => {
    const path=await bundle('compact-values-'+adapter,adapter==='html' ? `import '@looma-test/runtime';` : `import {createScene,sceneNode} from "@looma-test/scene";import { UiNumberInput as NumberInput, UiSlider as Slider } from '@looma-test/components';createScene({render:()=>sceneNode('main',{},[sceneNode(NumberInput,{id:'amount',compact:true,size:'sm',value:'10',label:'Compact amount'}),sceneNode('div',{style:{width:'144px'}},[sceneNode(Slider,{id:'range',compact:true,size:'sm',value:30,min:0,max:100,label:'Compact range'})])])}).mount('#app');`);
    const page=await open(path,adapter==='html' ? '<ui-number-input id="amount" compact size="sm" value="10" label="Compact amount"></ui-number-input><div style="width:144px"><ui-slider id="range" compact size="sm" value="30" min="0" max="100" label="Compact range"></ui-slider></div>' : '<div id="app"></div>',[join(root,'tokens.css')],{viewport:{width:375,height:800}});
    try {
      for (const step of await page.locator('[data-number-step]').all()) await expect.poll(() => step.isVisible()).toBe(false);
      const amount=page.getByRole('spinbutton',{name:'Compact amount',exact:true});await amount.fill('10 + 5');await amount.press('Enter');await expect.poll(() => amount.inputValue()).toBe('15');await amount.press('ArrowUp');await expect.poll(() => amount.inputValue()).toBe('16');
      const range=page.getByRole('slider',{name:'Compact range',exact:true});await range.focus();await range.press('ArrowRight');await expect.poll(() => range.inputValue()).toBe('31');
      const exact=page.getByRole('spinbutton',{name:'Compact range',exact:true});await exact.fill('50 / 2');await exact.press('Enter');await expect.poll(() => range.inputValue()).toBe('25');
      const frame=(await page.locator('#range').boundingBox())!,field=(await exact.boundingBox())!;
      assert.ok(field.x+field.width<=frame.x+frame.width+1,'the exact field fits the compact track row');
    } finally {await page.close();}
  });
});
