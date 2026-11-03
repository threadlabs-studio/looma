import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Color picker", () => {
  for (const adapter of ['html','converted']) it(`selects and clears an optional colour in ${adapter}`, async () => {
    const path=await bundle('optional-colour-'+adapter, adapter==='html' ? `import '@looma-test/runtime';` : `import {createScene,sceneNode} from "@looma-test/scene";import { UiColorPicker as ColorPicker } from '@looma-test/components';createScene({render:()=>sceneNode(ColorPicker,{id:'optional',clearable:true,value:'',label:'Optional accent',name:'accent'})}).mount('#app');`);
    const page=await open(path, adapter==='html' ? '<form><ui-color-picker id="optional" clearable value="" name="accent" label="Optional accent"></ui-color-picker></form>' : '<form><div id="app"></div></form>', [join(root,'tokens.css')]);
    try {
      await page.locator('#optional').evaluate(el=>el.addEventListener('change',event=>{el.setAttribute('data-chosen',(event as CustomEvent).detail.value);}));
      const trigger=page.getByRole('button',{name:'Optional accent',exact:true});
      await expect.poll(() => trigger.getAttribute('title')).toBe('None');await trigger.click();
      const hex=page.getByRole('textbox',{name:'Hex colour',exact:true});await hex.fill('#fc5b69');await hex.press('Tab');
      await expect.poll(() => page.locator('#optional').getAttribute('data-chosen')).toBe('#fc5b69');
      await page.getByRole('button',{name:'None',exact:true}).click();
      await expect.poll(() => trigger.getAttribute('title')).toBe('None');assert.ok(await trigger.evaluate(el=>el===document.activeElement));
      assert.equal(await page.locator('form').evaluate(el=>new FormData(el as HTMLFormElement).get('accent')),'');
      await expect.poll(() => page.locator('#optional').getAttribute('data-chosen')).toBe('');
    } finally {await page.close();}
  });

  for (const adapter of ["html", "converted"]) it(`toggles, edits and shares field geometry in ${adapter}`, async () => {
    const path = await bundle(`${adapter}-color-picker`, adapter === "html" ? `import "@looma-test/runtime"; import { componentRegistry } from "@nextwebwg/html-next/runtime"; window.disablePicker=()=>componentRegistry.update(document.getElementById("picker-sm"), {disabled:true});` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiColorPicker as ColorPicker, UiInput as Input } from "@looma-test/components";
      createScene({ render: () => sceneNode('main', {}, ['sm','md','lg'].map(size => sceneNode('div', {}, [sceneNode(ColorPicker,{id:'picker-'+size,size,value:'#7c3aed',label:size+' colour',round:size==='lg'}),sceneNode(Input,{id:'field-'+size,size,value:'#7c3aed'})]))) }).mount('#app');
    `);
    const body = adapter === "html" ? ['sm','md','lg'].map(size => `<div><ui-color-picker id="picker-${size}" size="${size}" value="#7c3aed" label="${size} colour" ${size === 'lg' ? 'round' : ''}></ui-color-picker><ui-input id="field-${size}" size="${size}" value="#7c3aed"></ui-input></div>`).join('') : '<div id="app"></div>';
    const page = await open(path, body, [join(root,"tokens.css"), join(root,"theme-light.css")]);
    try {
      for (const size of ['sm','md','lg']) {
        const box = await page.locator(`#picker-${size} button[data-ui-field-control]`).boundingBox();
        const field = await page.locator(`#field-${size}`).boundingBox();
        assert.ok(box && field);
        assert.ok(Math.abs(box.width-box.height)<.6, JSON.stringify({size,box}));
        assert.ok(Math.abs(box.height-field.height)<.6, JSON.stringify({size,box,field}));
      }
      const roundedTheme = await page.addStyleTag({content:'body { --ui-field-radius: 100px; }'});
      const squareRadius = await page.locator('#picker-md button[data-ui-field-control]').evaluate(el=>({radius:parseFloat(getComputedStyle(el).borderTopLeftRadius),width:el.getBoundingClientRect().width}));
      assert.ok(squareRadius.radius <= squareRadius.width/4, 'a theme must not turn the default square swatch into a circle');
      await roundedTheme.evaluate(el=>el.remove());
      const largeType = await page.addStyleTag({content:'body { font-size: 32px; }'});
      const largeSwatch = await page.locator('#picker-md button[data-ui-field-control]').boundingBox();
      const largeField = await page.locator('#field-md').boundingBox();
      assert.ok(Math.abs(largeSwatch!.height-largeField!.height)<.6, 'inherited type grows the field and swatch together');
      await largeType.evaluate(el=>el.remove());
      assert.equal(await page.locator('#picker-lg button[data-ui-field-control]').evaluate(el => getComputedStyle(el).borderRadius),'50%');
      const trigger = page.locator('#picker-sm button[data-ui-field-control]');
      const editor = page.locator('#picker-sm [role=dialog]');
      await expect.poll(() => editor.isVisible()).toBe(false);
      await trigger.click(); await expect.poll(() => editor.isVisible()).toBe(true);
      await trigger.click(); await expect.poll(() => editor.isVisible()).toBe(false);
      await trigger.press('Enter'); await expect.poll(() => editor.isVisible()).toBe(true);
      await editor.locator('input[aria-label="Hex colour"]').fill('#123456');
      assert.equal(await page.locator('#picker-sm .colour').evaluate(el => getComputedStyle(el).backgroundColor),'rgb(18, 52, 86)');
      await editor.locator('input[aria-label="Hex colour"]').fill('#xyz');
      await expect.poll(() => editor.locator('input[aria-label="Hex colour"]').getAttribute('aria-invalid')).toBe('true');
      assert.equal(await page.locator('#picker-sm .colour').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(18, 52, 86)');
      await editor.locator('input[aria-label="Hex colour"]').fill('#654321');
      await expect.poll(() => editor.locator('input[aria-label="Hex colour"]').getAttribute('aria-invalid')).toBe(null);
      await editor.locator('input[aria-label="Hex colour"]').press('Escape');
      await expect.poll(() => editor.isVisible()).toBe(false);
      assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
      await trigger.click();
      await page.locator('#field-md').click(); await expect.poll(() => editor.isVisible()).toBe(false);
      if(adapter==='html') { await page.evaluate(() => (window as any).disablePicker()); await expect.poll(() => trigger.isDisabled()).toBe(true); }
      const touch = await open(path, body, [join(root,"tokens.css"), join(root,"theme-light.css")], {hasTouch:true});
      try {
        for(const size of ['sm','md','lg']) {
          const swatch=await touch.locator(`#picker-${size} button[data-ui-field-control]`).boundingBox();
          const field=await touch.locator(`#field-${size}`).boundingBox();
          assert.ok(Math.abs(swatch!.height-field!.height)<.6, 'touch sizing stays shared');
          assert.ok(Math.abs(swatch!.width-swatch!.height)<.6, 'touch swatch stays square');
        }
      } finally { await touch.close(); }
    } finally { await page.close(); }
  });
});
