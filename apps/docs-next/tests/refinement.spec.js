import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const session = page => page.evaluate(() => window[Symbol.for('looma.documentation.theme')].recipe);
const enter = async (page, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(info.config.metadata.markupress + 'customize/');
  await page.getByRole('combobox', {name:'Starting point',exact:true}).selectOption('bookish');
  return errors;
};

test('completed edits undo and redo persist without an ambiguous comparison mode', async ({page}, info) => {
  const errors = await enter(page, info);
  await page.getByRole('button',{name:'Refine material & light',exact:true}).click();
  const beforeFocus = await session(page);
  await page.locator('[data-light-editor] .source').click();
  expect(await session(page)).toEqual(beforeFocus);
  const stage = page.locator('[data-light-editor]').getByRole('button',{name:'Join briefing',exact:true});
  const card = page.locator('[data-refinement-view="material"] [data-component-card="ui-card"] iframe').contentFrame().getByRole('button',{name:'Join briefing',exact:true});
  await expect.poll(() => card.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe(await stage.evaluate(e=>getComputedStyle(e).backgroundColor));
  await page.getByRole('button',{name:'Upper left',exact:true}).click();
  expect((await session(page)).values['light-x']).toBe('0.15');
  await expect(page.locator('[data-theme-origin]')).toHaveText('Bookish · customized');
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  expect((await session(page)).values['light-x']).toBe('0.5');
  await page.getByRole('button',{name:'Redo',exact:true}).click();
  const edited = await session(page);
  await expect(page.getByRole('button',{name:'Compare entry theme',exact:true})).toHaveCount(0);
  await page.reload(); expect(await session(page)).toEqual(edited);
  expect(errors).toEqual([]);
});

test('nearby variations preview before applying and honor family locks', async ({page},info) => {
  const errors = await enter(page,info), original=await session(page);
  await page.getByText('Explore nearby styles',{exact:true}).click();
  await page.getByRole('checkbox',{name:'Lock Palette',exact:true}).check();
  await page.getByRole('button',{name:'Preview variation',exact:true}).click();
  await expect(page.locator('[data-variation-description]')).toContainText('No changes');
  expect(await session(page)).toEqual(original);
  await page.getByRole('button',{name:'Cancel preview',exact:true}).click();
  await page.getByRole('checkbox',{name:'Lock Palette',exact:true}).uncheck();
  await page.getByRole('button',{name:'Preview variation',exact:true}).click();
  await expect(page.locator('[data-variation-description]')).toContainText('Surface warmth');
  expect(await session(page)).toEqual(original);
  await page.getByRole('button',{name:'Apply variation',exact:true}).click();
  expect((await session(page)).values.warmth).toBe('0.65');
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  expect(await session(page)).toEqual(original);
  expect(errors).toEqual([]);
});

test('palette transformations change both mode specimens, keep geometry and survive navigation', async ({page},info) => {
  const errors = await enter(page,info);
  await page.getByRole('button',{name:'Refine palette',exact:true}).click();
  const palette=page.locator('[data-refinement-view="palette"]');
  const colors=()=>palette.locator('.palette-canvas').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));
  const before=await colors(), geometry=(await session(page)).values['control-roominess'];
  await palette.getByRole('slider',{name:'Surface warmth',exact:true}).press('End');
  await expect.poll(colors).not.toEqual(before);
  await palette.getByRole('combobox',{name:'Palette relationship',exact:true}).selectOption('neighboring');
  expect((await session(page)).values['control-roominess']).toBe(geometry);
  expect((await session(page)).values['palette-relationship']).toBe('neighboring');
  await expect(palette.locator('[data-theme="light"] [data-example-card]')).toBeVisible();
  await expect(palette.locator('[data-theme="dark"] [data-example-card]')).toBeVisible();
  const remembered=await session(page); await page.goto(info.config.metadata.markupress+'components/ui-button/');
  expect(await session(page)).toEqual(remembered); expect(errors).toEqual([]);
});

