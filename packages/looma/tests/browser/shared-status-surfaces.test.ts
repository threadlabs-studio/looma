import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Shared status surfaces", () => {
  for(const adapter of ['html','converted']) it(`shares background, foreground and visible border across status components in ${adapter}`,async()=>{
    const {defaultRecipe,themeCSS}=await import('../../../looma-docs/tooling/docs/theme.mjs');
    const tones=['info','success','warning','danger'];
    const path=await bundle('shared-status-'+adapter,adapter==='html'?`import '@looma-test/runtime';`:`import {createScene,sceneNode} from "@looma-test/scene";import { UiBadge as Badge, UiCard as Card, UiCallout as Callout, UiToast as Toast, UiText as Text } from '@looma-test/components';createScene({render:()=>${JSON.stringify(tones)}.flatMap(tone=>[sceneNode(Badge,{id:tone+'-badge',tone},()=>tone),sceneNode(Card,{id:tone+'-card',tone},()=>sceneNode(Text,{id:tone+'-content'},()=>tone)),sceneNode(Callout,{id:tone+'-callout',tone},()=>tone),sceneNode(Toast,{id:tone+'-toast',tone},()=>tone)])}).mount('#app');`);
    const body=tones.map(tone=>`<ui-badge id="${tone}-badge" tone="${tone}">${tone}</ui-badge><ui-card id="${tone}-card" tone="${tone}"><ui-text id="${tone}-content">${tone}</ui-text></ui-card><ui-callout id="${tone}-callout" tone="${tone}">${tone}</ui-callout><ui-toast id="${tone}-toast" tone="${tone}">${tone}</ui-toast>`).join('');
    const page=await open(path,adapter==='html'?body:'<div id="app"></div>',[join(root,'tokens.css'),join(root,'theme-system.css')]);
    try {
      const style=await page.addStyleTag({content:themeCSS(defaultRecipe())});
      for(const branded of [false,true]) {
        const recipe=defaultRecipe();if(branded)for(const tone of tones)recipe.values[tone+'-source']='primary';
        await style.evaluate((el,css)=>el.textContent=css,themeCSS(recipe));
        for(const mode of ['light','dark']) {
          await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
          for(const tone of tones) {
            const paint=await page.locator('#'+tone+'-badge,#'+tone+'-card,#'+tone+'-callout,#'+tone+'-toast').evaluateAll(es=>es.map(el=>{const s=getComputedStyle(el);return [s.backgroundColor,s.color,s.borderTopColor];}));
            for(const actual of paint.slice(1))assert.deepEqual(actual,paint[0],`${adapter}/${mode}/${tone}: shared surface, ink and edge`);
            assert.equal(await page.locator('#'+tone+'-content').evaluate(el=>getComputedStyle(el).color),paint[0][1],'body Text follows its status surface foreground');
          }
        }
      }
    }finally {await page.close();}
  });
});
