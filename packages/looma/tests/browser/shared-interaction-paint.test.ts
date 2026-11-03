import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe('Shared interaction paint', () => {
  it('keeps menu selection visible and makes ghost press stronger than hover in every starter mode', async () => {
    const {startingPoints,themeCSS}=await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path=await bundle('interaction-paint',`import '@looma-test/runtime';`);
    const page=await open(path,'<ui-button id="ghost" variant="ghost">Ghost</ui-button><ui-menu-item id="menu">Read memo</ui-menu-item><ui-menu-item id="selected" type="checkbox" checked>Notify Sam</ui-menu-item>',[join(root,'tokens.css'),join(root,'theme-system.css')],{reducedMotion:'reduce'});
    try {
      for(const [name,recipe] of Object.entries(startingPoints)) for(const mode of ['light','dark']) {
        await page.locator('html').evaluate((el,mode)=>el.setAttribute('data-theme',mode),mode);
        await page.evaluate(css=>{let style=document.querySelector('#theme-paint');if(!style){style=document.createElement('style');style.id='theme-paint';document.head.append(style);}style.textContent=css;},themeCSS(recipe));
        const paint=(selector:string)=>page.locator(selector).evaluate(el=>{
          const style=getComputedStyle(el),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;
          ctx.fillStyle=style.backgroundColor;ctx.fillRect(0,0,1,1);
          return {surface:style.backgroundColor,alpha:ctx.getImageData(0,0,1,1).data[3]};
        });
        await page.mouse.move(600,400);const idle=await paint('#menu');
        await page.locator('#menu').hover();const hover=await paint('#menu');
        assert.notEqual(hover.surface,idle.surface,`${name}/${mode}: menu hover`);
        assert.notEqual((await paint('#selected')).surface,idle.surface,`${name}/${mode}: checked menu`);
        await page.locator('#ghost').hover();const ghostHover=await paint('#ghost');
        await page.mouse.down();const ghostPress=await paint('#ghost');
        assert.ok(ghostPress.alpha>ghostHover.alpha,`${name}/${mode}: ghost press ${ghostPress.alpha} > hover ${ghostHover.alpha}`);
        await page.mouse.move(600,400);await page.mouse.up();
      }
    } finally {await page.close();}
  });
});
