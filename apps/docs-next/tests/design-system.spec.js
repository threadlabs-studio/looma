import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { readCatalog, validateRecipe, startingPoints } from '@threadlabs/looma/docs';

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
  const firstReference = page.locator('[data-example-card]').first();
  await expect(firstReference.locator('.looma-example-heading')).toHaveCount(1);
  await expect(firstReference.locator('pre').first()).toBeVisible();
  expect(await firstReference.locator('pre code span[style*="color"]').count()).toBeGreaterThan(0);
  expect(await firstReference.evaluate(element => getComputedStyle(element.closest('[role="tabpanel"]')).padding)).toBe('0px');
  const previewFonts = await firstReference.locator('iframe').contentFrame().locator('body').evaluate(async () => {
    const fonts = await document.fonts.load('500 17px Manrope', 'Button');
    return fonts.map(font => ({ family: font.family, status: font.status }));
  });
  expect(previewFonts).toContainEqual({ family: 'Manrope', status: 'loaded' });
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
  await expect(page.locator('[data-example-card]')).toHaveCount(9);
  await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('night');
  for (const iframe of await page.locator('[data-example-card] iframe').all()) {
    const frame = iframe.contentFrame();
    await expect.poll(() => frame.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toMatch(/^light-dark\([^,]+, #11141c\)$/);
    expect(await frame.locator('html').evaluate(() => { try { void parent.document; return false; } catch { return true; } })).toBe(true);
  }
  const extra = catalog.components.find(component => component.tag === 'ui-button').examples[0];
  await page.locator('[data-add-example]').selectOption(extra.id);
  await page.getByRole('button', { name: 'Add example card', exact: true }).click();
  await expect(page.locator('[data-example-card]')).toHaveCount(10);
  const added = page.locator(`[data-example-card="${extra.id}"]`);
  await expect.poll(() => added.locator('iframe').contentFrame().locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toMatch(/^light-dark\([^,]+, #11141c\)$/);
  await added.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.locator('[data-example-card]')).toHaveCount(9);
  const cssReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSS', exact: true }).click();
  const css = await readFile(await (await cssReady).path(), 'utf8');
  expect(css).toMatch(/--ui-surface: light-dark\([^,]+, #11141c\);/);
  expect(css).toContain('pow(1 / 7, var(--_ui-theme-curve))');
  const buttonFrame = page.locator('[data-component-card="ui-button"] iframe').first();
  const appearance = element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['color', 'backgroundColor', 'borderRadius', 'height', 'padding', 'boxShadow', 'transitionDuration'].map(property => [property, style[property]]));
  };
  const previewAppearance = await buttonFrame.contentFrame().locator('[data-preview] button').first().evaluate(appearance);
  const consumerContext = await page.context().browser().newContext({ reducedMotion: 'reduce', colorScheme: 'light' });
  const consumer = await consumerContext.newPage();
  try {
    await consumer.goto(new URL(await buttonFrame.getAttribute('src'), page.url()).href);
    expect(await consumer.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).not.toMatch(/^light-dark\([^,]+, #11141c\)$/);
    await consumer.addStyleTag({ content: css });
    await expect.poll(() => consumer.locator('[data-preview] button').first().evaluate(appearance)).toEqual(previewAppearance);
    expect(await consumer.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toMatch(/^light-dark\([^,]+, #11141c\)$/);
    const consumerButton = consumer.locator('[data-preview] button').first();
    await consumer.locator('html').evaluate(element => { element.dataset.theme = 'dark'; });
    await expect.poll(() => consumerButton.evaluate(appearance)).not.toEqual(previewAppearance);
    await consumerButton.evaluate(element => {
      const boundary = document.createElement('section'); boundary.dataset.theme = 'light';
      element.parentElement.insertBefore(boundary, element); boundary.append(element);
    });
    await expect.poll(() => consumerButton.evaluate(appearance)).toEqual(previewAppearance);
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
  expect(await page.locator('[data-component~="markupress-header"]').evaluate(element => element.getBoundingClientRect().height)).toBeLessThanOrEqual(68);
  await page.goto(info.config.metadata.markupress + 'components/ui-description-list/');
  await expect(page.locator('.component-description').getByText('<div><dt/><dd/></div>', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto(info.config.metadata.markupress + 'editor/');
  await expect(page.getByRole('textbox', { name: 'Editor guide playground', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Toolbar', exact: true }).selectOption('bubble');
  await expect(page.getByRole('textbox', { name: 'Editor guide playground', exact: true })).toContainText('The Fellowship office');
});


test('one shared size lever derives matching field and action geometry', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(info.config.metadata.markupress + 'customize/');
  const defaultButton = page.locator('[data-component-card="ui-button"] iframe').contentFrame().locator('[data-component="ui-button"]').first();
  await expect.poll(() => defaultButton.evaluate(element => ({ padding: getComputedStyle(element).paddingRight, motion: getComputedStyle(element).transitionDuration }))).toEqual({ padding: '12px', motion: '0.12s, 0.12s, 0.12s, 0.12s, 0.18s' });
  await page.getByText('Size & spacing', { exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Control size', exact: true }).fill('48px');
  await page.getByRole('spinbutton', { name: 'Control size', exact: true }).press('Enter');
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
  const action = () => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-accent').trim());
  const baselineAction = await action();
  await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('bookish');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  const buttonCard = page.locator('[data-component-card="ui-button"]');
  const solid = buttonCard.locator('iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true });
  await expect.poll(() => solid.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, height: element.getBoundingClientRect().height }))).toEqual({ background: 'rgb(46, 18, 40)', height: 42 });
  await page.getByRole('searchbox', { name: 'Find components and examples', exact: true }).fill('button');
  await expect(buttonCard).toBeVisible();
  await expect(page.locator('[data-component-card="ui-input"]')).toBeHidden();
  await buttonCard.getByRole('link', { name: 'View component', exact: true }).click();
  await expect(page).toHaveURL(base + 'components/ui-button/');
  await expect(page.getByRole('heading', { name: 'Button', exact: true, level: 1 })).toBeVisible();
  await expect.poll(() => page.getByRole('heading', { name: 'Button', exact: true, level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).toContain('Georgia');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await page.reload();
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await page.goto(base + 'components/');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await page.goto(base + 'customize/');
  await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('bookish');
  await page.getByRole('button', { name: 'Reset changes', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('custom');
  await expect.poll(action).toBe(baselineAction);
});

test('opposite mode boundaries reach the isolated preview without changing siblings or the page', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  const cards = page.locator('[data-example-card]');
  const first = cards.first(); const second = cards.nth(1);
  await expect.poll(() => first.locator('iframe').contentFrame().locator('html').getAttribute('data-theme')).toBe('light');
  const previewSurface = () => first.locator('iframe').contentFrame().locator('body').evaluate(element => getComputedStyle(element).backgroundColor);
  const lightSurface = await previewSurface();
  await first.evaluate(element => { element.dataset.theme = 'dark'; });
  await expect.poll(() => first.locator('iframe').contentFrame().locator('html').getAttribute('data-theme')).toBe('dark');
  await expect.poll(previewSurface).not.toBe(lightSurface);
  await expect(second.locator('iframe').contentFrame().locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await first.evaluate(element => { element.dataset.theme = 'light'; });
  await expect.poll(() => first.locator('iframe').contentFrame().locator('html').getAttribute('data-theme')).toBe('light');
  await expect.poll(previewSurface).toBe(lightSurface);
});


test('browser storage failures keep editing usable and explain that changes cannot be remembered', async ({ page }, info) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } }));
  await page.goto(info.config.metadata.markupress + 'customize/');
  await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('bookish');
  await expect(page.locator('[data-message]')).toContainText('Browser storage is unavailable');
  await expect.poll(() => page.locator('[data-component-card="ui-button"] iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true }).evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(46, 18, 40)');
});

test('other tabs keep the customizer controls and active theme synchronized', async ({ page, context }, info) => {
  const url = info.config.metadata.markupress + 'customize/';
  await page.goto(url);
  const other = await context.newPage();
  try {
    await other.goto(url);
    await other.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('wiki');
    await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('wiki');
    await page.getByRole('button', { name: 'Reset changes', exact: true }).click();
    await expect(other.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('custom');
  } finally { await other.close(); }
});


test('shared number, slider and curve controls calculate, convert, constrain and support keyboard editing', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await page.getByText('Size & spacing', { exact: true }).click();
  const size = page.getByRole('spinbutton', { name: 'Control size', exact: true });
  await size.fill('42px / 1.2'); await size.press('Enter');
  await expect(size).toHaveValue('35px');
  const action = page.locator('[data-component-card="ui-button"] iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true });
  await expect.poll(() => action.evaluate(element => element.getBoundingClientRect().height)).toBe(35);
  await page.getByRole('combobox', { name: 'Control size unit', exact: true }).selectOption('rem');
  await expect(size).toHaveValue('2.1875rem');
  await expect.poll(() => action.evaluate(element => element.getBoundingClientRect().height)).toBe(35);
  const density = page.getByRole('slider', { name: 'Density', exact: true });
  await density.press('End'); await expect(density).toHaveValue('150');
  await expect.poll(() => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-density').trim())).toBe('1.5');
  await page.getByText('Motion', { exact: true }).click();
  const time = page.getByRole('spinbutton', { name: 'Response time', exact: true });
  await time.fill('150ms * 2'); await time.press('Enter'); await expect(time).toHaveValue('300ms');
  const curve = page.getByRole('textbox', { name: 'Response curve', exact: true });
  const before = await curve.inputValue();
  const first = page.getByRole('button', { name: /^First curve handle/ });
  await first.press('ArrowRight'); await expect(curve).not.toHaveValue(before);
  const previous = await curve.inputValue();
  await page.getByRole('group', { name: 'Response curve', exact: true }).scrollIntoViewIfNeeded();
  const handle = await first.boundingBox(), plot = await page.getByRole('group', { name: 'Response curve', exact: true }).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down();
  await page.mouse.move(plot.x + plot.width * .8, plot.y + plot.height * .2, { steps: 5 }); await page.mouse.up();
  await expect(curve).not.toHaveValue(previous);
  const x = Number(await page.getByRole('spinbutton', { name: 'First handle X', exact: true }).inputValue());
  expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(1);
});


test('coordinated palettes preserve geometry and document both resolved modes', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption('wiki');
  const geometry = () => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-control-size').trim());
  const before = await geometry();
  await page.getByRole('combobox', { name: 'Coordinated palette', exact: true }).selectOption('bookish');
  await expect.poll(geometry).toBe(before);
  await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('custom');
  await expect(page.getByRole('img', { name: 'light canvas, content and action range', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'dark canvas, content and action range', exact: true })).toBeVisible();
  await expect(page.locator('[data-palette-adjustments]')).toContainText('readability');
  await page.getByText('Resolved palette values', { exact: true }).click();
  await expect(page.locator('[data-palette-adjustment-details]')).toContainText('dark');
  const text = page.locator('[data-component-card="ui-text"] iframe').contentFrame();
  await expect(text.getByRole('heading', { name: 'There and back by Friday', level: 1 })).toBeVisible();
  const displaySize = await text.getByRole('heading', { level: 1 }).evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  const headingSize = await text.getByRole('heading', { level: 2 }).evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  expect(displaySize).toBeGreaterThan(headingSize);
  await expect.poll(() => text.getByRole('heading', { level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).not.toContain('Georgia');
});

const readableRecipes = [...Object.entries(startingPoints), ['imported white seeds', {
  ...startingPoints.clear, values: { ...startingPoints.clear.values, action: '#ffffff', canvas: '#ffffff', surface: '#ffffff', text: '#ffffff' },
}]];
for (const [preset, recipe] of readableRecipes) {
  test(`solid action tones and icon actions stay readable in both modes and states: ${preset}`, async ({ page }, info) => {
    await page.goto(info.config.metadata.markupress + 'customize/');
    if (Object.hasOwn(startingPoints, preset)) await page.getByRole('combobox', { name: 'Starting point', exact: true }).selectOption(preset);
    else {
      await page.locator('[data-recipe-file]').setInputFiles({ name: 'theme.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(recipe)) });
      await expect(page.locator('[data-message]')).toContainText('Recipe applied');
    }
    await page.goto(info.config.metadata.markupress + 'components/ui-button/');
    const card = page.locator('[data-example-card$="/12-tones"]');
    await card.scrollIntoViewIfNeeded();
    const frame = card.locator('iframe').contentFrame();
    const buttons = frame.locator('button[data-appearance="solid"]');
    await expect(buttons).toHaveCount(12);
    const contrast = element => {
      const style = getComputedStyle(element), canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const luminance = color => {
        context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => channel / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      };
      const background = luminance(style.backgroundColor);
      const colors = [style.color, ...new Set([...element.querySelectorAll('code span[style*="color"]')].map(token => getComputedStyle(token).color))];
      return Math.min(...colors.map(color => {
        const foreground = luminance(color);
        return (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
      }));
    };
    for (const mode of ['light', 'dark']) {
      await card.evaluate((element, mode) => { element.dataset.theme = mode; }, mode);
      await expect.poll(() => frame.locator('html').getAttribute('data-theme')).toBe(mode);
      for (const button of await buttons.all()) {
        expect(await button.evaluate(contrast)).toBeGreaterThanOrEqual(4.5);
        await button.hover(); expect(await button.evaluate(contrast)).toBeGreaterThanOrEqual(4.5);
        await page.mouse.down();
        try { expect(await button.evaluate(contrast)).toBeGreaterThanOrEqual(4.5); }
        finally { await page.mouse.up(); }
      }
    }
    expect(await card.locator('pre').first().evaluate(contrast)).toBeGreaterThanOrEqual(4.5);
  });
}
