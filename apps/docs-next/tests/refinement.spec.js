import { chooseOption, openEditor, chooseStartingPoint, waitForThemeFonts, setBaseColor, chooseRefinement, openOverview } from './choose-option.js';
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { startingPoints } from '../../../packages/looma/tooling/docs/theme.mjs';

const session = page => page.evaluate(() => window[Symbol.for('looma.documentation.theme')].recipe);
const enter = async (page, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'bookish');
  return errors;
};

test('palette specimens align with the heading and persistent toolbar', async ({page}, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'bookish');
  const palette = await openEditor(page, 'palette');
  for (const width of [1440,375]) for (const dir of ['ltr','rtl']) {
    await page.setViewportSize({width,height:1000});
    await page.locator('html').evaluate((el,dir)=>el.dir=dir,dir);
    const edges=await palette.evaluate((pane,dir)=>{
      const start=el=>{const box=el.getBoundingClientRect();return dir==='rtl'?box.right:box.left;};
      return {heading:start(pane.querySelector('h2')),specimen:start(pane.querySelector('.palette-preview [data-theme="light"]')),toolbar:start(document.querySelector('[data-customizer-summary]'))};
    },dir);
    expect(Math.abs(edges.heading-edges.specimen),`${width}/${dir}: specimen edge`).toBeLessThan(1);
    expect(Math.abs(edges.heading-edges.toolbar),`${width}/${dir}: toolbar edge`).toBeLessThan(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});

test('theme history shortcuts work while a status dropdown has focus', async ({page}, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  const palette=await openEditor(page,'palette');
  const relationship=palette.getByRole('combobox',{name:'Status color relationship',exact:true});
  await relationship.selectOption('primary');
  for (const modifier of ['Control','Meta']) {
    await relationship.focus();
    await page.keyboard.press(`${modifier}+z`);
    await expect(relationship).toHaveValue('semantic');
    await page.keyboard.press(`${modifier}+Shift+z`);
    await expect(relationship).toHaveValue('primary');
  }
});

test('theme sampler delivers checked-choice hover over both marks and labels', async ({page}, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'looma');
  for (const tag of ['ui-checkbox', 'ui-switch', 'ui-radio']) {
    const control = page.locator(`[data-theme-sampler] [data-component~="${tag}"]`).first();
    const input = control.locator('input');
    await expect(input).toBeChecked();
    const paint = () => input.evaluate(el => getComputedStyle(el).backgroundColor);
    await page.mouse.move(0, 0); const rest = await paint();
    await control.locator('.label').hover();
    await expect.poll(paint).not.toBe(rest);
    await page.mouse.move(0, 0); await expect.poll(paint).toBe(rest);
    await input.hover(); await expect.poll(paint).not.toBe(rest);
    await expect(input).toBeChecked();
  }
});

test('touch taps commit starting theme, palette, material and font selections', async ({browser}, info) => {
  const context = await browser.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
  try {
    const page = await context.newPage();
    await page.goto(info.config.metadata.markupress + 'customize/');
    const select = async (family, label, option) => {
      const editor = family === 'themes' ? page.locator('[data-customizer-summary]') : await openEditor(page, family);
      const input = editor.getByRole('combobox', {name:label,exact:true});
      const control = input.locator('xpath=ancestor::*[@data-choice or @data-font-picker][1]');
      await input.tap();
      if (await input.getAttribute('aria-expanded') !== 'true') await control.getByRole('button', {name:'Show suggestions',exact:true}).tap();
      await control.getByRole('option', {name:option,exact:true}).tap();
      await expect(input).toHaveValue(option);
    };
    await select('themes', 'Starting point', 'Bookish');
    expect((await session(page)).origin).toBe('bookish');
    await select('palette', 'Palette preset', 'Forest & cream');
    expect((await session(page)).presets.palette).toBe('garden');
    await select('material', 'Material preset', 'Polished');
    expect((await session(page)).presets.material).toBe('polished');
    await select('typography', 'Font', 'System font');
    expect((await session(page)).fonts?.['body-font']).toBeUndefined();
    expect((await session(page)).values['body-font']).toContain('system-ui');
  } finally { await context.close(); }
});

