import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Shared readable material planes", () => {
  it("paints a visible full-face reflection for every polished palette", async () => {
    const {themeCSS, defaultRecipe, applyRefinement, themePalettes} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const {toLch} = await import('../../../looma-docs/tooling/docs/palette.mjs');
    const path = await bundle('continuous-button-material', 'import "@looma-test/runtime";');
    const page = await open(path, `<div style="width:320px"><ui-stack gap="lg"><ui-button id="paint" preset="primary" stretch aria-label="Material sample"> </ui-button>
      <ui-stack id="material-preview"><ui-cluster><ui-button preset="primary">Save</ui-button><ui-button variant="outline" tone="accent">Save</ui-button></ui-cluster>
      <ui-button preset="primary" stretch>Save workspace changes</ui-button></ui-stack></ui-stack></div>`, [join(root,'tokens.css')], {reducedMotion:'reduce'});
    try {
      await page.addStyleTag({path:join(root,'src/tokens/theme-system.css')});
      await page.addStyleTag({content:'body {font-family:var(--ui-font-sans);}'});
      const base = applyRefinement(defaultRecipe(), 'material', 'polished');
      const style = await page.addStyleTag({content:themeCSS(base)});
      for (const name of Object.keys(themePalettes)) for (const mode of ['light','dark']) {
        await style.evaluate((el,css)=>el.textContent=css, themeCSS(applyRefinement(base, 'palette', name)));
        await page.locator('html').evaluate((el,mode)=>el.setAttribute('data-theme',mode), mode);
        const bytes = await page.locator('#paint').screenshot({animations:'disabled'});
        const pixels = await page.evaluate(async base64 => {
          const image = new Image(); image.src='data:image/png;base64,'+base64; await image.decode();
          const canvas=document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
          const context=canvas.getContext('2d')!; context.drawImage(image,0,0);
          return [.2,.5,.8].flatMap(y=>[.15,.5,.85].map(x=>Array.from(context.getImageData(Math.floor(x*image.width),Math.floor(y*image.height),1,1).data).slice(0,3)));
        }, bytes.toString('base64'));
        const lightness=pixels.map(rgb=>toLch('#'+rgb.map(n=>n.toString(16).padStart(2,'0')).join(''))[0]);
        if (process.env.LOOMA_SCREENSHOT_DIR) await page.locator('#material-preview').screenshot({path:join(process.env.LOOMA_SCREENSHOT_DIR,`material-${name}-${mode}.png`)});
        const image = await page.locator('#paint').evaluate(el=>getComputedStyle(el).backgroundImage);
        assert.match(image, /radial-gradient/);
        const range=Math.max(...lightness)-Math.min(...lightness);
        assert.ok(new Set(pixels.map(rgb=>rgb.join(','))).size>=3, `${name}/${mode}: reflection changes across the face instead of leaving a flat band`);
        assert.ok(range>.04, `${name}/${mode}: material remains visible across the body (range ${range})`);
      }
    } finally { await page.close(); }
  });

  it("balances painted hover strength across Bookish and Gold action variants", async () => {
    const { themeCSS, startingPoints } = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const { toLch } = await import('../../../looma-docs/tooling/docs/palette.mjs');
    const path = await bundle('balanced-action-hover', 'import "@looma-test/runtime";');
    const variants = ['solid', 'outline', 'ghost'];
    const ids: string[] = [];
    const body = variants.flatMap(variant => ['accent', 'neutral'].flatMap(tone => ['ui-button', 'ui-icon-button'].map(tag => {
      const id = `${tag}-${variant}-${tone}`; ids.push(id);
      return `<${tag} id="${id}" variant="${variant}" tone="${tone}" aria-label="Sample" label="Sample"> </${tag}>`;
    }))).join('');
    const page = await open(path, body, [join(root, 'tokens.css')], { reducedMotion: 'reduce' });
    try {
      await page.addStyleTag({ path: join(root, 'src/tokens/theme-system.css') });
      await page.addStyleTag({ content: 'body { background:var(--ui-surface); display:flex; gap:16px; padding:24px; }' });
      const theme = await page.addStyleTag({ content: ' ' });
      const pixels = async (id: string) => {
        const bytes = await page.locator('#' + id).screenshot();
        return page.evaluate(async base64 => {
          const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
          return [.3, .7].map(y => {
            const rgb = context.getImageData(Math.floor(image.width * .3), Math.floor(image.height * y), 1, 1).data;
            return '#' + Array.from(rgb).slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join('');
          });
        }, bytes.toString('base64'));
      };
      for (const name of ['bookish', 'gold'] as const) for (const mode of ['light', 'dark']) for (const finish of ['theme', 'maximum']) {
        const recipe = structuredClone(startingPoints[name]);
        if (finish === 'maximum') Object.assign(recipe.values, { finish: '1', 'light-strength': '1' });
        await theme.evaluate((el, css) => el.textContent = css, themeCSS(recipe));
        await page.locator('html').evaluate((el, mode) => el.setAttribute('data-theme', mode), mode);
        for (const id of ids) {
          await page.mouse.move(0, 0); const rest = await pixels(id);
          await page.locator('#' + id).hover(); const hover = await pixels(id);
          const distances = rest.map((color, i) => {
            const [l, c, h] = toLch(color), [hl, hc, hh] = toLch(hover[i]);
            return Math.sqrt((l - hl) ** 2 + (c - hc) ** 2 + 2 * c * hc * (1 - Math.cos((h - hh) * Math.PI / 180)));
          });
          const deepSolid = name === 'bookish' && id.includes('-solid-accent');
          for (const distance of distances) assert.ok(distance >= (deepSolid ? .06 : .014) && distance <= (deepSolid ? .095 : .05),
            `${name}/${mode}/${finish}/${id}: painted hover should be noticeable and restrained, got ${distance}`);
        }
      }
    } finally { await page.close(); }
  });

  it("keeps accent hover visible through full material paint in light and dark", async () => {
    const {themeCSS, startingPoints} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path = await bundle('painted-accent-states', 'import "@looma-test/runtime";');
    const page = await open(path, '<ui-cluster><ui-button id="solid" preset="primary" aria-label="Solid sample"> </ui-button><ui-button id="outline" variant="outline" tone="accent" aria-label="Outline sample"> </ui-button><ui-icon-button id="icon" variant="solid" tone="accent" label="Icon sample"></ui-icon-button><ui-icon-button id="icon-outline" variant="outline" tone="accent" label="Outline icon sample"></ui-icon-button><ui-button id="outline-neutral" variant="outline" tone="neutral" aria-label="Neutral outline sample"> </ui-button><ui-icon-button id="icon-neutral" variant="outline" tone="neutral" label="Neutral icon sample"></ui-icon-button></ui-cluster>', [join(root,'tokens.css')], {reducedMotion:'reduce'});
    try {
      await page.addStyleTag({path:join(root,'src/tokens/theme-system.css')});
      const recipe = structuredClone(startingPoints.bookish);
      Object.assign(recipe.values, {finish:'1','light-strength':'1'});
      await page.addStyleTag({content:themeCSS(recipe)});
      const pixels = async (target: ReturnType<typeof page.locator>) => page.evaluate(async base64 => {
        const image=new Image(); image.src='data:image/png;base64,'+base64; await image.decode();
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
        const context=canvas.getContext('2d')!;context.drawImage(image,0,0);
        return [.25,.75].flatMap(y=>[.25,.75].flatMap(x=>Array.from(context.getImageData(Math.floor(x*image.width),Math.floor(y*image.height),1,1).data).slice(0,3)));
      }, (await target.screenshot()).toString('base64'));
      for (const mode of ['light','dark']) {
        await page.locator('html').evaluate((el,mode)=>el.setAttribute('data-theme',mode),mode);
        const shadow=(id: string)=>page.locator('#'+id).evaluate(el=>getComputedStyle(el).boxShadow);
        assert.equal(await shadow('outline'),await shadow('outline-neutral'),`${mode}: outline color does not change elevation`);
        assert.equal(await shadow('icon-outline'),await shadow('icon-neutral'),`${mode}: outlined icons share elevation`);
        for (const id of ['solid','outline','icon','icon-outline','outline-neutral','icon-neutral']) {
          const target=page.locator('#'+id);await page.mouse.move(500,500);
          await page.evaluate(()=>(document.activeElement as HTMLElement)?.blur());
          const restingShadow=await target.evaluate(el=>getComputedStyle(el).boxShadow);
          if (id.includes('outline') || id.includes('neutral')) assert.doesNotMatch(await target.evaluate(el=>getComputedStyle(el).backgroundImage), /radial-gradient/, `${mode}/${id}: outline fill stays flat at rest`);
          const rest=await pixels(target);await target.hover();const hover=await pixels(target);
          if (id.includes('outline') || id.includes('neutral')) assert.doesNotMatch(await target.evaluate(el=>getComputedStyle(el).backgroundImage), /radial-gradient/, `${mode}/${id}: outline fill stays flat on hover`);
          const difference=rest.reduce((sum,value,index)=>sum+Math.abs(value-hover[index]),0)/rest.length;
          assert.ok(difference>=4, `${mode}/${id}: painted hover must remain visible at maximum finish, got ${difference}`);
          await page.mouse.down();
          try { assert.equal(await target.evaluate(el=>getComputedStyle(el).backgroundImage),'none',`${mode}/${id}: pressing removes the raised reflection`); }
          finally { await page.mouse.up(); }
          await page.mouse.move(500,500);await target.press('Tab');await page.keyboard.press('Shift+Tab');
          assert.equal(await target.evaluate(el=>el.matches(':focus-visible')),true,`${mode}/${id}: real keyboard focus returns to the action`);
          assert.notEqual(await target.evaluate(el=>getComputedStyle(el).boxShadow),restingShadow,`${mode}/${id}: focus adds a visible halo without losing the resting shadow`);
          await target.press('Tab');
        }
        await page.locator('html').evaluate(el=>(el as HTMLElement).style.setProperty('--ui-accent-hover-highlight','initial'));
        await page.evaluate(()=>(document.activeElement as HTMLElement)?.blur());await page.mouse.move(500,500);
        const solid=page.locator('#solid'),rest=await pixels(solid);await solid.hover();const hover=await pixels(solid);
        assert.ok(rest.reduce((sum,value,index)=>sum+Math.abs(value-hover[index]),0)/rest.length>=4,`${mode}: an optional missing hover reflection never hides the interaction fill`);
        await page.locator('html').evaluate(el=>(el as HTMLElement).style.removeProperty('--ui-accent-hover-highlight'));
      }
    } finally {await page.close();}
  });

  it('lets maximum transparency reveal only a little scene through the content face', async () => {
    const {themeCSS,defaultRecipe}=await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path=await bundle('material-transmission','import "@looma-test/runtime";');
    const page=await open(path,'<ui-combobox id="transmission-combobox" label="Material"><option>Polished</option></ui-combobox><div style="width:240px;background:black"><ui-card id="glass" treatment="expressive"><div style="height:100px"></div></ui-card></div><ui-button id="glass-anchor">Hint</ui-button><ui-tooltip id="transmission-tooltip" for="glass-anchor" open placement="bottom"><span style="display:block;width:80px;height:30px"></span></ui-tooltip>',[join(root,'tokens.css')],{reducedMotion:'reduce'});
    try {
      await page.addStyleTag({path:join(root,'src/tokens/theme-system.css')});
      await page.addStyleTag({content:'body {background:black}'});
      const recipe=defaultRecipe();Object.assign(recipe.values,{surface:'#ffffff',translucency:'1','surface-separation':'1','light-strength':'1'});
      const style=await page.addStyleTag({content:themeCSS(recipe)});
      for(const finish of ['0','1']) {
        recipe.values.finish=finish;await style.evaluate((el,css)=>el.textContent=css,themeCSS(recipe));
        const alpha=await page.locator('#transmission-combobox [popover]').evaluate(el=>{const canvas=document.createElement('canvas'),context=canvas.getContext('2d')!;context.fillStyle=getComputedStyle(el).backgroundColor;context.fillRect(0,0,1,1);return context.getImageData(0,0,1,1).data[3];});
        assert.ok(alpha>=225 && alpha<=240,`${finish}: an unlayered popup retains nearly opaque content: ${alpha}`);
        for (const selector of ['#glass','#transmission-tooltip .surface']) {
        const bytes=await page.locator(selector).screenshot();
        const rgba=await page.evaluate(async base64=>{const im=new Image();im.src='data:image/png;base64,'+base64;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d')!;x.drawImage(im,0,0);return Array.from(x.getImageData(Math.floor(im.width/2),Math.floor(im.height/2),1,1).data);},bytes.toString('base64'));
        assert.ok(rgba[0]>=225 && rgba[0]<=240, `${selector}/${finish}: content is slightly translucent, not invisible or painted opaque: ${rgba}`);
        }
      }
    } finally {await page.close();}
  });

  it('lets glass and glow reach expressive maxima', async () => {
    const {defaultRecipe,themeCSS}=await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path=await bundle('expressive-material-ceiling','import "@looma-test/runtime";');
    const page=await open(path,'<ui-button id="strong-action" preset="primary">Share route</ui-button><ui-card id="strong-panel" treatment="expressive">Fellowship office</ui-card>',[join(root,'tokens.css')]);
    try {
      const system=await import('node:fs/promises').then(fs=>fs.readFile(join(root,'theme-system.css'),'utf8'));
      const recipe=defaultRecipe();Object.assign(recipe.values,{glow:'1',glassiness:'1','light-strength':'1'});
      await page.addStyleTag({content:themeCSS(recipe,system)});
      await page.waitForFunction(()=>[...getComputedStyle(document.querySelector('#strong-action')!).boxShadow.matchAll(/([.\d]+)px/g)].some(match=>Number(match[1])>=53.9));
      const actual=await page.evaluate(()=>({shadow:getComputedStyle(document.querySelector('#strong-action')!).boxShadow,filter:getComputedStyle(document.querySelector('#strong-panel')!).backdropFilter}));
      assert.ok([...actual.shadow.matchAll(/(?:rgba\([^)]*,\s*|\/\s*)([.\d]+)\)/g)].some(match=>Number(match[1])>=.53),actual.shadow);
      assert.equal(actual.filter,'blur(32px)');
    } finally {await page.close();}
  });

  for (const adapter of ['html','converted']) it(`edits a bounded light position by keyboard, pointer and exact entry in ${adapter}`, async () => {
    const path = await bundle(adapter + '-light-position', adapter === 'html' ? `
      import '@looma-test/runtime'; import {componentRegistry} from '@nextwebwg/html-next/runtime';
      window.disableLight=()=>componentRegistry.update(document.getElementById('light'),{disabled:true});
    ` : `
      import {createScene,sceneNode,createState} from "@looma-test/scene"; import { UiLightEditor as LightEditor, UiButton as Button } from '@looma-test/components';
      const disabled=createState(false); window.disableLight=()=>{disabled.value=true;};
      const app=createScene({render:()=>sceneNode(LightEditor,{id:'light',x:.5,y:.2,disabled:disabled.value},()=>sceneNode(Button,()=> 'Sample'))});
      app.mount('#app'); window.removeLight=()=>app.unmount();
    `);
    const page = await open(path, adapter === 'html' ? '<ui-light-editor id="light" x=".5" y=".2"><ui-button>Sample</ui-button></ui-light-editor>' : '<div id="app"></div>', [join(root,'tokens.css')], { viewport: { width: 375, height: 800 }, hasTouch: true });
    try {
      const handle=page.getByRole('button',{name:/Light position. Arrow keys/});
      const x=page.getByRole('spinbutton',{name:'Light horizontal position',exact:true});
      const y=page.getByRole('spinbutton',{name:'Light vertical position',exact:true});
      await x.waitFor({state:'hidden'});
      await page.getByRole('button',{name:'Exact position',exact:true}).click();
      await handle.focus(); await handle.press('ArrowRight'); await handle.press('Shift+ArrowDown');
      await expect.poll(() => x.inputValue()).toBe('51%'); await expect.poll(() => y.inputValue()).toBe('30%');
      await x.fill('100 / 4'); await x.press('Enter'); await expect.poll(() => x.inputValue()).toBe('25%');
      const plane=(await page.locator('#light .plane').boundingBox())!;
      const start=(await handle.boundingBox())!;
      await page.mouse.move(start.x+start.width/2,start.y+start.height/2); await page.mouse.down();
      await page.mouse.move(plane.x+plane.width*2,plane.y-plane.height); await page.mouse.up();
      await expect.poll(() => x.inputValue()).toBe('100%'); await expect.poll(() => y.inputValue()).toBe('0%');
      await handle.press('Home'); await expect.poll(() => x.inputValue()).toBe('50%');
      const touch=(await handle.boundingBox())!, client=await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touch.x+touch.width/2+12,y:touch.y+touch.height/2}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x+touch.width/2+13,y:touch.y+touch.height/2+1}]});
      assert.ok(Math.abs(parseFloat(await x.inputValue())-50)<=1, 'an off-center grab preserves its offset instead of jumping under the finger');
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:plane.x+plane.width*.75+12,y:plane.y+plane.height*.5}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await client.detach();
      assert.ok(Math.abs(parseFloat(await x.inputValue())-75)<=1);
      assert.ok(Math.abs(parseFloat(await y.inputValue())-50)<=1);
      const beforeCancel = [await x.inputValue(), await y.inputValue()];
      await handle.hover(); await page.mouse.down(); await page.mouse.move(plane.x+20,plane.y+20);
      await handle.press('Escape'); await page.mouse.up();
      assert.deepEqual([await x.inputValue(), await y.inputValue()], beforeCancel, 'Escape restores the gesture start');
      await page.locator('#light .plane').click({position:{x:plane.width*.1,y:plane.height*.9}});
      assert.ok(Math.abs(parseFloat(await x.inputValue())-10)<=1, 'tapping the stage places the light');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.evaluate(()=>(window as any).disableLight());
      await expect.poll(() => handle.isDisabled()).toBe(true); await expect.poll(() => x.isDisabled()).toBe(true);
      if(adapter==='converted') {
        await page.evaluate(()=>{(window as any).retainedLight=document.querySelector('#light .source');(window as any).retainedPosition=(window as any).retainedLight.style.cssText;(window as any).removeLight();});
        assert.equal(await page.evaluate(()=>{(window as any).retainedLight.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft'}));return (window as any).retainedLight.style.cssText===(window as any).retainedPosition;}),true);
      }
    } finally { await page.close(); }
  });
  it('shares Bookish lighting across surfaces while neutral fills stay calm and elevation stays independent', async () => {
    const { themeCSS, startingPoints } = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const path = await bundle('shared-lighting', 'import "@looma-test/runtime"; import {componentRegistry} from "@nextwebwg/html-next/runtime"; window.disableChoices=()=>{for(const id of ["material-check","material-switch"])componentRegistry.update(document.getElementById(id),{disabled:true});};');
    const page = await open(path, `<ui-button id="primary" preset="primary">Join briefing</ui-button><ui-button id="neutral" preset="standard">Read memo</ui-button>
      <ui-input id="field" label="Office"></ui-input><ui-select id="material-select"><option>Office</option></ui-select><ui-checkbox id="material-check" checked>Notify Sam</ui-checkbox><ui-switch id="material-switch" checked>Office alerts</ui-switch><ui-card id="standard" variant="elevated">Quiet</ui-card>
      <ui-card id="expressive" treatment="expressive">Expressive</ui-card>`, [join(root, 'tokens.css')], { reducedMotion: 'reduce' });
    await page.addStyleTag({ path: join(root, 'src/tokens/theme-system.css') });
    const style = await page.addStyleTag({ content: themeCSS(startingPoints.bookish) });
    for (const mode of ['light', 'dark']) {
      await page.locator('html').evaluate((element, mode) => element.setAttribute('data-theme', mode), mode);
      const paint = await page.evaluate(() => Object.fromEntries(['primary','neutral','field','material-select','standard','expressive'].map(id => {
        const s = getComputedStyle(document.getElementById(id)!);
        return [id, { image: s.backgroundImage, fill: s.backgroundColor, text: s.color, blur: s.backdropFilter, shadow: s.boxShadow }];
      })));
      assert.match(paint.primary.image, /radial-gradient/);
      assert.match(paint.field.image, /radial-gradient/);
      assert.equal(paint['material-select'].fill, paint.field.fill, 'native Select inherits the nearest light/dark boundary');
      assert.match(paint['material-select'].image, /radial-gradient/);
      for (const choice of await page.locator('#material-check input, #material-switch input').all()) assert.equal(await choice.evaluate(element => getComputedStyle(element).backgroundColor), paint.primary.fill, 'checked choices keep their accent fill beneath the reflection');
      assert.notEqual(paint.neutral.fill, paint.neutral.text);
      assert.doesNotMatch(paint.primary.shadow, /inset/, 'edge light follows the outer silhouette rather than drawing an inner frame');
      assert.equal(paint.standard.blur, 'none');
      assert.notEqual(paint.expressive.blur, 'none');
      assert.notEqual(paint.primary.shadow, 'none');
    }
    await page.evaluate(() => (window as any).disableChoices());
    for (const choice of await page.locator('#material-check input, #material-switch input').all()) assert.equal(await choice.evaluate(element => getComputedStyle(element).backgroundImage), 'none', 'disabled choices suppress ornamental lighting');
    await page.locator('#material-select').evaluate(element => element.setAttribute('disabled', ''));
    assert.doesNotMatch(await page.locator('#material-select').evaluate(element => getComputedStyle(element).backgroundImage), /radial-gradient/, 'disabled fields stay quiet');
    const before = await page.locator('#primary').evaluate(element => getComputedStyle(element).backgroundImage);
    const moved = structuredClone(startingPoints.bookish); moved.values['light-x'] = '.9'; moved.values['light-y'] = '.8';
    await style.evaluate((element, css) => element.textContent = css, themeCSS(moved));
    const after = await page.locator('#primary').evaluate(element => getComputedStyle(element).backgroundImage);
    assert.notEqual(after, before);
    await page.locator('#primary').hover();
    await page.mouse.down();
    assert.equal(await page.locator('#primary').evaluate(element => getComputedStyle(element).backgroundImage), 'none');
    await page.mouse.up();
    await page.close();
  });
  for (const adapter of ['html', 'converted']) it(`keeps layered material readable at maximum transparency and scales dialog size in ${adapter}`, async () => {
    const {themeCSS, startingPoints} = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const recipe = structuredClone(startingPoints.bookish); recipe.values.translucency = '1';
    const path = await bundle(adapter + '-readable-materials', adapter === 'html' ? `
      import '@looma-test/runtime'; import {componentRegistry} from '@nextwebwg/html-next/runtime';
      window.enlargeDialog=()=>componentRegistry.update(document.getElementById('material-dialog'),{size:'lg'});
    ` : `
      import {createScene,sceneNode,createState} from "@looma-test/scene"; import { UiDialog as Dialog, UiMenu as Menu, UiMenuItem as MenuItem, UiPopover as Popover, UiTooltip as Tooltip, UiCard as Card } from '@looma-test/components';
      const size=createState('sm'); window.enlargeDialog=()=>{size.value='lg';};
      createScene({render:()=>sceneNode('main',[
        sceneNode(Dialog,{id:'material-dialog',open:true,size:size.value,label:'Fellowship briefing'},()=>sceneNode('p','Sam and Frodo are reviewing the route to the next office.')),
        sceneNode(Menu,{id:'material-menu'},()=>sceneNode(MenuItem,{value:'memo'},()=> 'Fellowship memo')),
        sceneNode(Popover,{id:'material-popover'},()=> 'Frodo has updated the map.'),
        sceneNode(Tooltip,{id:'material-tooltip'},()=> 'Office route'),
        sceneNode(Card,{id:'material-card',variant:'elevated',treatment:'expressive'},()=> 'Sam has prepared the briefing.')
      ])}).mount('#app');
    `);
    const page = await open(path, adapter === 'html' ? `
      <ui-dialog id="material-dialog" open size="sm" label="Fellowship briefing"><p>Sam and Frodo are reviewing the route to the next office.</p></ui-dialog>
      <ui-menu id="material-menu"><ui-menu-item value="memo">Fellowship memo</ui-menu-item></ui-menu>
      <ui-popover id="material-popover">Frodo has updated the map.</ui-popover>
      <ui-tooltip id="material-tooltip">Office route</ui-tooltip>
      <ui-card id="material-card" variant="elevated" treatment="expressive">Sam has prepared the briefing.</ui-card>
    ` : '<div id="app"></div>', [join(root,'tokens.css'),join(root,'theme-system.css')], {reducedMotion:'reduce'});
    try {
      await page.addStyleTag({content:themeCSS(recipe) + 'body {background:repeating-linear-gradient(45deg,black 0 20px,white 20px 40px);color:var(--ui-text)}'});
      const selectors=['#material-dialog','#material-menu .surface','#material-popover .surface','#material-tooltip .surface','#material-card'];
      for (const mode of ['light','dark']) {
        await page.locator('html').evaluate((element,mode)=>{element.dataset.theme=mode;},mode);
        for (const selector of selectors) {
          const foreground=await page.locator(selector).evaluate(element=>{
            const style=getComputedStyle(element);
            document.querySelector('#material-paint-probe')?.remove();
            const probe=document.createElement('div');probe.id='material-paint-probe';
            Object.assign(probe.style,{position:'fixed',inset:'0 auto auto 0',width:'64px',height:'64px',zIndex:'2147483647',background:'black'});
            const face=document.createElement('div');
            Object.assign(face.style,{width:'100%',height:'100%',backgroundImage:style.backgroundImage,backgroundColor:style.backgroundColor,backgroundBlendMode:style.backgroundBlendMode});
            probe.append(face);document.body.append(probe);
            const context=document.createElement('canvas').getContext('2d')!;
            context.fillStyle=style.color;context.fillRect(0,0,1,1);
            return {rgba:[...context.getImageData(0,0,1,1).data],filter:style.backdropFilter};
          });
          const paints:number[][]=[];
          for(const backdrop of ['black','white']) {
            await page.locator('#material-paint-probe').evaluate((element,color)=>(element as HTMLElement).style.background=color,backdrop);
            const bytes=await page.locator('#material-paint-probe').screenshot();
            paints.push(await page.evaluate(async base64=>{
              const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
              const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
              const context=canvas.getContext('2d')!;context.drawImage(image,0,0);
              return [...context.getImageData(32,32,1,1).data];
            },bytes.toString('base64')));
          }
          // Layered backgrounds can have a transparent backgroundColor while their gradients
          // paint a nearly opaque face. Measure that paint against both extreme backdrops.
          const luminance=(rgba:number[])=>rgba.slice(0,3).map(channel=>channel/255).map(channel=>channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4).reduce((sum,channel,index)=>sum+channel*[.2126,.7152,.0722][index]!,0);
          for(const paint of paints) {
            const a=luminance(paint),b=luminance(foreground.rgba);
            assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${adapter}/${mode}/${selector}: painted content retains readable contrast`);
          }
          assert.ok(paints[0].slice(0,3).every((channel,index)=>Math.abs(channel-paints[1][index])<=28),`${selector}: the face transmits at most about ten percent of the scene`);
          assert.ok(foreground.filter.includes('blur('));
          await page.locator('#material-paint-probe').evaluate(element=>element.remove());
        }
      }
      const dialog=page.locator('#material-dialog');
      const before=await dialog.evaluate(element=>parseFloat(getComputedStyle(element).borderTopWidth));
      await page.evaluate(()=>(window as any).enlargeDialog());
      await page.waitForFunction(before=>parseFloat(getComputedStyle(document.querySelector('#material-dialog')!).borderTopWidth)>before,before);
      const client=await page.context().newCDPSession(page);
      await client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
      for(const selector of selectors) assert.equal(await page.locator(selector).evaluate(element=>getComputedStyle(element).backdropFilter),'none');
      await client.detach();
    } finally {await page.close();}
  });
});
