import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe('Readable overlay content', () => {
  it('keeps notifications opaque and bounds choice-surface translucency', async () => {
    const path=await bundle('opaque-overlay-content',`import '@looma-test/runtime';`);
    const page=await open(path,'<ui-toast id="notice" tone="info">Frodo saved the agenda.</ui-toast><ui-combobox id="choices" label="Colleague" value="sam" disclosure><option value="sam">Sam</option></ui-combobox>',[join(root,'tokens.css'),join(root,'theme-light.css'),join(root,'theme-dark.css'),join(root,'theme-system.css')]);
    try {
      for (const mode of ['light','dark']) for (const translucency of [0,0.5,1]) {
        await page.evaluate(({mode,translucency})=>{document.documentElement.dataset.theme=mode;document.documentElement.style.setProperty('--ui-overlay-translucency',String(translucency));},{mode,translucency});
        const alphas=await page.locator('#notice,#choices [popover]').evaluateAll(elements=>elements.map(element=>{
          const canvas=document.createElement('canvas'),context=canvas.getContext('2d')!;
          context.fillStyle=getComputedStyle(element).backgroundColor;context.fillRect(0,0,1,1);
          return context.getImageData(0,0,1,1).data[3];
        }));
        assert.deepEqual(alphas,[255,Math.round(255*(1-translucency*0.1))],`${mode}/${translucency}: notifications stay opaque and choices follow the shared material transmission bound`);
      }
    } finally {await page.close();}
  });
});