test('completed edits undo and redo persist without an ambiguous comparison mode', async ({page}, info) => {
  const errors = await enter(page, info);
  const material = await openEditor(page, 'material');
  const beforeFocus = await session(page);
  await page.locator('[data-light-editor] .source').click();
  expect(await session(page)).toEqual(beforeFocus);
  const stage = page.locator('[data-light-editor]').getByRole('button',{name:'Material response',exact:true});
  await page.getByRole('button',{name:'Try floating surfaces',exact:true}).click();
  const card = page.locator('[data-refinement-view="material"] [data-component-card="ui-card"] [data-preview]').getByRole('button',{name:'Join briefing',exact:true});
  await expect(card).toHaveCSS('background-color', await stage.evaluate(e=>getComputedStyle(e).backgroundColor));
  await page.locator('[data-light-editor] .source').press('Shift+ArrowLeft');
  expect((await session(page)).values['light-x']).toBe('0.4');
  await expect(page.locator('[data-theme-origin]')).toHaveCount(0);
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await session(page)).values['light-x']).toBe('0.5');
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  const edited = await session(page);
  await expect(page.getByRole('button',{name:'Compare entry theme',exact:true})).toHaveCount(0);
  await page.reload(); expect(await session(page)).toEqual(edited);
  expect(errors).toEqual([]);
});

test('palette transformations change both mode specimens, keep geometry and survive navigation', async ({page},info) => {
  const errors = await enter(page,info);
  await openEditor(page, 'palette');
  const palette=page.locator('[data-refinement-view="palette"]');
  const colors=()=>palette.locator('.palette-canvas').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
  await waitForThemeFonts(page);
  const before=await colors(), geometry=(await session(page)).values['control-roominess'];
  const specimenSizes=()=>palette.locator('[data-theme]').evaluateAll(es=>es.map(el=>{const b=el.getBoundingClientRect();return [b.width,b.height]}));
  const beforeSizes=await specimenSizes();
  await palette.getByRole('button',{name:'Color character',exact:true}).click();
  await palette.getByRole('slider',{name:'Surface warmth',exact:true}).press('End');
  await expect.poll(colors).not.toEqual(before);
  await palette.getByRole('button',{name:/Related colors/}).click();
  const related=palette.getByRole('button',{name:/Related colors/}), preserved=palette.getByRole('button',{name:/Keep my colors/});
  await expect(related).toHaveAttribute('aria-pressed','true');
  await expect(preserved).toHaveAttribute('aria-pressed','false');
  expect(await related.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(await preserved.evaluate(el=>getComputedStyle(el).backgroundColor));
  expect((await session(page)).values['control-roominess']).toBe(geometry);
  expect((await session(page)).values['palette-relationship']).toBe('neighboring');
  await waitForThemeFonts(page);
  expect(await specimenSizes()).toEqual(beforeSizes);
  await expect(palette.locator('.palette-preview')).toHaveAttribute('data-page-flow','');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await expect(palette.locator('[data-theme="light"]')).toBeVisible();
  await expect(palette.locator('[data-theme="dark"]')).toBeVisible();
  const remembered=await session(page); await page.goto(info.config.metadata.markupress+'components/ui-button/');
  expect(await session(page)).toEqual(remembered); expect(errors).toEqual([]);
});

test('touch light placement persists and can be refined with the keyboard or undone', async ({browser},info) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const page=await context.newPage();
    const errors=await enter(page,info);
    const editor=await openEditor(page,'material');
    const plane=editor.locator('[data-light-editor] .plane');
    await plane.scrollIntoViewIfNeeded();
    const box=await plane.boundingBox();
    await page.touchscreen.tap(box.x+box.width*.8,box.y+box.height*.9);
    await expect.poll(async()=>Number((await session(page)).values['light-x'])).toBeCloseTo(.8,1);
    await expect.poll(async()=>Number((await session(page)).values['light-y'])).toBeCloseTo(.9,1);
    const placed=(await session(page)).values;
    await page.reload();
    await expect.poll(async()=>[(await session(page)).values['light-x'],(await session(page)).values['light-y']]).toEqual([placed['light-x'],placed['light-y']]);
    await openEditor(page,'material');
    const handle=editor.locator('[data-light-editor] .source');
    await handle.press('Shift+ArrowLeft');
    await expect.poll(async()=>Number((await session(page)).values['light-x'])).toBeCloseTo(Number(placed['light-x'])-.1,2);
    await page.getByRole('button',{name:'Undo',exact:true}).tap();
    await expect.poll(async()=>(await session(page)).values['light-x']).toBe(placed['light-x']);
    expect(errors).toEqual([]);
  } finally {await context.close();}
});

