import { test, expect } from '@playwright/test';

const header = '[data-component~="markupress-header"]';

for (const width of [1440, 900, 375]) {
  test(`homepage has a centered header and usable live controls at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(info.config.metadata.markupress);
    await page.evaluate(() => document.fonts.ready);
    const bar = page.locator(header);
    const centered = await bar.evaluate(element => {
      const box = element.getBoundingClientRect();
      const brand = element.querySelector('.brand').getBoundingClientRect();
      return Math.abs(brand.y + brand.height / 2 - (box.y + box.height / 2));
    });
    expect(centered).toBeLessThan(2);
    if (width > 996) {
      await expect(bar.locator(".navigation a").first()).toHaveText("Get started");
      // The same face's descent scales with font size; subtract it from the text range's bottom.
      const baselines = await bar.evaluate(element => {
        const canvas = document.createElement('canvas').getContext('2d');
        return [element.querySelector('.brand-title'), element.querySelector('.navigation a')].map(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const style = getComputedStyle(node); canvas.font = style.font;
          return range.getBoundingClientRect().bottom - canvas.measureText(node.textContent).fontBoundingBoxDescent;
        });
      });
      expect(Math.abs(baselines[0] - baselines[1])).toBeLessThan(2);
    }
    const story = await page.locator('.hero-text').boundingBox();
    const showcase = await page.getByLabel('Live component showcase', { exact: true }).boundingBox();
    if (width > 996) expect(showcase.x).toBeGreaterThan(story.x + story.width);
    else if (width === 375) expect(showcase.y).toBeGreaterThan(story.y + story.height);
    await expect(page.getByRole('meter', { name: 'Launch progress', exact: true })).toHaveAttribute('aria-valuenow', '2');
    const action = await page.getByRole('link', { name: 'Start building', exact: true }).boundingBox();
    const install = await page.locator('.hero-text code').boundingBox();
    expect(action.y - install.y - install.height).toBeGreaterThan(16);
    const checkbox = page.getByRole('checkbox', { name: 'Share it with the world', exact: true });
    await checkbox.check(); await expect(checkbox).toBeChecked();
    await expect(page.getByRole('meter', { name: 'Launch progress', exact: true })).toHaveAttribute('aria-valuenow', '3');
    const loop = page.getByRole('switch', { name: 'Keep me in the loop', exact: true });
    await loop.uncheck(); await expect(loop).not.toBeChecked();
    const explore = page.getByRole('link', { name: 'Explore Looma', exact: true });
    await expect(explore).toHaveAttribute('href', '/looma/components/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(errors).toEqual([]);
    await checkbox.uncheck();
    await expect(page.getByRole('meter', { name: 'Launch progress', exact: true })).toHaveAttribute('aria-valuenow', '2');
    await loop.check();
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath(`homepage-${width}.png`), fullPage: true });
  });
}

test('homepage links and primary actions follow the selected theme in light and dark', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress);
  const colors = () => page.getByRole('link', { name: 'Start building', exact: true }).evaluate(element => ({
    surface: getComputedStyle(element).backgroundColor,
    text: getComputedStyle(element).color,
  }));
  const original = await colors();
  const proseLink = page.getByRole('link', { name: 'Try the theme studio', exact: true });
  const originalLink = await proseLink.evaluate(element => getComputedStyle(element).color);
  await page.evaluate(() => {
    const session = window[Symbol.for('looma.documentation.theme')];
    session.apply({ ...session.recipe, values: { ...session.recipe.values, action: '#b53b21' } });
  });
  await expect.poll(colors).not.toEqual(original);
  await expect.poll(() => proseLink.evaluate(element => getComputedStyle(element).color)).not.toBe(originalLink);
  for (const mode of ['light', 'dark']) {
    await page.locator('html').evaluate((element, mode) => element.dataset.theme = mode, mode);
    const link = page.getByRole('link', { name: 'Try the theme studio', exact: true });
    await expect(link).toBeVisible();
    expect(await link.evaluate(element => getComputedStyle(element).color)).not.toBe('rgb(0, 0, 238)');
    const themed = await colors();
    expect(themed.surface).not.toBe('rgba(0, 0, 0, 0)');
    expect(themed.surface).not.toBe(themed.text);
    await page.screenshot({ path: info.outputPath(`homepage-${mode}.png`), fullPage: true });
  }
});

test('homepage content and navigation work without JavaScript', async ({ browser }, info) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto(info.config.metadata.markupress);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Beautiful interfaces.');
    await expect(page.getByRole('link', { name: 'Start building', exact: true })).toBeVisible();
    await page.getByRole('checkbox', { name: 'Share it with the world', exact: true }).check();
    await expect(page.getByRole('checkbox', { name: 'Share it with the world', exact: true })).toBeChecked();
    await page.getByRole('link', { name: 'Start building', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(page.url()).toContain('/getting-started/');
  } finally { await context.close(); }
});

test('homepage actions reach their documentation destinations', async ({ page }, info) => {
  const base = info.config.metadata.markupress;
  for (const [name, heading] of [
    ['Start building', /Getting started/i],
    ['Make it yours', /^Customize your theme$/],
    ['Explore Looma', /^Components$/],
  ]) {
    await page.goto(base);
    await page.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }
});
