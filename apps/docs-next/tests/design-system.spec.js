import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { readCatalog, validateRecipe } from '@threadlabs/looma/docs';

const catalog = await readCatalog();

test('directory cards and full reference come from the published component catalog', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/');
  await expect(page.locator('[data-component-card]')).toHaveCount(catalog.components.filter(component => !component.navigationParent).length);
  for (const tag of ['ui-button', 'ui-stack', 'ui-color-picker']) {
    const card = page.locator(`[data-component-card="${tag}"]`);
    await expect(card.locator('h3')).toHaveText(catalog.components.find(component => component.tag === tag).title);
    await expect(card.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
  }
  await page.getByRole('searchbox', { name: 'Find a component', exact: true }).fill('color picker');
  await expect(page.locator('[data-component-card="ui-color-picker"]')).toBeVisible();
  await expect(page.locator('[data-component-card="ui-stack"]')).toBeHidden();
  await page.goto(info.config.metadata.markupress + 'components/ui-stack/');
  await page.getByRole('tab', { name: 'API', exact: true }).click();
  for (const attribute of catalog.components.find(component => component.tag === 'ui-stack').attributes) {
    await expect(page.getByRole('cell', { name: attribute.name, exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Shared tokens', exact: true })).toBeVisible();
});

test('customizer reuses real cards, updates every isolated preview and exports the formula-based theme', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(info.config.metadata.markupress + 'customize/');
  await expect(page.locator('[data-example-card]')).toHaveCount(6);
  await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('night');
  for (const iframe of await page.locator('[data-example-card] iframe').all()) {
    const frame = iframe.contentFrame();
    await expect.poll(() => frame.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toBe('#11141c');
    expect(await frame.locator('html').evaluate(() => { try { void parent.document; return false; } catch { return true; } })).toBe(true);
  }
  const extra = catalog.components.find(component => component.tag === 'ui-button').examples[1];
  await page.locator('[data-add-example]').selectOption(extra.id);
  await page.getByRole('button', { name: 'Add example card', exact: true }).click();
  await expect(page.locator('[data-example-card]')).toHaveCount(7);
  const added = page.locator(`[data-example-card="${extra.id}"]`);
  await expect.poll(() => added.locator('iframe').contentFrame().locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toBe('#11141c');
  await added.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.locator('[data-example-card]')).toHaveCount(6);
  const cssReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSS', exact: true }).click();
  const css = await readFile(await (await cssReady).path(), 'utf8');
  expect(css).toContain('--ui-surface: #11141c;');
  expect(css).toContain('pow(2, var(--_ui-theme-curve))');
  const recipeReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download recipe', exact: true }).click();
  const recipe = await readFile(await (await recipeReady).path(), 'utf8');
  expect(validateRecipe(JSON.parse(recipe)).values.canvas).toBe('#11141c');
  await expect(page.getByRole('button', { name: 'Save to repository', exact: true })).toBeHidden();
  expect((await page.request.get(info.config.metadata.markupress + '_looma/session')).status()).toBe(404);
  expect(errors).toEqual([]);
});

test('complete reference and actual examples render before JavaScript', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(info.config.metadata.markupress + 'components/ui-stack/');
    await expect(page.getByRole('heading', { name: 'Attributes', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Framework props', exact: true })).toBeVisible();
    await expect(page.locator('[data-example-card] iframe').first().contentFrame().locator('[data-component="ui-stack"]')).toBeVisible();
  } finally { await context.close(); }
});

test('customizer stays within a narrow screen and the published editor playground mounts', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(info.config.metadata.markupress + 'customize/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto(info.config.metadata.markupress + 'editor/');
  await expect(page.getByRole('textbox', { name: 'Editor guide playground', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Toolbar', exact: true }).selectOption('bubble');
  await expect(page.getByRole('textbox', { name: 'Editor guide playground', exact: true })).toContainText('The Fellowship office');
});


test('one shared size lever derives matching field and action geometry', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await page.getByText('Size & spacing', { exact: true }).click();
  await page.locator('input[data-token="control-size"]').fill('48px');
  const button = page.locator('[data-component-card="ui-button"] iframe').contentFrame().locator('[data-component="ui-button"]').first();
  const field = page.locator('[data-component-card="ui-input"] iframe').contentFrame().locator('[data-component="ui-input"]').first();
  await expect.poll(() => button.evaluate(element => element.getBoundingClientRect().height)).toBe(48);
  await expect.poll(() => field.evaluate(element => element.getBoundingClientRect().height)).toBe(48);
});


test('reference fragments open the containing API tab', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-stack/#shared-tokens');
  await expect(page.getByRole('heading', { name: 'Shared tokens', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'API', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.goto(info.config.metadata.markupress + 'components/ui-menu/');
  await page.getByRole('tab', { name: 'Examples', exact: true }).click();
  await page.locator('a[href$="#ui-menu-item-api"]:visible').first().click();
  await expect(page.getByRole('heading', { name: 'Menu Item API', exact: true })).toBeVisible();
});
