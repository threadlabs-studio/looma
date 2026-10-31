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

for (const width of [1440, 375]) for (const mode of ['light', 'dark']) {
 test(`catalog cards stay still and their entire lower panel is a visible native link at ${width}px in ${mode}`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(info.config.metadata.markupress + 'components/');
  const card = page.locator('[data-component-card="ui-button"]');
  await page.locator('html').evaluate((element, mode) => element.dataset.theme = mode, mode);
  const body = card.locator('.body');
  const preview = card.locator('[data-preview]');
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => document.fonts.ready);
  await expect(body).toHaveCSS('background-color', await card.evaluate(element => getComputedStyle(element).backgroundColor));
  const resting = await body.evaluate(element => getComputedStyle(element).backgroundColor);
  const position = await card.boundingBox();
  await preview.hover();
  await expect(card).toHaveCSS('transform', 'none');
  await expect(body).toHaveCSS('background-color', resting);
  await body.hover();
  await expect(card).toHaveCSS('transform', 'none');
  await expect(body).not.toHaveCSS('background-color', resting);
  expect((await card.boundingBox()).y).toBe(position.y);
  await card.screenshot({ path: info.outputPath('card-hover.png'), animations: 'disabled' });
  const destination = card.locator('h3 a');
  await expect(body.getByRole('link')).toHaveCount(1);
  const href = await destination.getAttribute('href');
  expect(await body.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return [[4, 4], [rect.width - 4, rect.height - 4], [rect.width / 2, rect.height / 2]].map(([x, y]) =>
      document.elementFromPoint(rect.x + x, rect.y + y)?.closest('a')?.getAttribute('href'));
  })).toEqual([href, href, href]);
  await destination.focus();
  await destination.press('Shift+Tab');
  await page.keyboard.press('Tab');
  expect(await destination.evaluate(element => getComputedStyle(element, '::after').outlineStyle)).toBe('solid');
  await body.click({ position: { x: 4, y: 4 } });
  await expect(page).toHaveURL(new URL(href, info.config.metadata.markupress).href);
 });
}

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
    const preview = page.locator('[data-component-card="ui-card"] [data-preview]');
    expect(await preview.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  }
});

test('the Editor guide supports keyboard selection and cancellation in its pickers', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'editor/');
  const editor = page.getByRole('textbox', { name: 'Editor guide playground', exact: true });
  for (const [source, label] of [['/heading', 'Insert block'], ['@Frodo', 'Mentions']]) {
    await editor.fill(''); await editor.pressSequentially(source);
    const picker = page.getByRole('listbox', { name: label, exact: true });
    await expect(picker).toBeVisible();
    await editor.press('ArrowDown'); await editor.press('Enter');
    await expect(picker).toBeHidden(); await expect(editor).toBeFocused();
    if (source.startsWith('/')) await expect(editor.locator('h2')).toHaveCount(1);
    else await expect(editor).toContainText('Frodo Baggins');
    await editor.fill(''); await editor.pressSequentially(source);
    await expect(picker).toBeVisible(); await editor.press('Escape');
    await expect(picker).toBeHidden(); await expect(editor).toBeFocused();
  }
});

test('the Editor guide pickers work by touch at 375px', async ({ browser }, info) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 900 }, hasTouch: true, isMobile: true });
  try {
    const page = await context.newPage();
    await page.goto(info.config.metadata.markupress + 'editor/');
    const editor = page.getByRole('textbox', { name: 'Editor guide playground', exact: true });
    for (const [source, label, choice] of [['/heading', 'Insert block', 'Heading 2'], ['@Frodo', 'Mentions', 'Frodo Baggins']]) {
      await editor.fill(''); await editor.pressSequentially(source);
      const picker = page.getByRole('listbox', { name: label, exact: true });
      await expect(picker).toBeVisible();
      const box = await picker.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(376);
      await picker.getByRole('option', { name: new RegExp(choice) }).tap();
      await expect(picker).toBeHidden();
      if (source.startsWith('/')) await expect(editor.locator('h2')).toHaveCount(1);
      else await expect(editor).toContainText('Frodo Baggins');
    }
  } finally { await context.close(); }
});
