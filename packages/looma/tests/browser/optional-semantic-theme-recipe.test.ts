import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Optional semantic theme recipe", () => {
  it('preserves compact visible control proportions on touch without imposing a target-size floor', async () => {
    const {startingPoints, themeCSS} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path=await bundle('compact-visible-touch','import "@looma-test/runtime";');
    const system=await import('node:fs/promises').then(fs=>fs.readFile(join(root,'theme-system.css'),'utf8'));
    for(const touch of [false,true]) {
      const page=await open(path,['sm','md','lg'].map(size=>`<ui-button id="compact-button-${size}" size="${size}">Solid</ui-button><ui-input id="compact-input-${size}" size="${size}" value="Frodo"></ui-input><ui-color-picker id="compact-color-${size}" size="${size}"></ui-color-picker>`).join(''),[join(root,'tokens.css')],{hasTouch:touch,isMobile:touch,viewport:{width:390,height:850}});
      try {
        await page.addStyleTag({content:themeCSS(startingPoints.wiki,system)});
        for(const [size,height] of [['sm',34/1.15],['md',34],['lg',34*1.15]] as const) {
          const heights=await page.locator(`#compact-button-${size},#compact-input-${size},#compact-color-${size} button[data-ui-field-control]`).evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().height));
          assert.ok(heights.every(value=>Math.abs(value-height)<.1),JSON.stringify({touch,size,height,heights}));
        }
        await page.addStyleTag({content:':root {--ui-control-min-block-size:60px}'});
        assert.ok(Math.abs((await page.locator('#compact-button-md').boundingBox())!.height-34)<.1,'target preference does not change painted geometry');
      } finally {await page.close();}
    }
  });

  it('makes the base type token set the document root without multiplying rem twice', async () => {
    const {defaultRecipe, themeCSS} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path = await bundle('root-type-scale', 'import "@looma-test/runtime";');
    const page = await open(path, '<ui-button id="root-action">Action</ui-button><ui-input id="root-field" value="Sam"></ui-input><div id="root-rem">Root-relative layout</div>', [join(root,'tokens.css')]);
    try {
      await page.addStyleTag({content:'#root-rem {inline-size:2rem;border:1px solid;padding:1rem}'});
      const system = await import('node:fs/promises').then(fs=>fs.readFile(join(root,'theme-system.css'),'utf8'));
      const theme = await page.addStyleTag({content:'/* Root scale fixture */'});
      for (const value of ['20px','18px','20px']) {
        const recipe=defaultRecipe(); recipe.values['text-size']=value;
        await theme.evaluate((element,css)=>element.textContent=css,themeCSS(recipe,system));
        const actual = await page.evaluate(()=>{
          const style = (id:string)=>getComputedStyle(document.querySelector(id)!);
          return {root:style('html').fontSize,text:style('#root-field').fontSize,height:document.querySelector('#root-action')!.getBoundingClientRect().height,width:style('#root-rem').width,padding:style('#root-rem').paddingTop,border:style('#root-rem').borderTopWidth};
        });
        const size=parseFloat(value);
        assert.deepEqual(actual,{root:value,text:value,height:size*2.5,width:size*2+'px',padding:value,border:'1px'}, JSON.stringify({value,...actual}));
      }
    } finally {await page.close();}
  });

  it('preserves relative length boundary values when the pixel root changes', async () => {
    const {defaultRecipe, themeCSS} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const {convertValueUnit} = await import('../../../looma-docs/tooling/docs/value-editors.mjs');
    const path=await bundle('root-length-boundaries','import "@looma-test/runtime";');
    const page=await open(path,'<ui-button>Action</ui-button>',[join(root,'tokens.css')]);
    try {
      const system=await import('node:fs/promises').then(fs=>fs.readFile(join(root,'theme-system.css'),'utf8'));
      const style=await page.addStyleTag({content:'/* Length boundary fixture */'});
      for (const [base,id,pixels,property] of [[18,'line-weight',.5,'--ui-border-width'],[14,'corner-roundness',32,'--ui-radius-md']] as const) {
        const recipe=defaultRecipe();recipe.values['text-size']=base+'px';recipe.values[id]=convertValueUnit(pixels+'px','rem',{remPixels:base});
        await style.evaluate((el,css)=>el.textContent=css,themeCSS(recipe,system));
        const actual=await page.locator('html').evaluate((el,property)=>parseFloat(getComputedStyle(el).getPropertyValue(property)),property);
        assert.ok(Math.abs(actual-pixels)<.0001,JSON.stringify({base,id,pixels,actual}));
      }
    } finally {await page.close();}
  });

  it('relates shared control boxes to user-relative type rather than fixed pixel ceilings', async () => {
    const {defaultRecipe, themeCSS} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path = await bundle('relative-type-layout', 'import "@looma-test/runtime";');
    const page = await open(path, '<ui-button id="relative-action">Action</ui-button><ui-input id="relative-field" value="Frodo"></ui-input><ui-color-picker id="relative-swatch"></ui-color-picker>', [join(root,'tokens.css')]);
    try {
      const system = await import('node:fs/promises').then(fs=>fs.readFile(join(root,'theme-system.css'),'utf8'));
      await page.addStyleTag({content:themeCSS(defaultRecipe(),system)});
      for (const size of [16,24,32]) {
        await page.locator('html').evaluate((element,size)=>element.style.fontSize=size+'px',size);
        const boxes = await page.locator('#relative-action,#relative-field,#relative-swatch button[data-ui-field-control]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
        assert.ok(boxes.every(height=>Math.abs(height-size*2.5)<.1), `all controls grow with root type at ${size}px: ${boxes}`);
        assert.equal(await page.locator('#relative-field').evaluate(e=>getComputedStyle(e).fontSize),size+'px');
      }
    } finally {await page.close();}
  });

  for (const adapter of ['html', 'converted']) it(`shares native CSS units, independent scales and material roles in ${adapter}`, async () => {
    const path = await bundle(adapter + '-theme-recipe', adapter === 'html' ? `import '@looma-test/runtime';` : `
      import {createScene,sceneNode} from "@looma-test/scene";import { UiButton as Button, UiInput as Input, UiSwitch as Switch, UiColorPicker as ColorPicker } from '@looma-test/components';
      createScene({render:()=>sceneNode('div',{},[
        ...['sm','md','lg'].flatMap(size=>[sceneNode(Button,{id:'recipe-action-'+size,size},()=> 'Action'),sceneNode(Button,{id:'recipe-link-'+size,size,href:'#next'},()=> 'Action'),sceneNode(Input,{id:'recipe-field-'+size,size,value:'A document'}),sceneNode(ColorPicker,{id:'recipe-colour-'+size,size})]),
        sceneNode(Switch,{id:'recipe-switch',checked:true},()=> 'A switch'),sceneNode('div',{'data-theme':'nested',id:'nested'},[sceneNode(Button,{id:'nested-action'},()=> 'Nested action')])
      ])}).mount('#app');`);
    const body = adapter === 'html' ? ['sm','md','lg'].map(size=>`<ui-button id="recipe-action-${size}" size="${size}">Action</ui-button><ui-button id="recipe-link-${size}" size="${size}" href="#next">Action</ui-button><ui-input id="recipe-field-${size}" size="${size}" value="A document"></ui-input><ui-color-picker id="recipe-colour-${size}" size="${size}"></ui-color-picker>`).join('') + '<ui-switch id="recipe-switch" checked>A switch</ui-switch><div data-theme="nested" id="nested"><ui-button id="nested-action">Nested action</ui-button></div>' : '<div id="app"></div>';
    const page = await open(path, body, [join(root,'tokens.css')]);
    try {
      assert.equal(await page.locator('#recipe-field-sm').evaluate(el=>el.getBoundingClientRect().height),32,'legacy sizing stays unchanged without the optional recipe');
      await page.addStyleTag({path:join(root,'theme-system.css')});
      await page.addStyleTag({content: ':root {--ui-control-size:3rem;--ui-motion-fast:.2s;--ui-scale-ratio:1.5;--ui-spacing:1;--ui-space-curve:1;--ui-outer-depth:0;--ui-inner-depth:0;--ui-edge-light:0;} #nested {--ui-control-size:2rem;--ui-scale-ratio:1;--ui-space-curve:2;}'});
      for (const [size,height] of [['sm',32],['md',48],['lg',72]] as const) for (const kind of ['field','action','link','colour']) {
        const selector = '#recipe-'+kind+'-'+size+(kind==='colour'?' button[data-ui-field-control]':'');
        assert.ok(Math.abs((await page.locator(selector).boundingBox())!.height-height)<.6,selector);
      }
      assert.equal(await page.locator('#nested-action').evaluate(el=>el.getBoundingClientRect().height),32);
      await page.addStyleTag({content:'body {padding-left:var(--ui-space-4)} #nested {display:grid;gap:var(--ui-space-4)}'});
      assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).paddingLeft),'16px','size ratio does not change the linear spacing curve');
      assert.ok(Math.abs(await page.locator('#nested').evaluate(el=>parseFloat(getComputedStyle(el).gap)) - 9.1428571) < .01, 'quadratic spacing bends a fixed range independently of control size');
      await page.addStyleTag({content:'#nested {padding-inline-start:var(--ui-space-1);padding-inline-end:var(--ui-space-6)}'});
      assert.deepEqual(await page.locator('#nested').evaluate(el=>[getComputedStyle(el).paddingInlineStart,getComputedStyle(el).paddingInlineEnd]),['4px','32px'],'the spacing curve keeps its endpoints');
      assert.equal(await page.locator('#recipe-action-md').evaluate(el=>getComputedStyle(el).scale),'none');
      await page.locator('#recipe-action-md').evaluate(async element => {
        getComputedStyle(element).boxShadow;
        await Promise.all(element.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
      });
      const shadow = await page.locator('#recipe-action-md').evaluate(el=>getComputedStyle(el).boxShadow);
      assert.ok(shadow.split(/,(?![^(]*\))/).filter(part=>!/^\s*rgba\([^)]*, 0\)/.test(part)).every(part=>[...part.matchAll(/(-?[\d.]+)px/g)].every(match=>Number(match[1])===0)), 'zero depth removes visible elevation: '+shadow);
      assert.equal(await page.locator('#recipe-switch input').evaluate(el=>getComputedStyle(el,'::after').boxShadow),'rgba(0, 0, 0, 0.08) 0px 0px 0px 0px');
      assert.ok((await page.locator('#recipe-action-md').evaluate(el=>getComputedStyle(el).transitionDuration)).includes('0.2s'),'seconds stay seconds');
      await page.addStyleTag({content: ':root {--ui-action-inset-md:9px;--ui-control-size-sm:35px;}'});
      assert.equal(await page.locator('#recipe-action-md').evaluate(el=>getComputedStyle(el).paddingLeft),'9px','explicit derived role still wins');
      assert.equal(await page.locator('#recipe-field-sm').evaluate(el=>el.getBoundingClientRect().height),35);
      await page.addStyleTag({content: ':root {--ui-control-size:24px;--ui-font-size:28px;--ui-spacing:2;--ui-space-curve:2;--ui-scale-ratio:1.4;} body {font-size:var(--ui-font-size)}'});
      for (const size of ['sm','md','lg']) {
        const heights = await Promise.all(['action','link','field','colour'].map(kind=>page.locator('#recipe-'+kind+'-'+size+(kind==='colour'?' button[data-ui-field-control]':'')).evaluate(el=>el.getBoundingClientRect().height)));
        assert.ok(Math.max(...heights)-Math.min(...heights)<.6, 'large typography and curved page spacing preserve shared boxes: '+heights.join(','));
      }
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('#recipe-action-md').evaluate(el=>getComputedStyle(el).getPropertyValue('--ui-motion-press').trim()),'0ms');
    } finally { await page.close(); }
  });
});
