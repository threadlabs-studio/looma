import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Shared status surfaces", () => {
  it("distinguishes placeholder cards with a quiet dashed border while preserving outlined geometry", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`placeholder-card-${adapter}`, adapter === "html" ? 'import "@looma-test/runtime";' : `
        import {createScene,sceneNode as h} from "@looma-test/scene";import {UiCard as Card,UiText as Text} from "@looma-test/components";
        createScene({render:()=>["outlined","placeholder"].map(variant=>h(Card,{id:variant,variant,padding:"sm"},()=>h(Text,null,()=>"Content area")))}).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-card id="outlined" padding="sm"><ui-text>Content area</ui-text></ui-card><ui-card id="placeholder" variant="placeholder" padding="sm"><ui-text>Content area</ui-text></ui-card>' : '<div id="app"></div>', [join(root,"tokens.css"),join(root,"theme-system.css")]);
      try {
        for (const mode of ["light","dark"]) {
          await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
          const paint = await page.locator("#outlined,#placeholder").evaluateAll(elements=>elements.map(element=>{
            const style=getComputedStyle(element), text=element.querySelector("[component~='ui-text'],[data-component~='ui-text'],.ui-text,[ui-text]") ?? element;
            return {border:style.borderTopStyle,edge:style.borderTopColor,ink:getComputedStyle(text).color,height:element.getBoundingClientRect().height};
          }));
          assert.equal(paint[1].border,"dashed");
          assert.notEqual(paint[1].edge,paint[0].edge);
          assert.notEqual(paint[1].ink,paint[0].ink);
          assert.equal(paint[1].height,paint[0].height);
        }
        await page.evaluate(()=>document.documentElement.dataset.theme="light");
        await page.screenshot({path:join(root,`test-results/placeholder-card-${adapter}.png`)});
      } finally {await page.close();}
    }
  });
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
