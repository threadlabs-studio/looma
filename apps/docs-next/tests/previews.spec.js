import { expect, test } from '@playwright/test';
import { openEditor } from './choose-option.js';

test('directory previews are prerendered in the page and their images load', async ({ page }, info) => {
  const documents = [];
  page.on('request', request => { if (request.isNavigationRequest()) documents.push(request.url()); });
  await page.goto(info.config.metadata.markupress + 'components/');
  await expect(page.locator('iframe')).toHaveCount(0);
  await expect(page.locator('[data-component-card="ui-button"] [data-preview] button')).toBeVisible();
  const image = page.locator('[data-component-card="ui-image"] [data-preview] img');
  await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
  expect(documents.some(url => url.includes('/_looma/preview/'))).toBe(false);
  const duplicates = await page.evaluate(() => {
    const seen = new Set();
    return [...document.querySelectorAll('[id]')].map(element => element.id).filter(id => id && (seen.has(id) || !seen.add(id)));
  });
  expect(duplicates).toEqual([]);
});

test('the catalog has meaningful previews before JavaScript', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(info.config.metadata.markupress + 'components/');
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('[data-component-card="ui-button"] [data-preview] button')).toBeVisible();
    await expect(page.locator('[data-component-card="ui-table"] [data-preview] table')).toBeVisible();
    await expect(page.locator('[data-component-card="ui-image"] [data-preview] img')).toBeVisible();
  } finally { await context.close(); }
});

test('repeated examples keep their own trigger and command targets', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await openEditor(page, 'components');
  const card = page.locator('[data-refinement-view="components"] [data-component-card="ui-dialog"]');
  await card.locator('[data-example-id="open-confirmation"]').click();
  const dialog = card.getByRole('dialog', { name: 'Send Fellowship memo?', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep draft', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('directory cards stay within a narrow page without opening floating surfaces on load', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(info.config.metadata.markupress + 'components/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(page.locator('[data-component-card="ui-search-shell"] [data-demo-trigger]')).toBeVisible();
  await expect(page.locator('[data-component-card="ui-search-shell"] dialog')).toBeHidden();
});

test('sized surfaces fit the available preview width', async ({ page }, info) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(info.config.metadata.markupress + 'components/');
    const preview = page.locator('[data-component-card="ui-editor-link-card"] [data-preview]');
    expect(await preview.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
});

test('compact editor pickers support keyboard selection and cancellation', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/');
  for (const [tag, label, expected] of [['ui-editor-slash-menu', 'Insert a block', 'table'], ['ui-editor-mention-menu', 'Mention a teammate', 'noah']]) {
    const card = page.locator(`[data-component-card="${tag}"]`);
    const trigger = card.getByRole('button', { name: label, exact: true });
    await card.locator('[data-demo-surface]').evaluate(element => element.addEventListener('select', event => { element.dataset.chosen = event.detail.value; }));
    await trigger.focus(); await trigger.press('ArrowDown');
    const picker = card.getByRole('listbox');
    await expect(picker).toBeVisible(); await expect(picker).toBeFocused();
    await picker.press('ArrowDown'); await picker.press('Enter');
    await expect(card.locator('[data-demo-surface]')).toHaveAttribute('data-chosen', expected);
    await expect(picker).toBeHidden(); await expect(trigger).toBeFocused();
    await trigger.click(); await expect(picker).toBeVisible();
    await picker.press('Escape'); await expect(picker).toBeHidden(); await expect(trigger).toBeFocused();
  }
});

test('compact editor pickers work by touch at 375px', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto(info.config.metadata.markupress + 'components/');
    for (const [tag, label, choice] of [['ui-editor-slash-menu', 'Insert a block', 'Table'], ['ui-editor-mention-menu', 'Mention a teammate', 'Noah Williams']]) {
      const card = page.locator(`[data-component-card="${tag}"]`);
      const trigger = card.getByRole('button', { name: label, exact: true });
      await trigger.tap();
      const picker = card.getByRole('listbox');
      await expect(picker).toBeVisible();
      const box = await picker.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(376);
      await picker.getByRole('option', { name: new RegExp(choice) }).tap();
      await expect(picker).toBeHidden(); await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
  } finally { await context.close(); }
});
