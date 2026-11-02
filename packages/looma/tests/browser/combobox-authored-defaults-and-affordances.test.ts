import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox authored defaults and affordances", () => {
  for (const adapter of ["html", "converted"] as const) it(`grows a ${adapter} multiple field through three rows before scrolling vertically`, async () => {
    const shared = `
      window.items = [];
      window.removals = [];
      const remove = event => {
        window.removals.push(event.detail);
        window.setItems(window.items.filter(item => item.value !== event.detail.item.value));
      };
    `;
    const path = await bundle(`${adapter}-combobox-multiline`, adapter === "html" ? `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      ${shared}
      window.setItems = items => {
        window.items = items;
        componentRegistry.update(document.querySelector('#multi'), {items});
      };
      window.setSize = size => componentRegistry.update(document.querySelector('#multi'), {size});
      window.setGrow = grow => componentRegistry.update(document.querySelector('#multi'), {grow});
      window.setMaxRows = maxRows => componentRegistry.update(document.querySelector('#multi'), {maxRows});
      document.addEventListener('remove-item', remove);
    ` : `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      ${shared}
      const items = createState([]), size = createState('md'), grow = createState(true), maxRows = createState(3);
      window.setItems = value => { window.items = value; items.value = value; };
      window.setSize = value => { size.value = value; };
      window.setGrow = value => { grow.value = value; };
      window.setMaxRows = value => { maxRows.value = value; };
      createScene({render:()=>sceneNode(Combobox,{id:'multi',label:'Topics',multiple:true,grow:grow.value,maxRows:maxRows.value,
        size:size.value,items:items.value,onRemoveItem:remove})}).mount('#app');
    `);
    const page = await open(path, adapter === "html"
      ? '<ui-combobox id="multi" label="Topics" multiple grow max-rows="3"></ui-combobox>' : '<div id="app"></div>',
    [join(root,"tokens.css")],
    {viewport:{width:375,height:700},hasTouch:true,isMobile:true});
    try {
      await page.addStyleTag({content:'body { margin:12px; } #multi { inline-size:240px; --ui-control-size-sm:28px; }'});
      const selected = Array.from({length:10}, (_,i)=>({id:`topic-${i}`,value:`topic-${i}`,label:`Topic number ${i}`}));
      const setItems = async (items: typeof selected) => {
        await page.evaluate(items=>(window as unknown as {setItems:(items:unknown[])=>void}).setItems(items),items);
        await page.waitForFunction(count=>document.querySelectorAll('#multi .item').length===count,items.length);
      };
      const field = page.locator('#multi .field'), entry = page.locator('#multi .entry');
      const input = page.locator('#multi input[role="combobox"]');
      for (const size of ['sm','md','lg']) {
        await setItems([]);
        await page.evaluate(size=>(window as unknown as {setSize:(size:string)=>void}).setSize(size),size);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const empty = await field.evaluate(el=>el.getBoundingClientRect().height);
        await setItems(selected.slice(0,2));
        const grown = await field.evaluate(el=>el.getBoundingClientRect().height);
        assert.ok(grown > empty + 8, `${adapter}/${size}: the field grows before it scrolls`);
        assert.ok(await entry.evaluate(el=>el.scrollHeight<=el.clientHeight+1), 'two rows remain fully visible');
        await setItems(selected);
        const bounds = await entry.evaluate(el=>{
          const row = Math.max(...Array.from(el.querySelectorAll('.item, input'), item=>item.getBoundingClientRect().height));
          return {height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth,
            row,gap:Number.parseFloat(getComputedStyle(el).rowGap),mask:getComputedStyle(el).maskImage};
        });
        assert.ok(bounds.height >= 3*bounds.row+2*bounds.gap-1, `three complete rows fit: ${JSON.stringify(bounds)}`);
        assert.ok(bounds.height <= 3*bounds.row+2*bounds.gap+1, JSON.stringify(bounds));
        assert.ok(bounds.scroll > bounds.height, 'additional rows scroll inside the field');
        assert.ok(bounds.scrollWidth<=bounds.width+1, 'the wrapping field has no horizontal tag strip');
        assert.equal(bounds.mask,'none');
        await input.focus();
        const visible = () => input.evaluate(el=>{
          const box=el.getBoundingClientRect(), area=el.closest('.entry')!.getBoundingClientRect();
          return box.top>=area.top-1 && box.bottom<=area.bottom+1;
        });
        await page.waitForFunction(()=>{
          const input=document.querySelector('#multi input[role="combobox"]')!;
          const box=input.getBoundingClientRect(), area=input.closest('.entry')!.getBoundingClientRect();
          return box.top>=area.top-1 && box.bottom<=area.bottom+1;
        });
        assert.equal(await visible(),true,'the typing row remains visible');
        await input.press('ArrowLeft');
        assert.equal(await page.locator('#multi .item').last().evaluate(el=>el===document.activeElement),true);
        await page.keyboard.press('Delete');
        await page.waitForFunction(()=>document.querySelectorAll('#multi .item').length===9);
        await page.waitForFunction(()=>{
          const input=document.querySelector('#multi input[role="combobox"]')!;
          const box=input.getBoundingClientRect(), area=input.closest('.entry')!.getBoundingClientRect();
          return document.activeElement===input && box.top>=area.top-1 && box.bottom<=area.bottom+1;
        });
        assert.equal(await visible(),true,'removing the final chip returns to the visible input');
        await setItems([]);
        assert.ok(Math.abs((await field.evaluate(el=>el.getBoundingClientRect().height))-empty)<1,'the field shrinks again');
      }
      await setItems(selected);
      await page.evaluate(()=>(window as unknown as {setGrow:(grow:boolean)=>void}).setGrow(false));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await entry.evaluate(el=>el.classList.contains('multiline')),false,'grow=false keeps one horizontal row even with a row cap');
      await page.evaluate(()=>{
        (window as unknown as {setMaxRows:(rows?:number)=>void}).setMaxRows(undefined);
        (window as unknown as {setGrow:(grow:boolean)=>void}).setGrow(true);
      });
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await entry.evaluate(el=>el.scrollHeight<=el.clientHeight+1),true,'grow without a row cap expands to include all selected items');
    } finally { await page.close(); }
  });

  it("starts from selected options, disables empty Clear, and keeps multiple selections on one row", async () => {
    const path = await bundle("html-combobox-authored-defaults", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form">
        <ui-combobox id="single" name="region" label="Region" clearable disclosure>
          <option value="north" selected>North</option><option value="south">South</option>
        </ui-combobox>
        <ui-combobox id="empty" label="Empty" clearable disclosure></ui-combobox>
        <ui-combobox id="multi" name="teams" label="Teams" multiple clearable disclosure style="width: 19rem">
          <option value="design" selected>Design</option><option value="docs" selected>Docs</option><option value="platform">Platform</option>
        </ui-combobox>
        <ui-combobox id="locked" label="Locked" disabled disclosure><option value="north">North</option></ui-combobox>
        <ui-combobox id="read" label="Read" readonly disclosure><option value="north" selected>North</option></ui-combobox>
      </form>
    `, [join(root, "tokens.css")]);
    const entries = () => page.locator("#form").evaluate((form: HTMLFormElement) => ({
      region: new FormData(form).get("region"), teams: new FormData(form).getAll("teams"),
    }));
    assert.deepEqual(await entries(), { region: "north", teams: ["design", "docs"] });
    await expect.poll(() => page.locator("#empty [data-combobox-action='clear']").isDisabled()).toBe(true);
    await expect.poll(() => page.locator("#multi [data-combobox-action='clear']").isDisabled()).toBe(true);
    await expect.poll(() => page.locator("#single [data-combobox-action='clear']").isEnabled()).toBe(true);
    for (const id of ["locked", "read"]) {
      await expect.poll(() => page.locator(`#${id} [data-combobox-action='disclosure']`).isVisible()).toBe(true);
      await expect.poll(() => page.locator(`#${id} [data-combobox-action='disclosure']`).isDisabled()).toBe(true);
    }
    const initialHeight = await page.locator("#multi .field").evaluate((field) => field.getBoundingClientRect().height);
    await page.locator("#multi [data-combobox-action='disclosure']").click();
    await page.locator("#multi [role='option']").filter({ hasText: "Platform" }).click();
    const selectedHeight = await page.locator("#multi .field").evaluate((field) => field.getBoundingClientRect().height);
    assert.ok(Math.abs(selectedHeight - initialHeight) < 1, "adding chips does not grow the field");
    await page.locator("#empty input[role='combobox']").fill("north");
    await expect.poll(() => page.locator("#empty [data-combobox-action='clear']").isEnabled()).toBe(true);
    await page.locator("#empty [data-combobox-action='clear']").click();
    await expect.poll(() => page.locator("#empty [data-combobox-action='clear']").isDisabled()).toBe(true);
    await page.locator("#single [data-combobox-action='clear']").click();
    await expect.poll(() => page.locator("#single [data-combobox-action='clear']").isDisabled()).toBe(true);
    await page.locator("#form").evaluate((form: HTMLFormElement) => form.reset());
    await page.waitForTimeout(30);
    assert.deepEqual(await entries(), { region: "north", teams: ["design", "docs"] });
    await page.close();
  });
});
