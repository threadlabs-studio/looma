import { chooseOption, openEditor, chooseStartingPoint, setBaseColor, chooseRefinement, followDocumentationLink } from './choose-option.js';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { readCatalog, validateRecipe, startingPoints } from '@threadlabs/looma/docs';

const catalog = await readCatalog();

async function chooseAppearance(page, choice) {
  const button = page.getByRole('button', { name: /^Appearance:/ });
  const desired = `Appearance: ${choice.charAt(0).toUpperCase()}${choice.slice(1)}`;
  for (let step = 0; step < 3; step++) {
    const before = await button.getAttribute('aria-label');
    if (before === desired) return;
    await button.click();
    await expect(button).not.toHaveAttribute('aria-label', before);
  }
  await expect(button).toHaveAttribute('aria-label', desired);
}

test('directory cards and full reference come from the published component catalog', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/');
  await expect(page.locator('[data-component-card]')).toHaveCount(catalog.components.filter(component => !component.navigationParent).length);
  const layoutGrid = page.locator('[data-catalog-group="layout"] [data-component~="ui-grid"]');
  await expect(layoutGrid.locator('[data-component-card]')).toHaveCount(catalog.components.filter(component => component.group === 'layout' && !component.navigationParent).length);
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

test('documentation navigation uses Looma disclosures and keeps editor references in their own section', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-card/');
  const navigation = page.getByRole('navigation', { name: 'Documentation', exact: true });
  const forms = navigation.getByRole('button', { name: 'Forms', exact: true });
  await expect(forms).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation.locator('summary')).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Editor Toolbar', exact: true })).toHaveCount(0);
  const alignment = await forms.evaluate(element => {
    const row = element.getBoundingClientRect(), icon = element.querySelector('svg').getBoundingClientRect();
    return Math.abs(row.top + row.height / 2 - icon.top - icon.height / 2);
  });
  expect(alignment).toBeLessThanOrEqual(2);
  await forms.click(); await expect(forms).toHaveAttribute('aria-expanded', 'false');
  await forms.press('Enter'); await expect(forms).toHaveAttribute('aria-expanded', 'true');
  if (process.env.LOOMA_MATERIAL_SCREENSHOTS) {
    const read = element => { const style = getComputedStyle(element), box = element.getBoundingClientRect(); return { height: box.height, font: style.font, color: style.color, background: style.backgroundColor, outline: style.outline, borderRadius: style.borderRadius }; };
    const states = { rest: await forms.evaluate(read) };
    await forms.hover(); states.hover = await forms.evaluate(read);
    await page.mouse.down(); try { states.pressed = await forms.evaluate(read); } finally { await page.mouse.up(); }
    await page.mouse.move(0, 0);
    await writeFile(join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'navigation-states.json'), JSON.stringify(states, null, 2) + '\n');
    await page.screenshot({ path: join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'navigation-light.png') });
  }
  await followDocumentationLink(page, page.locator('[data-component~="markupress-header"]').getByRole('link', { name: 'Editor', exact: true }), 'Editor');
  await expect(page).toHaveURL(/\/editor\/$/);
  await expect(page.getByRole('navigation', { name: 'Documentation', exact: true })).toHaveCount(0);
  const toolbar = page.getByRole('link', { name: 'Editor Toolbar', exact: true });
  await expect(toolbar).toHaveAttribute('href', /\/editor\/ui-editor-toolbar\/$/);
  await followDocumentationLink(page, toolbar, 'Editor Toolbar'); await expect(page.getByRole('heading', { level: 1, name: 'Editor Toolbar', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.getByRole('button', { name: 'Navigation', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Documentation', exact: true })).toBeVisible();
  await page.mouse.move(374, 899);
  const sections = page.getByRole('navigation', { name: 'Sections', exact: true });
  const editor = sections.getByRole('link', { name: 'Editor', exact: true });
  const components = sections.getByRole('link', { name: 'Components', exact: true });
  await expect(editor).toHaveAttribute('aria-current', 'true');
  await expect(components).toHaveAttribute('aria-current', 'false');
  expect(await components.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(await editor.evaluate(element => getComputedStyle(element).backgroundColor));
  if (process.env.LOOMA_MATERIAL_SCREENSHOTS) await page.screenshot({ path: join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'navigation-editor-mobile.png') });
});

test('component browser searches the complete catalog in bounded groups', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await expect(page.getByRole('navigation', {name:'Documentation',exact:true})).toHaveCount(0);
  await openEditor(page, 'components');
  const previews = page.locator('[data-refinement-view="components"] .examples [data-example-card]');
  await expect(previews).toHaveCount(9);
  await page.getByRole('button', { name:'Show more components',exact:true }).click();
  await expect(previews).toHaveCount(18);
  const search=page.getByRole('searchbox',{name:'Search components',exact:true});
  await search.fill('ui-slider');await expect(previews).toHaveCount(1);
  await expect(previews).toHaveAttribute('data-component-card','ui-slider');
  await expect(previews.getByRole('link',{name:'View component',exact:true})).toHaveAttribute('href',/components\/ui-slider\/$/);
  await search.fill('no-component-has-this-name');await expect(previews).toHaveCount(0);
  await expect(page.locator('[data-example-count]')).toContainText('No components match');
  await search.clear();await expect(previews).toHaveCount(9);
});

test('reel examples have meaningful overflow and snap at item centers', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-reel/');
  const examples = page.locator('[data-example-card]');
  const free = examples.nth(0).locator('iframe').contentFrame().locator('[data-component="ui-reel"]');
  const snap = examples.nth(1).locator('iframe').contentFrame().locator('[data-component="ui-reel"]');
  await free.waitFor(); await snap.waitFor();
  for (const reel of [free, snap]) {
    expect(await reel.evaluate(element => element.scrollWidth - element.clientWidth)).toBeGreaterThan(350);
  }
  expect(await free.evaluate(element => getComputedStyle(element).scrollSnapType)).toBe('none');
  expect(await snap.evaluate(element => getComputedStyle(element).scrollSnapType)).toContain('mandatory');
  await snap.evaluate(element => { element.scrollLeft = element.clientWidth / 2; });
  await expect.poll(() => snap.evaluate(element => {
    const box = element.getBoundingClientRect();
    return Math.min(...[...element.children].map(child => { const item = child.getBoundingClientRect(); return Math.abs(item.left + item.width / 2 - box.left - box.width / 2); }));
  })).toBeLessThan(2);
});

test('customizer reuses real cards, updates every isolated preview and exports the formula-based theme', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(info.config.metadata.markupress + 'customize/');
  await expect(page.locator('[data-refinement-view="components"] .examples [data-example-card]')).toHaveCount(9);
  await chooseStartingPoint(page, 'night');
  await openEditor(page, 'components');
  for (const iframe of await page.locator('[data-refinement-view="components"] .examples [data-example-card] iframe').all()) {
    const frame = iframe.contentFrame();
    await expect.poll(() => frame.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toMatch(/^light-dark\([^,]+, #11141c\)$/);
    expect(await frame.locator('html').evaluate(() => { try { void parent.document; return false; } catch { return true; } })).toBe(true);
  }
  const extra = catalog.components.find(component => component.tag === 'ui-button').examples[0];
  await page.getByRole('button', { name: 'Add an example', exact: true }).click();
  await page.getByRole('combobox', { name: 'Choose a component example', exact: true }).fill(`Button · ${extra.title}`);
  await page.getByRole('option', { name: `Button · ${extra.title}`, exact: true }).click();
  await page.getByRole('button', { name: 'Add to preview', exact: true }).click();
  await expect(page.locator('[data-refinement-view="components"] .examples [data-example-card]')).toHaveCount(10);
  const added = page.locator(`[data-example-card="${extra.id}"]`);
  await expect.poll(() => added.locator('iframe').contentFrame().locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-surface').trim())).toMatch(/^light-dark\([^,]+, #11141c\)$/);
  await added.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.locator('[data-refinement-view="components"] .examples [data-example-card]')).toHaveCount(9);
  await openEditor(page, 'export');
  const cssReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSS', exact: true }).click();
  const css = await readFile(await (await cssReady).path(), 'utf8');
  expect(css).toMatch(/--ui-surface: light-dark\([^,]+, #11141c\);/);
  expect(css).toContain('pow(1 / 7, var(--_ui-theme-curve))');
  const buttonFrame = page.locator('[data-refinement-view="components"] [data-component-card="ui-button"] iframe').first();
  const appearance = element => {
    const style = getComputedStyle(element);
    return Object.fromEntries(['color', 'backgroundColor', 'borderRadius', 'height', 'padding', 'boxShadow', 'transitionDuration'].map(property => [property, style[property]]));
  };
  await openEditor(page, 'components');
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
    const lightCanvas = await consumer.locator('body').evaluate(element => getComputedStyle(element).backgroundColor);
    await consumer.locator('html').evaluate(element => { element.dataset.theme = 'dark'; });
    await expect.poll(() => consumer.locator('body').evaluate(element => getComputedStyle(element).backgroundColor)).not.toEqual(lightCanvas);
    await consumerButton.evaluate(element => {
      const boundary = document.createElement('section'); boundary.dataset.theme = 'light';
      element.parentElement.insertBefore(boundary, element); boundary.append(element);
    });
    await expect.poll(() => consumerButton.evaluate(appearance)).toEqual(previewAppearance);
  } finally { await consumerContext.close(); }
  await openEditor(page, 'export');
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
  await chooseOption(page.getByRole('combobox', { name: 'Toolbar', exact: true }), 'bubble');
  await expect(page.getByRole('textbox', { name: 'Editor guide playground', exact: true })).toContainText('The Fellowship office');
});


test('one shared size lever derives matching field and action geometry', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(info.config.metadata.markupress + 'customize/');
  await openEditor(page, 'components');
  const defaultButton = page.locator('[data-refinement-view="components"] [data-component-card="ui-button"] iframe').contentFrame().locator('[data-component="ui-button"]').first();
  await expect.poll(() => defaultButton.evaluate(element => ({ padding: getComputedStyle(element).paddingRight, motion: getComputedStyle(element).transitionDuration }))).toEqual({ padding: '12.75px', motion: '0.12s, 0.12s, 0.12s, 0.12s, 0.18s' });
  await openEditor(page, 'layout');
  await page.getByRole('spinbutton', { name: 'Control roominess', exact: true }).fill('3');
  await page.getByRole('spinbutton', { name: 'Control roominess', exact: true }).press('Enter');
  await openEditor(page, 'components');
  const button = page.locator('[data-refinement-view="components"] [data-component-card="ui-button"] iframe').contentFrame().locator('[data-component="ui-button"]').first();
  const field = page.locator('[data-refinement-view="components"] [data-component-card="ui-input"] iframe').contentFrame().locator('[data-component="ui-input"]').first();
  await expect.poll(() => button.evaluate(element => element.getBoundingClientRect().height)).toBe(51);
  await expect.poll(() => field.evaluate(element => element.getBoundingClientRect().height)).toBe(51);
  for (const component of ['ui-select', 'ui-input-group', 'ui-combobox']) {
    await page.getByRole('searchbox', {name:'Search components',exact:true}).fill(component);
    const frame = page.locator(`[data-refinement-view="components"] [data-component-card="${component}"] iframe`).contentFrame();
    const control = frame.locator(`[data-component="${component}"]${component === 'ui-combobox' ? ' .field' : ''}`).first();
    await expect.poll(() => control.evaluate(element => element.getBoundingClientRect().height)).toBe(51);
  }
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
  await chooseStartingPoint(page, 'bookish');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await openEditor(page, 'components');
  const buttonCard = page.locator('[data-refinement-view="components"] [data-component-card="ui-button"]');
  const solid = buttonCard.locator('iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true });
  await expect.poll(() => solid.evaluate(element => ({ background: getComputedStyle(element).backgroundColor, height: element.getBoundingClientRect().height }))).toEqual({ background: 'rgb(46, 18, 40)', height: 42 });
  await page.getByRole('searchbox', { name: 'Search components', exact: true }).fill('ui-button');
  await expect(buttonCard).toBeVisible();
  await expect(page.locator('[data-refinement-view="components"] [data-component-card="ui-input"]')).toHaveCount(0);
  await followDocumentationLink(page, buttonCard.getByRole('link', { name: 'View component', exact: true }), 'Button');
  await expect(page).toHaveURL(/\/components\/ui-button\/$/);
  await expect(page.getByRole('heading', { name: 'Button', exact: true, level: 1 })).toBeVisible();
  await expect.poll(() => page.getByRole('heading', { name: 'Button', exact: true, level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).toContain('Georgia');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await page.reload();
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await page.goto(base + 'components/');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
  await page.goto(base + 'customize/');
  await expect(page.locator('[data-preset] input[role=combobox]')).toHaveValue('Bookish');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-preset] input[role=combobox]')).toHaveValue('Bookish');
  await expect.poll(action).toMatch(/^light-dark\(#2e1228, /);
});

test('opposite mode boundaries reach the isolated preview without changing siblings or the page', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await openEditor(page, 'components');
  const cards = page.locator('[data-refinement-view="components"] .examples [data-example-card]');
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
  await chooseStartingPoint(page, 'bookish');
  await expect(page.locator('[data-message]')).toContainText('Browser storage is unavailable');
  await openEditor(page, 'components');
  await expect.poll(() => page.locator('[data-refinement-view="components"] [data-component-card="ui-button"] iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true }).evaluate(element => getComputedStyle(element).backgroundColor)).toBe('rgb(46, 18, 40)');
});

test('other tabs keep the customizer controls and active theme synchronized', async ({ page, context }, info) => {
  const url = info.config.metadata.markupress + 'customize/';
  await page.goto(url);
  const other = await context.newPage();
  try {
    await other.goto(url);
    await chooseStartingPoint(other, 'wiki');
    await expect(page.locator('[data-preset] input[role=combobox]')).toHaveValue('Wiki');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(other.locator('[data-preset] input[role=combobox]')).toHaveValue('Wiki');
  } finally { await other.close(); }
});


test('shared number, slider and curve controls calculate, convert, constrain and support keyboard editing', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await openEditor(page, 'layout');
  const size = page.getByRole('spinbutton', { name: 'Control roominess', exact: true });
  await size.fill('3 / 1.2'); await size.press('Enter');
  await expect(size).toHaveValue('2.5');
  await openEditor(page, 'components');
  const action = page.locator('[data-refinement-view="components"] [data-component-card="ui-button"] iframe').contentFrame().getByRole('button', { name: 'Solid', exact: true });
  await expect.poll(() => action.evaluate(element => element.getBoundingClientRect().height)).toBe(42.5);
  await openEditor(page, 'typography');
  const textSize = page.getByRole('spinbutton', { name: 'Base text size', exact: true });
  await textSize.fill('18px'); await textSize.press('Enter');
  await expect(textSize).toHaveValue('18px');
  await expect.poll(() => page.locator('html').evaluate(e => getComputedStyle(e).fontSize)).toBe('18px');
  await openEditor(page, 'components');
  await expect.poll(() => action.evaluate(element => element.getBoundingClientRect().height)).toBe(45);
  await openEditor(page, 'layout');
  const corners = page.getByRole('spinbutton', { name: 'Corner roundness', exact: true });
  await corners.fill('9px'); await corners.press('Enter');
  await chooseOption(page.getByRole('combobox', { name: 'Corner roundness unit', exact: true }), 'rem');
  await expect(corners).toHaveValue('0.5rem');
  await expect.poll(() => page.locator('html').evaluate(e => getComputedStyle(e).getPropertyValue('--ui-radius-md').trim())).toBe('9px');
  await openEditor(page, 'typography');
  await textSize.fill('20px'); await textSize.press('Enter');
  await expect.poll(() => page.locator('html').evaluate(e => getComputedStyle(e).fontSize)).toBe('20px');
  await expect.poll(() => page.locator('html').evaluate(e => getComputedStyle(e).getPropertyValue('--ui-radius-md').trim())).toBe('10px');
  await openEditor(page, 'layout');
  await expect(page.locator('[data-size-sample="md"] [data-size-readout]')).toContainText('2.5rem (50px)');

  const density = page.getByRole('slider', { name: 'Spacing', exact: true });
  await density.press('End'); await expect(density).toHaveValue('150');
  await expect.poll(() => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-spacing').trim())).toBe('1.5');
  await openEditor(page, 'motion');
  const time = page.getByRole('spinbutton', { name: 'Response time', exact: true });
  await time.fill('150ms * 2'); await time.press('Enter'); await expect(time).toHaveValue('300ms');
  await page.getByRole('button', {name:'Shape the curve',exact:true}).click();
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
  await chooseStartingPoint(page, 'wiki');
  const geometry = () => page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-control-size').trim());
  const before = await geometry();
  await chooseRefinement(page, 'palette', 'bookish');
  await expect.poll(geometry).toBe(before);
  await expect(page.locator('[data-preset] input[role=combobox]')).toHaveValue('Your theme');
  await openEditor(page, 'palette');
  await expect(page.getByRole('img', { name: 'light canvas, content and action range', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'dark canvas, content and action range', exact: true })).toBeVisible();
  await expect(page.locator('[data-palette-adjustments]')).toContainText('readability');
  await page.getByText('Resolved palette values', { exact: true }).click();
  await expect(page.locator('[data-palette-adjustment-details]')).toContainText('dark');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await openEditor(page, 'components');
  const text = page.locator('[data-refinement-view="components"] [data-component-card="ui-text"] iframe').contentFrame();
  await expect(text.getByRole('heading', { name: 'There and back by Friday', level: 1 })).toBeVisible();
  const displaySize = await text.getByRole('heading', { level: 1 }).evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  const headingSize = await text.getByRole('heading', { level: 2 }).evaluate(element => parseFloat(getComputedStyle(element).fontSize));
  expect(displaySize).toBeGreaterThan(headingSize);
  await expect.poll(() => text.getByRole('heading', { level: 1 }).evaluate(element => getComputedStyle(element).fontFamily)).not.toContain('Georgia');
});

test('material refinement shares a movable light, remembers customized presets and restores only that family', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'bookish');
  const size = await page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-control-size'));
  const enter = async () => {
    const material = await openEditor(page, 'material');
    await material.getByRole('button', { name: 'Advanced material', exact: true }).click();
  };
  await enter();
  const material = page.locator('[data-refinement-view="material"]');
  await expect(material).toBeVisible(); await expect(page.locator('[data-customizer-overview]')).toBeHidden();
  await chooseOption(material.getByRole('combobox', { name: 'Material preset', exact: true }), 'polished');
  const sample = material.locator('[data-light-editor]').getByRole('button', { name: 'Material response', exact: true });
  const before = await sample.evaluate(element => getComputedStyle(element).backgroundImage);
  const shadowBefore = await sample.evaluate(element => getComputedStyle(element).getPropertyValue('--ui-shadow-sm'));
  const handle = material.getByRole('button', { name: /^Theme light position. Arrow keys/ });
  await handle.focus(); await handle.press('Shift+ArrowRight');
  await expect.poll(() => sample.evaluate(element => getComputedStyle(element).backgroundImage)).not.toBe(before);
  await expect.poll(() => sample.evaluate(element => getComputedStyle(element).getPropertyValue('--ui-shadow-sm'))).not.toBe(shadowBefore);
  await expect(material.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Polished · customized');
  await page.reload(); await enter();
  await expect(material.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Polished · customized');
  await expect.poll(() => material.getByRole('spinbutton', { name: 'Light horizontal position', exact: true, includeHidden: true }).evaluate(element => element.checkVisibility({visibilityProperty:true}))).toBe(false);
  await material.getByRole('button', { name: 'Exact position', exact: true }).click();
  await expect(material.getByRole('spinbutton', { name: 'Light horizontal position', exact: true })).toHaveValue('60%');
  if (process.env.LOOMA_MATERIAL_SCREENSHOTS) {
    const captureStyles = async mode => {
      const read = element => {
        const style = getComputedStyle(element), box = element.getBoundingClientRect();
        return { tag: element.tagName, label: element.textContent.trim(), box: { x: box.x, y: box.y, width: box.width, height: box.height },
          styles: Object.fromEntries(['color','backgroundColor','backgroundImage','borderColor','borderWidth','borderRadius','boxShadow','backdropFilter','fontFamily','fontSize','lineHeight','transition','scale'].map(key => [key, style[key]])) };
      };
      const evidence = { mode, surfaces: [] };
      for (const element of await material.locator('[data-light-editor] button, [data-light-editor] input, .refinement-layout > :first-child > *').all()) evidence.surfaces.push(await element.evaluate(read));
      evidence.rest = await sample.evaluate(read);
      await sample.hover(); evidence.hover = await sample.evaluate(read);
      await page.mouse.down();
      try { evidence.pressed = await sample.evaluate(read); }
      finally { await page.mouse.up(); }
      await page.mouse.move(0, 0);
      await writeFile(join(process.env.LOOMA_MATERIAL_SCREENSHOTS, `material-${mode}-styles.json`), JSON.stringify(evidence, null, 2) + '\n');
    };
    await captureStyles('light');
    await page.screenshot({ path: join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'material-light.png'), fullPage: false });
    await chooseAppearance(page, 'dark');
    await captureStyles('dark');
    await page.screenshot({ path: join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'material-dark.png'), fullPage: false });
    await page.setViewportSize({ width: 375, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'material-mobile-dark.png'), fullPage: false });
  }
  await material.getByRole('button', { name: 'Reset material', exact: true }).click();
  await expect(material.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Polished');
  await expect(material.getByRole('spinbutton', { name: 'Light horizontal position', exact: true })).toHaveValue('50%');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-control-size'))).toBe(size);
  await material.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('[data-customizer-overview]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('starting theme refinements remember their material and palette without reselecting either preset', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'bookish');
  await openEditor(page, 'material');
  const material = page.locator('[data-refinement-view="material"]');
  await expect(material.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Frosted glass');
  await material.getByRole('button', { name: 'Advanced material', exact: true }).click();
  await material.getByRole('button', { name: /^Theme light position. Arrow keys/ }).press('Shift+ArrowRight');
  await expect(material.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Frosted glass · customized');
  await material.getByRole('button', { name: 'Overview', exact: true }).click();
  await openEditor(page, 'palette');
  const palette = page.locator('[data-refinement-view="palette"]');
  await setBaseColor(page, 'Action', '#442244');
  await expect(palette.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Plum & paper · customized');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Palette preset', exact: true })).toHaveValue('Plum & paper · customized');
  await openEditor(page, 'material');
  await expect(material.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Frosted glass · customized');
});

test('palette refinement persists its origin and restoring it leaves material refinements intact', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'customize/');
  await chooseStartingPoint(page, 'wiki');
  await chooseRefinement(page, 'palette', 'bookish');
  await openEditor(page, 'palette');
  const palette = page.locator('[data-refinement-view="palette"]');
  await setBaseColor(page, 'Action', '#442244');
  await expect(palette.locator('[data-refinement-preset] input[role="combobox"]')).toHaveValue('Plum & paper · customized');
  if (process.env.LOOMA_MATERIAL_SCREENSHOTS) await page.screenshot({ path: join(process.env.LOOMA_MATERIAL_SCREENSHOTS, 'palette-light.png'), fullPage: false });
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Palette preset', exact: true })).toHaveValue('Plum & paper · customized');
  await openEditor(page, 'palette');
  await palette.getByRole('button', { name: 'Reset palette', exact: true }).click();
  await expect(palette.locator('[data-token="action"]')).toHaveAttribute('data-ui-color-picker-prop-value', '#2e1228');
  expect(await page.locator('html').evaluate(element => getComputedStyle(element).getPropertyValue('--ui-control-size'))).toBe('34px');
});

const readableRecipes = [...Object.entries(startingPoints), ['imported white seeds', {
  ...startingPoints.clear, values: { ...startingPoints.clear.values, action: '#ffffff', canvas: '#ffffff', surface: '#ffffff', text: '#ffffff' },
}]];
for (const [preset, recipe] of readableRecipes) {
  test(`solid action tones and icon actions stay readable in both modes and states: ${preset}`, async ({ page }, info) => {
    await page.goto(info.config.metadata.markupress + 'customize/');
    if (Object.hasOwn(startingPoints, preset)) await chooseStartingPoint(page, preset);
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

test('the removable Custom theme header chip clears browser customization across pages', async ({page},info)=>{
  const base=info.config.metadata.markupress;
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:900});
    await page.goto(base+'customize/');
    const chip=page.getByRole('button',{name:'Remove Custom theme',exact:true});
    await expect(chip).toBeHidden();
    const original=await page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--ui-accent').trim());
    await chooseStartingPoint(page, 'bookish');
    await expect(chip).toBeVisible();
    await page.goto(base+'components/ui-button/');
    await expect(chip).toBeVisible();
    expect(await page.locator('html').evaluate(el=>el.scrollWidth<=innerWidth)).toBe(true);
    const brand=page.locator('[data-component~="markupress-header"] .brand-title');
    expect(await brand.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.locator('[data-component~="markupress-header"]').screenshot({path:info.outputPath(`custom-theme-header-${width}.png`)});
    await chip.click();
    await expect(chip).toBeHidden();
    await expect.poll(()=>page.locator('html').evaluate(el=>getComputedStyle(el).getPropertyValue('--ui-accent').trim())).toBe(original);
    await expect(page.getByRole('button',{name:'Search',exact:true})).toBeFocused();
    await page.reload();await expect(chip).toBeHidden();
  }
});

test('Starting point defaults to Looma and Gold applies and survives a reload', async ({ page }, info) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(info.config.metadata.markupress + 'customize/');
  const themes = await openEditor(page, 'themes');
  await expect(themes.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('Looma');
  await chooseStartingPoint(page, 'gold');
  const material = await openEditor(page, 'material');
  const primary = material.getByRole('button', { name: 'Send briefing', exact: true });
  await expect(primary).toHaveCSS('background-color', 'rgb(255, 184, 77)');
  await expect(primary).toHaveCSS('font-family', /Lato/);
  await expect(page.locator('[data-looma-customizer]')).toHaveCSS('background-attachment', /^fixed(?:,\s*fixed)*$/);
  await page.reload();
  await openEditor(page, 'themes');
  await expect(page.getByRole('combobox', { name: 'Starting point', exact: true })).toHaveValue('Gold');
  expect(errors).toEqual([]);
});