test('touch sizing preserves the ladder and finger drags preserve the grab offset without persisting each move', async ({browser},info) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  try {
    const errors=await enter(page,info);
    await page.getByRole('button',{name:'Type, size & motion',exact:true}).click();
    await page.getByText('Size & spacing',{exact:true}).click();
    const heights=await page.locator('[data-size-sample] button[data-component="ui-button"]').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
    expect(heights).toHaveLength(3); expect(heights[0]).toBeLessThan(heights[1]); expect(heights[1]).toBeLessThan(heights[2]);
    for(const size of ['sm','md','lg']) {
      const row=page.locator(`[data-size-sample="${size}"]`);
      const boxes=await row.locator('button[data-component="ui-button"],input[data-component="ui-input"],[data-component="ui-color-picker"] button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect().height));
      expect(Math.max(...boxes)-Math.min(...boxes)).toBeLessThan(.6);
    }
    await page.getByRole('button',{name:'Refine material & light',exact:true}).click();
    const handle=page.locator('[data-light-editor] .source'); await handle.scrollIntoViewIfNeeded();
    const s=await handle.boundingBox(), plane=await page.locator('[data-light-editor] .plane').boundingBox();
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
  const errors=await enter(page,info);
  await page.getByRole('button',{name:'Type, size & motion',exact:true}).click();
  await page.getByText('Type',{exact:true}).click();
  const font=page.getByRole('combobox',{name:'Body font',exact:true});
  await font.fill('Inter'); await page.getByRole('option',{name:'Inter',exact:true}).click();
  await expect(page.locator('[data-font-status="body-font"]')).toContainText('Inter loaded',{timeout:30000});
  expect(await page.evaluate(()=>[...document.fonts].some(face=>face.family.replaceAll('"','')==='Inter'&&face.status==='loaded'))).toBe(true);
  expect((await session(page)).fonts['body-font']).toBe('Inter');
  const specimen = page.locator('[data-customizer-overview] [data-component-card="ui-button"] iframe').contentFrame();
  await expect.poll(() => specimen.locator('body').evaluate(() => [...document.fonts].some(face => face.family.replaceAll('"','') === 'Inter' && face.status === 'loaded'))).toBe(true);
  await page.getByText('Export & save',{exact:true}).click();
  const downloaded=page.waitForEvent('download'); await page.getByRole('button',{name:'Download CSS',exact:true}).click();
  const download=await downloaded, css=await readFile(await download.path(),'utf8');
  expect(css).toContain('@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");');
  await font.fill('System'); await page.getByRole('option',{name:'System font',exact:true}).click();
  await expect(page.locator('[data-font-status="body-font"]')).toContainText('operating system');
  expect((await session(page)).values['body-font']).toBe('system-ui, sans-serif');
  expect((await session(page)).fonts['body-font']).toBeUndefined(); expect(errors).toEqual([]);
});


test('overlapping font selections finish the status for both roles', async ({page},info) => {
  await enter(page,info);
  await page.getByRole('button',{name:'Type, size & motion',exact:true}).click();
  await page.getByText('Type',{exact:true}).click();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('https://fonts.googleapis.com/**', async route => {
    if (!route.request().url().includes('family=Lora')) await held;
    await route.continue();
  });
  try {
    const body = page.getByRole('combobox',{name:'Body font',exact:true});
    await body.fill('Inter'); await page.getByRole('option',{name:'Inter',exact:true}).click();
    await expect(page.locator('[data-font-status="body-font"]')).toContainText('Loading Inter');
    const display = page.getByRole('combobox',{name:'Display font',exact:true});
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
    await page.getByRole('button',{name:'Type, size & motion',exact:true}).click();
    await page.getByText('Type',{exact:true}).click();
    const base=page.getByRole('spinbutton',{name:'Base text size',exact:true});
    await base.fill('24px');await base.press('Enter');
    await page.getByText('Size & spacing',{exact:true}).click();
    for (const size of ['sm','md','lg']) {
      const row=page.locator(`[data-size-sample="${size}"]`);
      expect(await row.evaluate(el=>{
        const bounds=el.getBoundingClientRect();
        return [...el.querySelectorAll('button,input')].filter(control=>control.getClientRects().length).every(control=>{const box=control.getBoundingClientRect();return box.x>=bounds.x-1&&box.right<=bounds.right+1;});
      })).toBe(true);
      expect(await row.locator(`input[label="${size} size sample"]`).evaluate(input=>{
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
    const sampler=page.locator('[data-theme-sampler]');
    const frame=sampler.locator('iframe').contentFrame();
    const action=frame.getByRole('button',{name:'Send memo',exact:true});
    await expect(action).toBeVisible();
    await expect(frame.getByRole('textbox',{name:'Search office',exact:true})).toBeVisible();
    await expect(frame.getByRole('checkbox',{name:'Notify Sam',exact:true})).toBeVisible();
    await expect(frame.getByRole('switch',{name:'Available',exact:true})).toBeVisible();
    await expect(sampler.locator('.body')).toHaveCount(0);
    const bounds=await sampler.boundingBox(),controls=await page.getByRole('complementary',{name:'Theme controls',exact:true}).boundingBox();
    if(width<640) expect(bounds.y).toBeLessThan(controls.y);else expect(bounds.x).toBeGreaterThan(controls.x);
    await page.getByRole('combobox',{name:'Starting point',exact:true}).selectOption('wiki');
    await expect.poll(()=>action.evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(79, 70, 229)');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});

test('sidebar fields reserve space for their focus treatment inside clipping containers', async ({page},info) => {
  await enter(page,info);
  await page.getByRole('button',{name:'Type, size & motion',exact:true}).click();await page.getByText('Type',{exact:true}).click();
  for(const field of [page.getByRole('combobox',{name:'Body font',exact:true}),page.getByRole('spinbutton',{name:'Base text size',exact:true})]) {
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