test('touch sizing preserves the ladder and finger drags preserve the grab offset without persisting each move', async ({browser,browserName},info) => {
  test.skip(browserName !== 'chromium', 'Native finger-drag injection uses CDP; real touch taps are covered in every engine.');
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  try {
    const errors=await enter(page,info);
    await openEditor(page, 'layout');
    const heights=await page.locator('[data-size-sample]').evaluateAll(rows=>rows.map(row=>row.querySelector('[data-size-actions] button[data-component="ui-button"]').getBoundingClientRect().height));
    expect(heights).toHaveLength(3); expect(heights[0]).toBeLessThan(heights[1]); expect(heights[1]).toBeLessThan(heights[2]);
    for(const size of ['sm','md','lg']) {
      const row=page.locator(`[data-size-sample="${size}"]`);
      const boxes=await row.locator('button[data-component="ui-button"],input[data-component="ui-input"],[data-component="ui-color-picker"] button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height));
      expect(Math.max(...boxes)-Math.min(...boxes)).toBeLessThan(.6);
    }
    const material=await openEditor(page, 'material');
    const handle=page.locator('[data-light-editor] .source'); await handle.scrollIntoViewIfNeeded();
    const s=await handle.boundingBox(), plane=await page.locator('[data-light-editor] .plane').boundingBox();
    expect(await handle.evaluate((source, point) => source.contains(document.elementFromPoint(point.x, point.y)), {x:s.x+s.width/2+12,y:s.y+s.height/2}), 'the light handle remains touchable beside the mobile specimen').toBe(true);
    const key='looma:documentation-theme:v1:/looma/';
    const stored=await page.evaluate(key=>localStorage.getItem(key),key);
    const client=await context.newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:s.x+s.width/2+12,y:s.y+s.height/2}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:s.x+s.width/2+13,y:s.y+s.height/2+1}]});
    await expect.poll(async()=>Number((await session(page)).values['light-x'])).toBeLessThanOrEqual(.51);
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:plane.x+plane.width*.75+12,y:plane.y+plane.height*.5}]});
    await expect.poll(async()=>Number((await session(page)).values['light-x'])).toBe(.75);
    expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(stored);
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).values['light-x'],key)).toBe('0.75');
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    expect((await session(page)).values['light-x']).toBe('0.5');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(errors).toEqual([]);
  } finally {await context.close();}
});

