import { test, expect } from '@playwright/test';
import { chooseOption, chooseStartingPoint, openEditor, openOverview } from './choose-option.js';

for (const width of [390, 1280]) test(`dashboard opens only the requested editor at ${width}px`, async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 900 });
  await page.goto(info.config.metadata.markupress + 'customize/');
  const overview = page.locator('[data-customizer-overview]');
  await expect(overview).toBeVisible();
  await expect(page.locator('[data-refinement-view]:visible')).toHaveCount(0);
  await expect(page.locator('[data-token]:visible')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Preview variation', exact: true })).toHaveCount(0);
  for (const family of ['typography', 'layout', 'motion', 'palette', 'material', 'components', 'export']) {
    await openEditor(page, family);
    await expect(overview).toBeHidden();
    const editor = page.locator(`[data-refinement-view="${family}"]`);
    await expect(editor).toBeVisible();
    await expect(page.locator('[data-refinement-view]:visible')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width === 390 && ['typography','layout','motion','material','palette'].includes(family)) {
      const preview = editor.locator('[data-editor-preview], .palette-preview');
      expect(await preview.evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    }
    if (family === 'typography') {
      await expect(editor.getByRole('combobox', {name:'Font',exact:true})).toBeVisible();
      await expect(editor.getByRole('heading', { name: 'There and back again.', exact: true })).toBeVisible();
      await expect(page).toHaveURL(/#typography$/);
      await page.goBack(); await expect(overview).toBeVisible();
      await page.goForward(); await expect(editor).toBeVisible();
      await page.reload(); await expect(editor).toBeVisible();
      // WebKit locator visibility overlooks a collapsed panel's content-visibility.
      await expect(editor.getByRole('combobox', { name: 'Heading font', exact: true })).toBeVisible();
    }
    await openOverview(page);
    await expect(overview).toBeVisible();
    await expect(['components','export'].includes(family) ? page.getByRole('button', {name:'Theme tools',exact:true}) : page.locator(`[data-action="refine-${family}"]`)).toBeFocused();
  }
  await chooseStartingPoint(page, 'garden');
  await expect(page.getByRole('combobox', {name:'Starting point',exact:true})).toHaveValue('Garden');
  await page.reload();
  await expect(page.getByRole('combobox', {name:'Starting point',exact:true})).toHaveValue('Garden');
  expect(errors).toEqual([]);
});

test('motion study uses the edited duration and curve and respects reduced motion', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(info.config.metadata.markupress + 'customize/');
  await page.locator('[data-action="refine-motion"]').click();
  const editor = page.locator('[data-refinement-view="motion"]');
  await chooseOption(editor.getByRole('combobox', {name:'Response time unit',exact:true}), 's');
  const duration = editor.getByRole('spinbutton', {name:'Response time',exact:true});
  await duration.fill('0.3s'); await duration.press('Enter');
  await editor.getByRole('button', {name:'Shape the curve',exact:true}).click();
  const curve = editor.getByRole('textbox', {name:'Response curve',exact:true});
  await expect.poll(() => curve.evaluate(element => element.checkVisibility({visibilityProperty:true}))).toBe(true);
  await curve.fill('linear'); await curve.press('Tab');
  await editor.locator('[data-action="replay-motion"]').click();
  const study = page.locator('[data-motion-object]');
  await expect.poll(() => study.evaluate(el => el.getAnimations().length)).toBe(1);
  await expect.poll(() => study.evaluate(el => {
    const timing=el.getAnimations()[0]?.effect.getTiming();
    return {duration:timing?.duration,linear:['linear','cubic-bezier(0, 0, 1, 1)'].includes(timing?.easing)};
  })).toEqual({duration:900,linear:true});
  await curve.fill('cubic-bezier(0.5,2,0.5,2)'); await curve.press('Tab');
  await editor.locator('[data-action="replay-motion"]').click();
  await expect.poll(() => study.evaluate(el => el.getAnimations()[0]?.effect.getTiming().easing)).toBe('cubic-bezier(0.5, 2, 0.5, 2)');
  await study.evaluate(el => { const animation=el.getAnimations()[0];animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)*.58; });
  expect(await study.evaluate(el => { const marker=el.getBoundingClientRect(),track=el.parentElement.getBoundingClientRect();return marker.left>=track.left&&marker.right<=track.right; })).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => study.evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(page.locator('[data-motion-preference]')).toContainText('Reduced motion is on');
  await expect(editor.locator('[data-action="replay-motion"]')).toBeDisabled();
  expect(await study.evaluate(el => el.getAnimations().length)).toBe(0);
});

for (const width of [1440,375]) test(`persistent overview reflects edits and keeps history controls available at ${width}px`, async ({page},info) => {
  await page.setViewportSize({width,height:900});
  await page.goto(info.config.metadata.markupress+'customize/#material');
  const summary=page.locator('[data-customizer-summary]');
  const editor=page.locator('[data-refinement-view="material"]');
  const finish=editor.getByRole('spinbutton',{name:'Finish',exact:true});
  const before=await finish.inputValue();
  const readout=summary.locator('[data-summary=material]');
  const initial=await readout.textContent();
  await finish.fill('100%');await finish.press('Enter');
  await expect(readout).toContainText('100% finish');
  if(width<640) await expect(summary.locator('[data-active-summary]')).toContainText('100% finish');
  await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
  const header=page.locator('[data-component~="ui-site-header"]');
  const box=await summary.boundingBox(),headerBox=await header.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(headerBox.y+headerBox.height-1);
  expect(box.y+box.height).toBeLessThan(900);
  await summary.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(finish).toHaveValue(before);
  await expect(readout).toHaveText(initial);
  await summary.getByRole('button',{name:'Redo',exact:true}).click();
  await expect(readout).toContainText('100% finish');
  await summary.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(readout).toHaveText(initial);
  await openEditor(page,'palette');
  const swatches=summary.locator('.palette-swatches > span');
  const original=await swatches.first().evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.getByRole('button',{name:'Action colour picker',exact:true}).click();
  const hex=page.getByRole('textbox',{name:'Hex colour',exact:true});
  await hex.fill('#26785c');await hex.press('Enter');await hex.press('Escape');
  await expect.poll(()=>swatches.first().evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(original);
  await expect(summary).toBeVisible();
});
