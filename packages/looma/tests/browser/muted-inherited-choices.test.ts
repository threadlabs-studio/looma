import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe('Muted inherited choices', () => {
  for(const adapter of ['html','converted']) it(`keeps selected defaults muted and option text normal in ${adapter}`, async () => {
    const path=await bundle('muted-select-'+adapter,adapter==='html'?`import '@looma-test/runtime';import {componentRegistry} from '@nextwebwg/html-next/runtime';window.unmute=()=>componentRegistry.update(document.getElementById('choice'),{muted:false});`:`import {createScene,sceneNode,createState} from "@looma-test/scene";import { UiSelect as Select } from '@looma-test/components';const muted=createState(true);window.unmute=()=>muted.value=false;createScene({render:()=>sceneNode(Select,{id:'choice',muted:muted.value},()=>[sceneNode('option',{},'Default palette'),sceneNode('optgroup',{label:'Other'},[sceneNode('option',{},'Alternative')])])}).mount('#app');`);
    const page=await open(path,adapter==='html'?'<ui-select id="choice" muted><option>Default palette</option><optgroup label="Other"><option>Alternative</option></optgroup></ui-select>':'<div id="app"></div>',[join(root,'tokens.css')]);
    try {
      await page.addStyleTag({content:':root {--ui-text-primary:rgb(20,30,40);--ui-text-secondary:rgb(90,100,110)}'});
      assert.equal(await page.locator('#choice').evaluate(el=>getComputedStyle(el).color),'rgb(90, 100, 110)');
      assert.deepEqual(await page.locator('#choice option,#choice optgroup').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).color)),Array(3).fill('rgb(20, 30, 40)'));
      await page.evaluate(()=>(window as any).unmute());
      await page.waitForFunction(()=>getComputedStyle(document.querySelector('#choice')!).color==='rgb(20, 30, 40)');
    } finally {await page.close();}
  });
});