test('Google selection loads actual font faces, exports its import, and system font removes that selection', async ({page},info) => {
  await page.goto(info.config.metadata.markupress+'customize/');
  await openEditor(page, 'export');
  const baselineDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download CSS',exact:true}).click();
  const baselineCSS=await readFile(await (await baselineDownload).path(),'utf8');
  expect(baselineCSS).toContain('family=Manrope:wght@400;500;600;700&display=swap');
  const errors=await enter(page,info);
  await openEditor(page, 'typography');
  const font=page.getByRole('combobox',{name:'Font',exact:true});
  const fontRequests = [];
  page.on('request', request => { if (request.url().startsWith('https://fonts.googleapis.com/css2?')) fontRequests.push(new URL(request.url())); });
  await font.fill('Inter');
  const option = page.getByRole('option',{name:'Inter',exact:true});
  await expect.poll(() => option.locator('[data-font-preview]').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Looma Font Preview Inter');
  expect(await page.evaluate(() => [...document.fonts].some(face => face.family.replaceAll('"','') === 'Looma Font Preview Inter' && face.status === 'loaded'))).toBe(true);
  expect(fontRequests.some(url => url.searchParams.get('text') === 'Inter')).toBe(true);
  expect(fontRequests.some(url => url.searchParams.get('family')?.startsWith('Inter:') && !url.searchParams.has('text'))).toBe(false);
  await option.click();
  await expect(page.locator('[data-font-status="body-font"]')).toContainText('Inter loaded',{timeout:30000});
  expect(await page.evaluate(()=>[...document.fonts].some(face=>face.family.replaceAll('"','')==='Inter'&&face.status==='loaded'))).toBe(true);
  expect((await session(page)).fonts['body-font']).toBe('Inter');
  expect(fontRequests.some(url => url.searchParams.get('family')?.startsWith('Inter:') && !url.searchParams.has('text'))).toBe(true);
  await expect.poll(() => page.locator('[data-editor-preview="typography"]').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Inter');
  await openEditor(page, 'export');
  const downloaded=page.waitForEvent('download'); await page.getByRole('button',{name:'Download CSS',exact:true}).click();
  const download=await downloaded, css=await readFile(await download.path(),'utf8');
  expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:wght@400;500;600;700&display=swap");');
  await openEditor(page, 'typography');
  await font.fill('System'); await page.getByRole('option',{name:'System font',exact:true}).click();
  await expect(page.locator('[data-font-status="body-font"]')).toContainText('operating system');
  expect((await session(page)).values['body-font']).toBe('system-ui, sans-serif');
  expect((await session(page)).fonts['body-font']).toBeUndefined();
  await openEditor(page, 'export');
  const systemDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download CSS',exact:true}).click();
  const systemCSS=await readFile(await (await systemDownload).path(),'utf8');
  expect(systemCSS).not.toContain('family=Inter:');
  expect(systemCSS).toContain('family=Newsreader:wght@400;500;600;700&display=swap');
  expect(errors).toEqual([]);
});


test('overlapping font selections finish the status for both roles', async ({page},info) => {
  await enter(page,info);
  await openEditor(page, 'typography');
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('https://fonts.googleapis.com/**', async route => {
    if (!route.request().url().includes('family=Lora')) await held;
    await route.continue();
  });
  try {
    const body = page.getByRole('combobox',{name:'Font',exact:true});
    await body.fill('Inter'); await page.getByRole('option',{name:'Inter',exact:true}).click();
    await expect(page.locator('[data-font-status="body-font"]')).toContainText('Loading Inter');
    const display = page.getByRole('combobox',{name:'Heading font',exact:true});
    await display.fill('Lora'); await page.getByRole('option',{name:'Lora',exact:true}).click();
    await expect(page.locator('[data-font-status="display-font"]')).toContainText('Lora loaded',{timeout:30000});
    await expect(page.locator('[data-font-status="body-font"]')).toContainText('Inter loaded');
  } finally { release(); }
});

test('size specimens stay readable and unclipped at the largest root on a narrow touch screen', async ({browser},info) => {
  const context=await browser.newContext({viewport:{width:375,height:850},hasTouch:true,isMobile:true});
  const page=await context.newPage();
  try {
    await enter(page,info);
    await openEditor(page, 'typography');
    const base=page.getByRole('spinbutton',{name:'Base text size',exact:true});
    await base.fill('24px');await base.press('Enter');
    await openEditor(page, 'layout');
    await expect(page.locator('[data-editor-preview="layout"]')).toHaveCSS('position', 'static');
    await page.getByRole('spinbutton', {name:'Control roominess',exact:true}).click();
    for (const size of ['sm','md','lg']) {
      const row=page.locator(`[data-size-sample="${size}"]`);
      expect(await row.evaluate(el=>{
        const bounds=el.getBoundingClientRect();
        return [...el.querySelectorAll('button,input')].filter(control=>control.getClientRects().length).every(control=>{const box=control.getBoundingClientRect();return box.x>=bounds.x-1&&box.right<=bounds.right+1;});
      })).toBe(true);
      expect(await row.getByRole('textbox', {name:`${size} size sample`,exact:true}).evaluate(input=>{
        const style=getComputedStyle(input),context=document.createElement('canvas').getContext('2d');
        context.font=style.font;
        return context.measureText(input.value).width<=input.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
      })).toBe(true);
      await expect(row.locator('[data-size-readout]')).toContainText('rem');
    }
  } finally {await context.close();}
});

test('the compact documentation sampler stays visible across screen sizes and follows the shared theme', async ({page},info) => {
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:900});await enter(page,info);
    await openOverview(page);
    const sampler=page.locator('[data-theme-sampler]');
    const frame=sampler.locator('[data-preview]');
    const action=frame.getByRole('button',{name:'Send',exact:true});
    await expect(action).toBeVisible();
    await expect(frame.getByRole('textbox',{name:'Search office',exact:true})).toBeVisible();
    await expect(frame.getByRole('checkbox',{name:'Notify Sam',exact:true})).toBeVisible();
    await expect(frame.getByRole('switch',{name:'Available',exact:true})).toBeVisible();
    const icon=frame.getByRole('button',{name:'Acknowledge memo',exact:true}),outline=frame.getByRole('button',{name:'Archive',exact:true});
    expect(Math.abs((await icon.boundingBox()).height-(await outline.boundingBox()).height)).toBeLessThan(.1);
    const paint=field=>field.evaluate(el=>{const s=getComputedStyle(el);return [s.borderTopColor,s.backgroundColor];});
    expect(await paint(icon)).toEqual(await paint(outline));
    await expect(sampler.locator('.body')).toHaveCount(0);
    const bounds=await sampler.boundingBox(),controls=await page.locator('[data-customizer-summary]').boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(controls.y+controls.height);
    await chooseStartingPoint(page, 'wiki');
    await openOverview(page);
    await expect.poll(()=>action.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(79, 70, 229)');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});

test('sidebar fields reserve space for their focus treatment inside clipping containers', async ({page},info) => {
  await enter(page,info);
  await openEditor(page, 'typography');
  for(const field of [page.getByRole('combobox',{name:'Font',exact:true}),page.getByRole('spinbutton',{name:'Base text size',exact:true})]) {
    await field.focus();
    const clipped=await field.evaluate(input=>{
      const painted=input.closest('.field')??input,box=painted.getBoundingClientRect(),outset=parseFloat(getComputedStyle(input).getPropertyValue('--ui-focus-width'))*1.5;
      const problems=[];
      for(let node=painted.parentElement;node;node=node.parentElement) {
        const style=getComputedStyle(node);if(!['hidden','auto','scroll','clip'].includes(style.overflowX))continue;
        const clip=node.getBoundingClientRect(),left=clip.left+node.clientLeft,right=left+node.clientWidth;
        if(box.left-outset<left-.5||box.right+outset>right+.5)problems.push(node.tagName+'.'+node.className);
      }
      return problems;
    });
    expect(clipped).toEqual([]);
  }
});

test('starter rhythm changes sampler gaps and unitless text ratios together', async ({page},info) => {
  await page.goto(info.config.metadata.markupress+'customize/');
  const preset=page.locator('[data-preset] input[role=combobox]');
  const sampler=page.locator('[data-theme-sampler] [data-preview]');
  const measure=()=>sampler.locator('[data-component="ui-card"] [data-component="ui-stack"]').first().evaluate(el=>{
    const root=getComputedStyle(document.documentElement), s=getComputedStyle(el), heading=getComputedStyle(document.querySelector('h3'));
    return {gap:parseFloat(s.rowGap),headingRatio:parseFloat(heading.lineHeight)/parseFloat(heading.fontSize),bodyRatio:root.getPropertyValue('--ui-line-height').trim()};
  });
  await chooseStartingPoint(page, 'wiki');
  await openOverview(page);
  await expect(sampler.getByRole('heading',{name:'Second breakfast, sorted.',exact:true})).toBeVisible();
  const compact=await measure();
  await chooseStartingPoint(page, 'editorial');
  await openOverview(page);
  await expect.poll(async()=>(await measure()).gap).toBeGreaterThan(compact.gap);
  expect((await measure()).headingRatio).toBeGreaterThan(compact.headingRatio);
  expect((await measure()).bodyRatio).not.toMatch(/px|rem|em/);
});

test('palette and material defaults are muted until their family is overridden', async ({page},info) => {
  await enter(page,info);
  await openEditor(page, 'palette');
  const palette=page.locator('[data-refinement-preset=palette] input[role=combobox]');
  const material=page.locator('[data-refinement-preset=material] input[role=combobox]');
  const supporting=field=>field.evaluate(el=>{const probe=document.createElement('span');probe.style.color='var(--ui-text-secondary)';el.parentElement.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;});
  await expect.poll(()=>palette.evaluate(el=>getComputedStyle(el).color)).toBe(await supporting(palette));
  await expect.poll(()=>material.evaluate(el=>getComputedStyle(el).color)).toBe(await supporting(material));
  const inherited=await palette.evaluate(el=>getComputedStyle(el).color);
  await chooseOption(palette, 'garden');
  await expect.poll(()=>palette.evaluate(el=>getComputedStyle(el).color)).not.toBe(await supporting(palette));
  await expect.poll(()=>material.evaluate(el=>getComputedStyle(el).color)).toBe(await supporting(material));
  expect(await palette.evaluate(el=>getComputedStyle(el).color)).not.toBe(inherited);
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(palette).toHaveValue('Plum & paper');
  await expect.poll(()=>palette.evaluate(el=>getComputedStyle(el).color)).toBe(await supporting(palette));
});

test('one main font also styles headings until an optional heading font is chosen', async ({page},info) => {
  await page.goto(info.config.metadata.markupress+'customize/');
  await chooseStartingPoint(page, 'minimal');
  await openEditor(page, 'typography');
  const font=page.getByRole('combobox',{name:'Font',exact:true});
  const heading=page.getByRole('combobox',{name:'Heading font',exact:true});
  await font.fill('Inter');await page.getByRole('option',{name:'Inter',exact:true}).click();
  await expect.poll(async()=>(await session(page)).values['display-font']).toBe('"Inter", sans-serif');
  await heading.fill('Lora');await page.getByRole('option',{name:'Lora',exact:true}).click();
  expect((await session(page)).values['body-font']).toBe('"Inter", sans-serif');
  expect((await session(page)).values['display-font']).toBe('"Lora", serif');
  await heading.fill('Follow');await page.getByRole('listbox',{name:'Heading font suggestions',exact:true}).getByRole('option',{name:'Follow body',exact:true}).click();
  expect((await session(page)).values['display-font']).toBe('"Inter", sans-serif');
});

for (const width of [1280,390]) test(`styled palette choices show four swatches in the popup and selected field at ${width}px`, async ({page},info) => {
  await page.setViewportSize({width,height:844});
  const errors = await enter(page,info);
  await openEditor(page, 'palette');
  const palette = page.locator('[data-refinement-view="palette"] [data-refinement-preset="palette"]');
  const field = palette.getByRole('combobox',{name:'Palette preset',exact:true});
  await expect(palette.locator('[data-selected-palette] .palette-swatches > span')).toHaveCount(4);
  await expect(palette.locator('[data-selected-palette] .palette-swatches')).toBeVisible();
  await field.click();
  const forest = palette.getByRole('option',{name:'Forest & cream',exact:true});
  await expect(forest).toBeVisible();
  await palette.getByRole('button',{name:'Show suggestions',exact:true}).click();
  await expect(palette.getByRole('listbox')).toBeHidden();
  await field.click();
  await expect(forest).toBeVisible();
  await field.fill('');
  const alpha = await palette.locator('[popover]').evaluate(element => {
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    context.fillStyle=getComputedStyle(element).backgroundColor;context.fillRect(0,0,1,1);
    return context.getImageData(0,0,1,1).data[3];
  });
  expect(alpha).toBeGreaterThanOrEqual(250); // Nearly opaque at this theme’s restrained transparency.
  await expect(forest.locator('.palette-swatches > span')).toHaveCount(4);
  await expect(forest.locator('.palette-swatches')).toBeVisible();
  const sizes = await forest.locator('.palette-swatches > span').evaluateAll(nodes => nodes.map(node => { const rect=node.getBoundingClientRect();return [rect.width,rect.height]; }));
  for (const [width,height] of sizes) { expect(width).toBeGreaterThan(4);expect(Math.abs(width-height)).toBeLessThan(0.1); }
  const colors = await forest.locator('.palette-swatches > span').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  expect(new Set(colors).size).toBe(4);
  await palette.getByRole('listbox').screenshot({path:info.outputPath(`palette-options-${width}.png`)});
  await forest.click();
  await expect(field).toHaveValue('Forest & cream');
  const geometry = await palette.evaluate(element => {
    const field=element.querySelector('.field').getBoundingClientRect(),swatches=element.querySelector('[data-selected-palette] .palette-swatches').getBoundingClientRect();
    return {inset:swatches.left-field.left,offset:Math.abs((swatches.top+swatches.height/2)-(field.top+field.height/2))};
  });
  expect(geometry.inset).toBeGreaterThan(3);
  expect(geometry.offset).toBeLessThan(2);
  expect((await session(page)).presets.palette).toBe('garden');
  await palette.screenshot({path:info.outputPath(`palette-selected-${width}.png`)});
  await field.press('ArrowDown');
  await expect(palette.getByRole('listbox')).toBeVisible();
  await field.press('Escape');
  await expect(palette.getByRole('listbox')).toBeHidden();
  expect(errors).toEqual([]);
});


test('field label sizing follows body text or keeps an independent persisted size', async ({page},info) => {
  await page.goto(info.config.metadata.markupress+'customize/');
  await chooseStartingPoint(page,'minimal');
  const editor=await openEditor(page,'typography');
  const label=editor.locator('label').filter({hasText:'Memo title'});
  const source=editor.locator('[data-label-size-source]');
  await expect(source).toHaveValue('inherit');
  await expect(label).toHaveCSS('font-size','16px');
  await source.selectOption('custom');
  const size=editor.getByRole('spinbutton',{name:'Independent field label size',exact:true});
  await size.fill('14px'); await size.press('Enter');
  await expect(label).toHaveCSS('font-size','14px');
  expect((await session(page)).values['label-size']).toBe('14px');
  await page.reload();
  await expect(label).toHaveCSS('font-size','14px');
  await source.selectOption('inherit');
  await expect(label).toHaveCSS('font-size','16px');
  await expect(size).toBeHidden();
  expect((await session(page)).values['label-size']).toBe('inherit');
});

test('rhythm separates stacked size groups without spreading navigation or action rows', async ({page},info) => {
  await page.goto(info.config.metadata.markupress+'customize/');
  await chooseStartingPoint(page,'minimal');
  const editor=await openEditor(page,'layout');
  const measure=()=>page.evaluate(()=>({
    groups:parseFloat(getComputedStyle(document.querySelector('[data-size-groups]')).rowGap),
    row:parseFloat(getComputedStyle(document.querySelector('[data-size-actions]')).columnGap),
    nav:parseFloat(getComputedStyle(document.querySelector('[data-component~="ui-site-header"] .navigation')).columnGap),
  }));
  const before=await measure();
  await editor.getByRole('slider',{name:'Rhythm',exact:true}).press('End');
  await expect.poll(async()=>(await measure()).groups).toBeGreaterThan(before.groups);
  const after=await measure(); expect(after.row).toBe(before.row); expect(after.nav).toBe(before.nav);
  for(const size of ['sm','md','lg']) expect(await editor.locator(`[data-size-sample="${size}"] [data-size-actions] button`).count()).toBe(3);
});

test('material samples show ordinary and expressive surfaces with working floating controls', async ({page},info) => {
  await enter(page,info);
  const editor=await openEditor(page,'material');
  await expect(editor.locator('[data-material-standard]')).toBeVisible();
  await expect(editor.locator('[data-material-expressive]')).toBeVisible();
  await editor.getByRole('button',{name:'Open popover',exact:true}).click();
  await expect(page.getByText('Floating material',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await editor.getByRole('button',{name:'Open dialog',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Surface and light',exact:true})).toBeVisible();
  await page.getByRole('dialog',{name:'Surface and light',exact:true}).getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Surface and light',exact:true})).toBeHidden();
});

for (const width of [1440,375]) test(`palette relationships govern neutral boundaries and status families at ${width}px`, async ({page},info) => {
  await page.setViewportSize({width,height:1000});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(info.config.metadata.markupress+'customize/');await chooseStartingPoint(page,'minimal');
  const editor=await openEditor(page,'palette');
  const boundaries=()=>editor.locator('.palette-preview [data-theme]').evaluateAll(cards=>cards.map(card=>{
    const border=element=>getComputedStyle(element).borderTopColor;
    return [card.querySelector('input'),...card.querySelectorAll('[data-component~="ui-button"][data-tone="neutral"]')].map(border);
  }));
  await page.mouse.move(1,1);
  for(const colors of await boundaries()) expect(new Set(colors).size).toBe(1);
  const before=await boundaries();
  const minimum=editor.getByRole('spinbutton',{name:'Border contrast',exact:true});
  await minimum.fill('3');await minimum.press('Enter');
  await page.mouse.move(1,1);
  await expect.poll(boundaries).not.toEqual(before);
  for(const colors of await boundaries()) expect(new Set(colors).size).toBe(1);
  await setBaseColor(page,'Secondary accent','#dd7045');
  await setBaseColor(page,'Tertiary accent','#208676');
  await expect(editor.locator('[data-extra-accent="secondary-action"]').first()).toBeVisible();
  for(const [role,label] of [['success','Success'],['danger','Error'],['warning','Warning'],['info','Info']]) {
    await editor.getByRole('combobox',{name:label+' relationship',exact:true}).selectOption('primary');
    expect(await editor.locator(`[data-token="${role}-color"]`).count()).toBe(0);
  }
  const statusColors=()=>editor.locator('.palette-preview [data-theme]').evaluateAll(cards=>cards.map(card=>['Success','Error','Warning','Info'].map(label=>getComputedStyle([...card.querySelectorAll('[data-component~="ui-badge"]')].find(badge=>badge.textContent.trim()===label)).color)));
  for(const colors of await statusColors()) expect(new Set(colors).size).toBe(1);
  await editor.getByRole('combobox',{name:'Link accent',exact:true}).selectOption('secondary');
  const edited=await session(page);
  expect(edited.values['secondary-action']).toBe('#dd7045');
  expect(edited.values['tertiary-action']).toBe('#208676');
  expect(edited.values['neutral-border-contrast']).toBe('3');
  await page.reload();expect(await session(page)).toEqual(edited);
  for(const colors of await statusColors()) expect(new Set(colors).size).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  expect(errors).toEqual([]);
});

test('Gold outline borders respond to the visibility minimum without changing their text', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'gold');
  const editor = await openEditor(page, 'palette');
  const outline = editor.locator('.palette-preview [data-theme="light"]').getByRole('button', { name: 'Outline', exact: true });
  const colors = () => outline.evaluate(element => {
    const style = getComputedStyle(element);
    return { border: style.borderTopColor, text: style.color };
  });
  await page.mouse.move(1, 1);
  const before = await colors();
  const minimum = editor.getByRole('spinbutton', { name: 'Border contrast', exact: true });
  await minimum.fill('3');
  await minimum.press('Enter');
  await page.mouse.move(1, 1);
  await expect.poll(async () => (await colors()).border).not.toBe(before.border);
  expect((await colors()).text).toBe(before.text);
  const resting = await colors();
  await outline.hover();
  await expect.poll(colors).toEqual(resting);
});

for (const startingPoint of Object.keys(startingPoints)) test(`${startingPoint} outline wash uses calibrated translucent accent roles at rest and on hover`, async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, startingPoint);
  const editor = await openEditor(page, 'palette');
  for (const mode of ['light', 'dark']) {
    const outline = editor.locator(`.palette-preview [data-theme="${mode}"]`).getByRole('button', { name: 'Outline', exact: true });
    const wash = role => outline.evaluate((element, role) => {
      const probe = document.createElement('span');
      probe.style.color = `var(--ui-accent-${role})`;
      element.append(probe);
      const color = getComputedStyle(probe).color;
      const background = getComputedStyle(element).backgroundImage;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const alpha = context.getImageData(0, 0, 1, 1).data[3] / 255;
      probe.remove();
      return { expected: `linear-gradient(${color}, ${color})`, background, alpha };
    }, role);
    await page.mouse.move(0, 0);
    const rest = await wash('wash');
    expect(rest.background).toContain(rest.expected);
    await outline.hover();
    const hover = await wash('wash-hover');
    expect(hover.background).toContain(hover.expected);
    expect(hover.expected).not.toBe(rest.expected);
    expect(hover.background.replace(hover.expected, '')).toBe(rest.background.replace(rest.expected, ''));
    for (const { alpha } of [rest, hover]) {
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);
    }
  }
});
