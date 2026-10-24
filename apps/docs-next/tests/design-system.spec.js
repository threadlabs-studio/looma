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
  const extra = catalog.components.find(component => component.tag === 'ui-button').examples[0];
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
  const buttonFrame = page.locator('[data-component-card="ui-button"] iframe').first();
  const appearance = element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['color', 'backgroundColor', 'borderRadius', 'height', 'padding', 'boxShadow', 'transitionDuration'].map(property => [property, style[property]]));
  };
  const previewAppearance = await buttonFrame.contentFrame().locator('[data-preview] button').first().evaluate(appearance);
  const consumerContext = await page.context().browser().newContext();
  const consumer = await consumerContext.newPage();
  try {
    await consumer.goto(new URL(await buttonFrame.getAttribute('src'), page.url()).href);
    expect(await consumer.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).not.toBe('#11141c');
    await consumer.addStyleTag({ content: css });
    await expect.poll(() => consumer.locator('[data-preview] button').first().evaluate(appearance)).toEqual(previewAppearance);
    expect(await consumer.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toBe('#11141c');
  } finally { await consumerContext.close(); }
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

test('Bookish themes the whole documentation, survives navigation and reload, and resets explicitly', async ({ page }, info) => {
  const base = info.config.metadata.markupress;
  await page.goto(base + 'customize/');
  await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('bookish');
  const action = () => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-accent').trim());
  await expect.poll(action).toBe('#2e1228');
  const buttonCard = page.locator('[data-component-card="ui-button"]');
  const solid = buttonCard.locator('iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true });
  await expect.poll(() => solid.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, height: element.getBoundingClientRect().height }))).toEqual({ background: 'rgb(46, 18, 40)', height: 42 });
  await page.getByRole('searchbox', { name: 'Find components and examples', exact: true }).fill('button');
  await expect(buttonCard).toBeVisible();
  await expect(page.locator('[data-component-card="ui-input"]')).toBeHidden();
  await buttonCard.getByRole('link', { name: 'View component', exact: true }).click();
  await expect(page).toHaveURL(base + 'components/ui-button/');
  await expect(page.getByRole('heading', { name: 'Button', exact: true, level: 1 })).toBeVisible();
  await expect.poll(action).toBe('#2e1228');
  await page.reload();
  await expect.poll(action).toBe('#2e1228');
  await page.goto(base + 'components/');
  await expect.poll(action).toBe('#2e1228');
  await page.goto(base + 'customize/');
  await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('bookish');
  await page.getByRole('button', { name: 'Reset changes', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('clear');
  await expect.poll(action).toBe('#5b55d6');
});
