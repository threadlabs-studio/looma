import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Nested portable theme boundaries", () => {
  for (const adapter of ['html', 'converted']) it(`keeps controls and open floating surfaces in their nearest mode in ${adapter}`, async () => {
    const {themeCSS, startingPoints} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path = await bundle(adapter + '-nested-theme-boundaries', adapter === 'html' ? `import '@looma-test/runtime';` : `
      import {createScene,sceneNode} from "@looma-test/scene";
      import { UiButton as Button, UiInput as Input, UiSelect as Select, UiDialog as Dialog, UiMenu as Menu, UiMenuItem as MenuItem, UiPopover as Popover, UiTooltip as Tooltip } from '@looma-test/components';
      const controls = name => [sceneNode(Button,{id:name+'-action'},()=>name),sceneNode(Input,{id:name+'-field',value:name}),sceneNode(Select,{id:name+'-select'},()=>sceneNode('option',{},name))];
      createScene({render:()=>sceneNode('main',[
        ...controls('outside'),
        sceneNode('section',{id:'outer','data-theme':'dark'},[
          ...controls('outer'),
          sceneNode(Button,{id:'dialog-trigger'},()=> 'Review memo'),sceneNode(Dialog,{id:'mode-dialog',for:'dialog-trigger',label:'Fellowship memo'},()=> 'Sam has the notes.'),
          sceneNode(Button,{id:'menu-trigger'},()=> 'Office actions'),sceneNode(Menu,{id:'mode-menu',for:'menu-trigger'},()=>sceneNode(MenuItem,{value:'memo'},()=> 'Read memo')),
          sceneNode(Button,{id:'popover-trigger'},()=> 'Office briefing'),sceneNode(Popover,{id:'mode-popover',for:'popover-trigger'},()=> 'Frodo has the maps.'),
          sceneNode(Button,{id:'tooltip-trigger'},()=> 'Help'),sceneNode(Tooltip,{id:'mode-tooltip',for:'tooltip-trigger',delay:0},()=> 'Office help'),
          sceneNode('section',{id:'inner','data-theme':'light'},[...controls('inner'),sceneNode('section',{'data-theme':'dark'},controls('deep'))])
        ])
      ])}).mount('#app');`);
    const controls = (name: string) => `<ui-button id="${name}-action">${name}</ui-button><ui-input id="${name}-field" value="${name}"></ui-input><ui-select id="${name}-select"><option>${name}</option></ui-select>`;
    const body = adapter === 'converted' ? '<div id="app"></div>' : controls('outside') + `<section id="outer" data-theme="dark">${controls('outer')}
      <ui-button id="dialog-trigger">Review memo</ui-button><ui-dialog id="mode-dialog" for="dialog-trigger" label="Fellowship memo">Sam has the notes.</ui-dialog>
      <ui-button id="menu-trigger">Office actions</ui-button><ui-menu id="mode-menu" for="menu-trigger"><ui-menu-item value="memo">Read memo</ui-menu-item></ui-menu>
      <ui-button id="popover-trigger">Office briefing</ui-button><ui-popover id="mode-popover" for="popover-trigger">Frodo has the maps.</ui-popover>
      <ui-button id="tooltip-trigger">Help</ui-button><ui-tooltip id="mode-tooltip" for="tooltip-trigger" delay="0">Office help</ui-tooltip>
      <section id="inner" data-theme="light">${controls('inner')}<section data-theme="dark">${controls('deep')}</section></section></section>`;
    const page = await open(path, body, [join(root,'tokens.css'),join(root,'theme-system.css')], {reducedMotion:'reduce'});
    try {
      await page.addStyleTag({content:themeCSS(startingPoints.bookish)});
      await page.locator('html').evaluate(element=>{element.dataset.theme='light';});
      const paint = (selector: string) => page.locator(selector).evaluate(element=>{
        const style=getComputedStyle(element);return [style.color,style.backgroundColor,style.borderTopColor,style.colorScheme,style.backgroundImage];
      });
      const initial = Object.fromEntries(await Promise.all(['outside','outer','inner','deep'].flatMap(name=>['action','field','select'].map(async kind=>[name+'-'+kind,await paint('#'+name+'-'+kind)])))) as Record<string,string[]>;
      for(const kind of ['action','field','select']) {
        assert.deepEqual(initial['outside-'+kind],initial['inner-'+kind]);
        assert.deepEqual(initial['outer-'+kind],initial['deep-'+kind]);
        assert.notDeepEqual(initial['outer-'+kind],initial['inner-'+kind]);
      }
      for(const [trigger,surface] of [['#dialog-trigger','#mode-dialog'],['#menu-trigger','#mode-menu .surface'],['#popover-trigger','#mode-popover .surface'],['#tooltip-trigger','#mode-tooltip .surface']]) {
        if(trigger==='#tooltip-trigger') await page.locator(trigger).hover(); else await page.locator(trigger).click();
        await page.locator(surface).waitFor({state:'visible'});
        const dark=await paint(surface);
        assert.equal(dark[3],'dark',`${surface}: top-layer presentation retains the outer boundary`);
        await page.locator('html').evaluate(element=>{element.dataset.theme='dark';});
        assert.deepEqual(await paint(surface),dark,`${surface}: page mode cannot override its local boundary`);
        await page.locator('#outer').evaluate(element=>{element.dataset.theme='light';});
        await page.waitForFunction(selector=>getComputedStyle(document.querySelector(selector)!).colorScheme==='light',surface);
        assert.notDeepEqual(await paint(surface),dark,`${surface}: changing its own boundary updates the open surface`);
        await page.locator('#outer').evaluate(element=>{element.dataset.theme='dark';});
        await page.keyboard.press('Escape'); await page.mouse.move(0,0);
      }
      for(const kind of ['action','field','select']) {
        assert.deepEqual(await paint('#outside-'+kind),initial['outer-'+kind]);
        for(const name of ['outer','inner','deep']) assert.deepEqual(await paint('#'+name+'-'+kind),initial[name+'-'+kind],`${name}: nested scope survives page switching`);
      }
      await page.locator('#inner-action').focus();
      assert.equal(await page.locator('#inner-action').evaluate(element=>element.matches(':focus-visible')),true);
      assert.equal((await paint('#inner-action'))[3],'light');
    } finally {await page.close();}
  });
});
