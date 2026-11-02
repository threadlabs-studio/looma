import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Bounded value editors", () => {
  for (const adapter of ["html", "converted"]) it(`calculates, rejects invalid values, drags by touch and disables in ${adapter}`, async () => {
    const path = await bundle(`${adapter}-value-editors`, adapter === "html" ? `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.disableEditors = (disabled = true) => ['amount', 'progress', 'curve'].forEach(id => componentRegistry.update(document.getElementById(id), {disabled}));
    ` : `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiNumberInput as NumberInput, UiSlider as Slider, UiCurveEditor as CurveEditor } from "@looma-test/components";
      const disabled = createState(false);
      window.disableEditors = (value = true) => { disabled.value = value; };
      const app = createScene({render: () => sceneNode('main', [
        sceneNode(NumberInput, {id:'amount',label:'Distance',value:'16px',unit:'px',min:8,max:40,disabled:disabled.value}),
        sceneNode(Slider, {id:'progress',label:'Progress',value:25,disabled:disabled.value}),
        sceneNode(CurveEditor, {id:'curve',label:'Office motion',disabled:disabled.value})
      ])});
      app.mount('#app'); window.removeEditors = () => app.unmount();
    `);
    const page = await open(path, '<meta name="viewport" content="width=device-width, initial-scale=1">' + (adapter === "html" ? `
      <ui-number-input id="amount" label="Distance" value="16px" unit="px" min="8" max="40"></ui-number-input>
      <ui-slider id="progress" label="Progress" value="25"></ui-slider>
      <ui-curve-editor id="curve" label="Office motion"></ui-curve-editor>
    ` : '<div id="app"></div>'), [join(root, "tokens.css")], {viewport:{width:375,height:900},hasTouch:true,isMobile:true});
    try {
      const amount = page.getByRole('spinbutton', {name:'Distance',exact:true});
      await amount.fill('42px / 1.2'); await amount.press('Enter'); await expect.poll(() => amount.inputValue()).toBe('35px');
      await amount.fill('2rem'); await amount.press('Enter'); await expect.poll(() => amount.getAttribute('aria-invalid')).toBe('true');
      await amount.press('Escape'); await expect.poll(() => amount.inputValue()).toBe('35px'); await expect.poll(() => amount.getAttribute('aria-invalid')).toBe(null);
      const slider = page.getByRole('slider', {name:'Progress',exact:true}); await slider.press('End');
      await expect.poll(() => slider.inputValue()).toBe('100'); await expect.poll(() => page.getByRole('spinbutton',{name:'Progress',exact:true}).inputValue()).toBe('100');
      const handle = page.getByRole('button', {name:/^First curve handle/});
      await handle.scrollIntoViewIfNeeded();
      const before = await page.locator('#curve output').textContent();
      const bounds = (await handle.boundingBox())!;
      const client = await page.context().newCDPSession(page);
      const touch = (x:number,y:number) => [{x,y,id:1}];
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touch(bounds.x+bounds.width/2,bounds.y+bounds.height/2)});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:touch(bounds.x+bounds.width/2+40,bounds.y+bounds.height/2-20)});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await client.detach();
      await expect.poll(() => page.locator('#curve output').textContent()).not.toBe(before);
      const gestureStart = await page.locator('#curve output').textContent();
      await handle.hover(); await page.mouse.down(); await page.mouse.move(bounds.x+10,bounds.y+10);
      await handle.press('Escape'); await page.mouse.up();
      await expect.poll(() => page.locator('#curve output').textContent(), { message: 'curve drags cancel consistently with the light editor' }).toBe(gestureStart);
      const x = page.getByRole('spinbutton',{name:'First handle X',exact:true});
      await x.fill('2'); await x.press('Enter'); await expect.poll(() => x.inputValue()).toBe('1');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.evaluate(() => (window as any).disableEditors());
      await expect.poll(() => amount.isDisabled()).toBe(true); await expect.poll(() => slider.isDisabled()).toBe(true); await expect.poll(() => handle.isDisabled()).toBe(true);
      if (adapter === 'converted') {
        await page.evaluate(() => (window as any).disableEditors(false));
        await page.waitForFunction(() => !(document.querySelector('#curve .handle') as HTMLButtonElement).disabled);
        const retained = await page.locator('#curve output').textContent();
        await page.evaluate(() => { (window as any).retainedHandle = document.querySelector('#curve .handle'); (window as any).retainedOutput = document.querySelector('#curve output'); (window as any).removeEditors(); });
        await page.evaluate(() => (window as any).retainedHandle.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true})));
        assert.equal(await page.evaluate(() => (window as any).retainedOutput.textContent),retained);
      }
    } finally { await page.close(); }
  });
});
