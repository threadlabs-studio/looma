import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('shows the full markup and setup used by each preview', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(info.config.metadata.markupress + 'blocks/');
  const sources = page.getByText('View HTML and JavaScript', { exact: true });
  const names = ['editor-workspace', 'list-detail', 'settings-form', 'search-and-open'];
  await expect(sources).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    const summary = sources.nth(index);
    await summary.press('Enter');
    const snippets = summary.locator('..').locator('pre code');
    await expect(snippets).toHaveCount(2);
    for (const [i, extension] of ['html', 'js'].entries()) {
      const file = new URL(`../../../packages/looma/src/blocks/${name}.${extension}`, import.meta.url);
      const source = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n').trim();
      expect((await snippets.nth(i).textContent()).trim()).toBe(source);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
});

test.describe('server-rendered block content', () => {
  test.use({ javaScriptEnabled: false });

  test('keeps the draft, report destinations and labeled form available without JavaScript', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(info.config.metadata.markupress + 'blocks/');
    const draft = page.getByRole('heading', { name: 'Field notes from the coast' });
    await expect(draft).toBeVisible();
    const outline = page.getByRole('navigation', { name: 'Document sections' });
    await outline.getByRole('link', { name: 'Draft' }).press('Enter');
    await expect(page).toHaveURL(/#workspace-draft$/);
    expect((await draft.boundingBox()).width).toBeGreaterThan(150);
    const reports = page.getByRole('navigation', { name: 'Field reports' });
    await reports.getByRole('link', { name: 'South trail' }).press('Enter');
    await expect(page).toHaveURL(/#report-south$/);
    await expect(page.getByRole('heading', { name: 'North trail' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'South trail' })).toBeVisible();

    const form = page.getByRole('form', { name: 'Report preferences' });
    const field = form.getByRole('textbox', { name: 'Display name' });
    await expect(field).toHaveValue('Field team');
    await field.fill('Trail crew');
    await form.getByRole('button', { name: 'Reset' }).press('Enter');
    await expect(field).toHaveValue('Field team');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });
});

for (const width of [1440, 375]) {
  test(`editor workspace keeps the draft and document actions reachable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(info.config.metadata.markupress + 'blocks/');

    const draft = page.getByRole('heading', { name: 'Field notes from the coast' });
    const outline = page.getByRole('button', { name: 'Outline', exact: true });
    const sections = page.getByRole('navigation', { name: 'Document sections' });
    const details = page.getByRole('button', { name: 'Details', exact: true });
    await expect(draft).toBeVisible();
    await expect(page.getByText('By the time we reached the tide pools', { exact: false }).first()).toBeVisible();

    if (width === 375) {
      await expect(sections).toBeHidden();
      await outline.press('Enter');
      await expect(sections).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(sections).toBeHidden();
      await outline.press('Enter');
      await sections.getByRole('link', { name: 'Revision notes' }).press('Enter');
      await expect(sections).toBeHidden();
      await expect(page.getByRole('heading', { name: 'Revision notes' })).toBeFocused();
    } else {
      await expect(sections).toBeVisible();
      const outlineBounds = await sections.boundingBox();
      expect((await draft.boundingBox()).x).toBeGreaterThan(outlineBounds.x + outlineBounds.width);
      await outline.press('Enter');
      await expect(sections).toBeHidden();
      await outline.press('Enter');
      await expect(sections).toBeVisible();
    }

    await details.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Document details' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(details).toBeFocused();
    const [outlineBox, detailsBox] = await Promise.all([outline.boundingBox(), details.boundingBox()]);
    expect(outlineBox.y).toBe(detailsBox.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await details.blur();
    await page.getByLabel('Editor workspace example').screenshot({ path: info.outputPath('workspace.png') });
    const editor = page.getByRole('region', { name: 'Field notes from the coast' }).locator('[contenteditable="true"]');
    await editor.press('End');
    await page.keyboard.insertText(' This is an edit.');
    await expect(editor).toContainText('This is an edit.');
  });

  test(`list detail and settings keep the main task reachable at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(info.config.metadata.markupress + 'blocks/');
    const reports = page.getByRole('navigation', { name: 'Field reports' });
    const north = page.getByRole('heading', { name: 'North trail' });
    const south = page.getByRole('heading', { name: 'South trail' });
    await expect(north).toBeVisible();
    await expect(south).toBeHidden();
    await page.evaluate(() => { location.hash = 'editor-workspace'; });
    await expect(page).toHaveURL(/#editor-workspace$/);
    await reports.getByRole('link', { name: 'South trail' }).press('Enter');
    await expect(south).toBeFocused();
    await expect(north).toBeHidden();
    if (width === 1440) {
      const layout = page.locator('[component~="ui-switcher"]').filter({ has: reports });
      const reportDetail = page.getByLabel('Report detail');
      const originalWidth = await page.evaluate(() => innerWidth);
      await expect.poll(async () => (await reportDetail.boundingBox()).x).toBeGreaterThan((await reports.boundingBox()).x + (await reports.boundingBox()).width);
      await layout.evaluate(element => { element.style.maxInlineSize = '20rem'; });
      await expect.poll(async () => (await reportDetail.boundingBox()).y).toBeGreaterThan((await reports.boundingBox()).y);
      await expect(south).toBeFocused();
      expect(await page.evaluate(() => innerWidth)).toBe(originalWidth);
      await layout.evaluate(element => { element.style.removeProperty('max-inline-size'); });
    }
    await page.goBack();
    await expect(page).toHaveURL(/#editor-workspace$/);
    await expect(north).toBeVisible();
    await expect(south).toBeHidden();

    const form = page.getByRole('form', { name: 'Report preferences' });
    const field = form.getByRole('textbox', { name: 'Display name' });
    await field.fill('');
    await form.getByRole('button', { name: 'Save preferences' }).click();
    await expect(field).toBeFocused();
    await field.fill('Trail crew');
    await field.press('Enter');
    await expect(form.getByRole('status')).toHaveText('Preview updated for Trail crew.');
    await form.getByRole('button', { name: 'Reset' }).click();
    await expect(field).toHaveValue('Field team');
    await expect(form.getByRole('status')).toBeEmpty();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`search and open supports cancellation and selection at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(info.config.metadata.markupress + 'blocks/');
    const block = page.getByLabel('Search and open example');
    const trigger = block.getByRole('button', { name: 'Find a field guide' });
    const dialog = block.getByRole('dialog', { name: 'Find a field guide' });
    const query = dialog.getByRole('searchbox', { name: 'Filter field guides' });
    await trigger.press('Enter');
    await expect(query).toBeFocused();
    await query.fill('unknown');
    await expect(dialog.getByRole('status')).toHaveText('No matching guides');
    await expect(dialog.getByRole('button')).toHaveCount(0);
    await query.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.press('Enter');
    await query.fill('tides');
    await expect(dialog.getByRole('status')).toHaveText('1 guide');
    const result = dialog.getByRole('button', { name: 'Coastal conditions' });
    await query.press('ArrowDown');
    await expect(result).toBeFocused();
    await result.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(block.getByRole('heading', { name: 'Coastal conditions' })).toBeFocused();
    await expect(block.getByText('Check the tide window', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
