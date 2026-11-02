import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Brand palette families", () => {
  for(const adapter of ['html','converted']) it(`applies supporting accents without changing neutral or disabled intent in ${adapter}`, async () => {
    const { defaultRecipe, themeCSS } = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const recipe=defaultRecipe(); Object.assign(recipe.values,{'secondary-action':'#dd7045','tertiary-action':'#208676'});
    const path=await bundle('extra-accents-'+adapter,adapter==='html'?`import '@looma-test/runtime';`:`import {createScene,sceneNode} from "@looma-test/scene";import { UiButton as Button, UiIconButton as IconButton, UiBadge as Badge, UiCard as Card, UiMeter as Meter, UiText as Text } from '@looma-test/components';createScene({render:()=>['accent','accent-secondary','accent-tertiary'].flatMap(tone=>[sceneNode(Button,{id:tone,variant:'solid',tone},()=>tone),sceneNode(IconButton,{id:tone+'-icon',variant:'solid',tone,label:tone}),sceneNode(Badge,{id:tone+'-badge',variant:'solid',tone},()=>tone),sceneNode(Badge,{id:tone+'-soft',tone},()=>tone),sceneNode(Card,{id:tone+'-card',tone},()=>tone),sceneNode(Meter,{id:tone+'-meter',value:50,tone,label:tone}),sceneNode(Text,{id:tone+'-text',tone},()=>tone),sceneNode(Button,{id:tone+'-disabled',variant:'solid',tone,disabled:true},()=>tone)])}).mount('#app');`);
    const markup=['accent','accent-secondary','accent-tertiary'].map(tone=>`<ui-button id="${tone}" tone="${tone}" variant="solid">${tone}</ui-button><ui-icon-button id="${tone}-icon" tone="${tone}" variant="solid" label="${tone}"></ui-icon-button><ui-badge id="${tone}-badge" tone="${tone}" variant="solid">${tone}</ui-badge><ui-badge id="${tone}-soft" tone="${tone}">${tone}</ui-badge><ui-card id="${tone}-card" tone="${tone}">${tone}</ui-card><ui-meter id="${tone}-meter" value="50" tone="${tone}" label="${tone}"></ui-meter><ui-text id="${tone}-text" tone="${tone}">${tone}</ui-text><ui-button id="${tone}-disabled" tone="${tone}" variant="solid" disabled>${tone}</ui-button>`).join('');
    const page=await open(path,adapter==='html'?markup:'<div id="app"></div>',[join(root,'tokens.css')]);
    try {
      await page.addStyleTag({content:themeCSS(recipe)});
      for(const mode of ['light','dark']) {
        await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
        await page.waitForTimeout(200);
        const paint=async(id:string,property:string)=>page.locator('#'+id).evaluate((el,property)=>getComputedStyle(el).getPropertyValue(property),property);
        for(const tone of ['accent-secondary','accent-tertiary']) {
          const fill=await paint(tone,'background-color');
          assert.notEqual(fill,await paint('accent','background-color'),`${adapter}/${mode}: distinct brand fill`);
          assert.equal(fill,await paint(tone+'-icon','background-color'));
          assert.equal(fill,await paint(tone+'-badge','background-color'));
          const {toLch}=await import('../../../looma-docs/tooling/docs/palette.mjs');
          const quiet=await page.locator('#'+tone+'-soft').evaluate(el=>{
            const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
            const hex=(color:string)=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return '#'+[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join('');};
            const probe=el.appendChild(document.createElement('span'));probe.style.backgroundColor='var(--ui-surface-raised)';
            const plate=hex(getComputedStyle(probe).backgroundColor);probe.remove();
            return {fill:hex(getComputedStyle(el).backgroundColor),plate};
          });
          const delta=toLch(quiet.fill)[0]-toLch(quiet.plate)[0];
          assert.ok(mode==='light'?delta>=-.055:delta>=.06,`${adapter}/${mode}/${tone}: quiet badge uses the mode's surface calculation`);
          assert.notEqual(await paint(tone+'-text','color'),await paint('accent-text','color'));
          assert.notEqual(await paint(tone+'-card','background-color'),await paint('accent-card','background-color'));
          assert.equal(await paint(tone+'-disabled','background-color'),await paint('accent-disabled','background-color'),'disabled treatment remains neutral');
        }
      }
    } finally {await page.close();}
  });
});
