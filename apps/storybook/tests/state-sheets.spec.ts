import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { interactionCases } from '../../docs/tests/interaction-cases.mts';
// Reuse successful browser font responses across isolated contexts. A failed
// remote CSS @import also rejects Storybook's preview-module preload.
const fontStyles = new Map<string, Promise<{ status: number; headers: Record<string, string>; body: Buffer }>>();
test.beforeEach(async ({ context }) => {
  context.on('response', response => {
    const url = response.url();
    if (url.startsWith('https://fonts.googleapis.com/') && response.ok() && !fontStyles.has(url))
      fontStyles.set(url, response.body().then(body => ({ status: response.status(), headers: response.headers(), body })));
  });
  await context.route('https://fonts.googleapis.com/**', async route => {
    const cached = fontStyles.get(route.request().url());
    if (cached) await route.fulfill(await cached);
    else await route.continue();
  });
});
type ComponentApi = { tag: string; root?: string; attributes: { name: string; property: string; type: string; options?: string[] }[] };
const api = JSON.parse(readFileSync(new URL('../../../generated/component-api.json', import.meta.url), 'utf8')) as { components: ComponentApi[] };
const sourceRoot = resolve(import.meta.dirname, '../../../packages/looma/src/components');
const interactive = new Set(['ui-pagination', 'ui-checkbox', 'ui-radio', 'ui-switch', 'ui-color-picker', 'ui-combobox', 'ui-cycle-button', 'ui-curve-editor', 'ui-light-editor', 'ui-number-input', 'ui-listbox', 'ui-menu-item', 'ui-nav-item', 'ui-tree-item', 'ui-search-result-row', 'ui-disclosure', 'ui-tabs', 'ui-editable', 'ui-slider']);
const themed = new Set(['ui-button', 'ui-icon-button', 'ui-input', 'ui-select', 'ui-menu-item', 'ui-menu', 'ui-card', 'ui-checkbox', 'ui-switch']);
const floating = new Set(['ui-dialog', 'ui-popover', 'ui-menu', 'ui-context-menu', 'ui-tooltip']);
type VisualCase = {
  name: string;
  props: Record<string, unknown>;
  example: number;
  viewport?: { width: number; height: number };
  interaction?: string;
  run?: typeof interactionCases[number]['run'];
};
for (const component of api.components) {
  const examples = readdirSync(resolve(sourceRoot, component.tag, 'examples')).filter(name => name.endsWith('.html')).sort((a, b) => a.localeCompare(b));
  const defaultExample = Math.max(0, examples.findIndex(name => name !== '00-preview.html'));
  const propertyExample = component.tag === 'ui-menu' ? examples.indexOf('02-for.html') : defaultExample;
  const states: VisualCase[] = [{ name: 'Rest', props: {}, example: defaultExample }];
  for (const attribute of component.attributes) {
    const values = attribute.type === 'boolean' ? [false, true] : attribute.type === 'keyword' ? attribute.options ?? [] : [];
    for (const value of values)
      states.push({ name: `${attribute.name}: ${value}`, props: { ...(component.tag === 'ui-combobox' && attribute.name === 'muted' ? { value: 'north' } : {}), [attribute.property]: value }, example: propertyExample });
  }
  examples.forEach((name, index) => states.push({ name: `Example: ${name.replace('.html', '')}`, props: {}, example: index }));
  if (['button', 'input', 'select', 'textarea', 'a'].includes(component.root ?? '') || interactive.has(component.tag)) {
    for (const interaction of ['hover', 'focus', 'pressed'])
      states.push({ name: interaction, props: {}, example: defaultExample, interaction });
    const variants = component.attributes.find(attribute => attribute.name === 'variant')?.options ?? [];
    for (const variant of variants)
      for (const interaction of ['hover', 'focus', 'pressed'])
        states.push({ name: `${variant}: ${interaction}`, props: { variant }, example: defaultExample, interaction });
    if (['ui-button', 'ui-icon-button'].includes(component.tag)) {
      states.push({ name: 'selected toggle', props: { 'aria-pressed': 'true' }, example: defaultExample });
      if (component.tag === 'ui-button') states.push({ name: 'selected card', props: { variant: 'card', 'aria-pressed': 'true' }, example: defaultExample });
      states.push({ name: 'open ghost trigger', props: { variant: 'ghost', 'aria-expanded': 'true' }, example: defaultExample });
    }
  }
  for (const interaction of interactionCases.filter(item => item.component === component.tag)) {
    const example = examples.indexOf(interaction.example + '.html');
    if (example < 0)
      throw new Error(`Missing state example ${component.tag}/${interaction.example}`);
    states.push({ name: interaction.name, props: {}, example, run: interaction.run });
    if (component.tag === 'ui-sidebar') states.push({ name: 'Mobile drawer', props: {}, example, run: interaction.run, viewport: { width: 320, height: 480 } });
  }
  if (component.tag === 'ui-site-header') {
    states.push({ name: 'Mobile header', props: {}, example: defaultExample, viewport: { width: 375, height: 480 } });
    states.push({ name: 'Mobile navigation open', props: {}, example: defaultExample, viewport: { width: 375, height: 480 }, run: async (_page, stage) => {
      await expect(stage.getByRole('link', { name: 'Folio home' })).toBeVisible();
      await stage.getByRole('button', { name: 'Open navigation' }).click();
      await expect(stage.getByRole('dialog', { name: 'Main', exact: true }).getByRole('navigation', { name: 'Main', exact: true })).toBeVisible();
    } });
  }
  const themes = themed.has(component.tag) ? ['looma', 'minimal', 'gold', 'bookish', 'wiki', 'editorial', 'night', 'garden'] : ['minimal'];
  for (const theme of themes)
    for (const mode of ['light', 'dark'])
      test(`${component.tag} ${theme} ${mode}: complete state sheet`, async ({ page, context }) => {
        expect(JSON.stringify(states.map(({ name, props, example, interaction, run, viewport }) => ({ name, props, example, interaction, viewport, ...(run ? { interaction: 'authored' } : {}) })), null, 2)).toMatchSnapshot(`${component.tag}-inventory.json`);
        // A sidebar's resize and docked states need a desktop viewport; crop the
        // sidebar itself into a compact cell, and exercise the drawer separately.
        const viewport = { width: component.tag === 'ui-site-header' ? 1024 : component.tag === 'ui-sidebar' ? 960 : 320, height: 480 };
        await page.setViewportSize(viewport);
        await page.goto(`http://127.0.0.1:6020/iframe.html?id=visual-component-states--fixture&viewMode=story&component=${component.tag}&theme=${theme}&mode=${mode}`);
        await page.waitForFunction(() => typeof (window as unknown as {
          renderVisualCase?: unknown;
        }).renderVisualCase === 'function');
        const images: {
          name: string;
          image: string;
          width: number;
        }[] = [];
        let paintedCases = 0;
        for (const state of states) {
          await test.step(state.name, async () => {
            const targetViewport = state.viewport ?? viewport;
            if (page.viewportSize()!.width !== targetViewport.width) await page.setViewportSize(targetViewport);
            await page.mouse.move(319, 479);
            await page.evaluate(({ props, example }) => (window as unknown as {
              renderVisualCase: (props: Record<string, unknown>, example: number) => Promise<void>;
            }).renderVisualCase(props, example), { props: state.props, example: state.example });
            const stage = page.locator('#visual-state-stage');
            await expect(stage.locator(`[data-component~="${component.tag}"]`).first()).toBeAttached();
            await page.evaluate(() => document.fonts.ready);
            for (const image of await stage.locator(component.tag === 'ui-image' ? 'img' : 'img[src*="portrait"]').all()) {
              await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
            }
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            if (floating.has(component.tag) && state.name !== 'Rest' && !state.run && !state.interaction && state.props.open !== false && state.props.disabled !== true) {
              const opened = stage.locator('dialog[open], [popover]:popover-open');
              const surface = stage.locator(`[data-component~="${component.tag}"]`).first();
              if (!await opened.count() && !await surface.isVisible() && await surface.evaluate(element => element.matches('dialog,[popover]'))) {
                const targetId = await surface.getAttribute('for');
                const trigger = targetId ? stage.locator(`[id=${JSON.stringify(targetId)}]`) : component.tag === 'ui-context-menu' ? stage.locator('button:visible,[tabindex]:visible').first() : stage.getByRole('button').first();
                if (component.tag === 'ui-popover' && state.props.trigger === 'manual') {
                  await trigger.click();
                  await expect(opened).toHaveCount(0);
                  await page.evaluate(({ props, example }) => (window as unknown as {
                    renderVisualCase: (props: Record<string, unknown>, example: number) => Promise<void>;
                  }).renderVisualCase({ ...props, open: true }, example), { props: state.props, example: state.example });
                }
                else if (component.tag === 'ui-tooltip') {
                  const method = state.props.trigger ?? await surface.getAttribute('trigger') ?? 'hover';
                  if (method === 'click') await trigger.click();
                  else if (method === 'focus') { await page.keyboard.press('Shift'); await trigger.focus(); }
                  else await trigger.hover();
                }
                else await trigger.click(component.tag === 'ui-context-menu' ? {button:'right'} : {});
                await expect(opened.first()).toBeVisible();
              }
            }
            if (state.run)
              await state.run(page, stage);
            const root = stage.locator(`[data-component~="${component.tag}"]`).first();
            if (component.tag === 'ui-toast' && state.name !== 'Rest' && !state.run) {
              await stage.getByRole('button').first().click();
              await expect(root).toBeVisible();
            }
            if (component.tag.startsWith('ui-editor-') && state.name !== 'Rest' && !state.run) {
              const menu = root.locator('[role="menu"][popover]').first();
              if (await menu.count() && !await menu.isVisible()) {
                await stage.locator('button[aria-haspopup="menu"]').first().click();
                await expect(menu).toBeVisible();
              }
            }
            const painted = await root.evaluate(element => [element, ...element.querySelectorAll('*')].some(node => {
              const box = node.getBoundingClientRect();
              if (!box.width || !box.height) return false;
              for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) {
                const style = getComputedStyle(ancestor);
                if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
              }
              return true;
            }));
            if (painted) paintedCases++;
            const control = root.locator('button:not(:disabled):visible,input:not([type="hidden"]):not(:disabled):visible,select:not(:disabled):visible,textarea:not(:disabled):visible,a[href]:visible,[tabindex]:visible,summary:visible,[contenteditable="true"]:visible').first();
            const target = await root.evaluate(el => el.matches('button,input,select,textarea,a[href],[tabindex],summary,[contenteditable="true"]')) ? root : control;
            if (state.interaction === 'hover')
              await root.hover();
            if (state.interaction === 'focus') {
              await target.focus();
              await page.keyboard.press('Shift');
            }
            if (state.interaction === 'pressed') {
              await target.hover();
              await page.mouse.down();
            }
            // Opening a tooltip can request a font weight the hidden surface did
            // not use. Screenshot waits for it too, so finish that layout first.
            if (component.tag === 'ui-tooltip') {
              await page.evaluate(() => document.fonts.ready);
              await root.evaluate(element => new Promise<void>(resolve => {
                let previous = '', stable = 0;
                const sample = () => {
                  const { x, y, width, height } = element.getBoundingClientRect();
                  const current = JSON.stringify([x, y, width, height]);
                  stable = current === previous ? stable + 1 : 0;
                  previous = current;
                  if (stable >= 2) resolve();
                  else requestAnimationFrame(sample);
                };
                requestAnimationFrame(sample);
              }));
            }
            const clip = await stage.evaluate((stage, tag) => {
              const root = stage.querySelector(`[data-component~="${tag}"]`)!;
              const scope = tag === 'ui-sidebar' ? root : stage;
              const boxes: DOMRect[] = [];
              const transparent = (color: string) => color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
              const visible = (node: Element) => {
                for (let parent: Element | null = node; parent; parent = parent.parentElement) {
                  const style = getComputedStyle(parent);
                  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
                }
                return true;
              };
              for (const node of [scope, ...scope.querySelectorAll('*')]) {
                if (!visible(node)) continue;
                const style = getComputedStyle(node);
                const box = node.getBoundingClientRect();
                const paints = node === root || !transparent(style.backgroundColor) || style.backgroundImage !== 'none' || style.boxShadow !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0 && !transparent(style.getPropertyValue(`border-${side.toLowerCase()}-color`))) || node.matches('svg,input,textarea,select,img,canvas,video');
                if (paints && box.width && box.height) boxes.push(box);
                // Text ranges exclude the empty width/height of layout wrappers.
                for (const child of node.childNodes) {
                  if (child.nodeType !== Node.TEXT_NODE || !child.textContent?.trim()) continue;
                  const range = document.createRange(); range.selectNode(child);
                  boxes.push(...range.getClientRects());
                }
              }
              for (const node of document.querySelectorAll('dialog[open],[popover]:popover-open,[role="tooltip"]')) {
                const box = node.getBoundingClientRect();
                if (visible(node) && box.width && box.height) boxes.push(box);
              }
              // Leave room for focus outlines, arrows and the material's shadow.
              const outset = 12;
              if (!boxes.length) return { x: 0, y: 0, width: outset * 2, height: outset * 2 };
              const x = Math.max(0, Math.floor(Math.min(...boxes.map(box => box.left), innerWidth) - outset));
              const y = Math.max(0, Math.floor(Math.min(...boxes.map(box => box.top), innerHeight) - outset));
              const right = Math.min(innerWidth, Math.ceil(Math.max(...boxes.map(box => box.right), x + 1) + outset));
              const bottom = Math.ceil(Math.max(...boxes.map(box => box.bottom), y + 1) + outset);
              return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
            }, component.tag);
            const screenshot = await page.screenshot({ clip, animations: 'disabled' });
            images.push({ name: state.name, image: screenshot.toString('base64'), width: clip.width });
            if (state.interaction === 'pressed') {
              await page.mouse.move(319, 479);
              await page.mouse.up();
            }
          });
        }
        expect(paintedCases, `${component.tag} must visibly render in at least one documented state`).toBeGreaterThan(0);
        const sheet = await context.newPage();
        try {
          const columns = Math.min(8, images.length);
          await sheet.setViewportSize({ width: columns * 128 + 16, height: 800 });
          await sheet.setContent(`<style>body{margin:0;padding:12px;font:12px Arial;background:${mode === 'dark' ? '#171717' : '#f4f4f4'};color:${mode === 'dark' ? 'white' : 'black'}}h1{font-size:13px;margin:0 0 8px}main{display:grid;grid-template-columns:repeat(${columns},120px);grid-auto-rows:8px;grid-auto-flow:dense;column-gap:8px;align-items:start}figure{margin:0;padding-bottom:8px;width:max-content;max-width:100%}figcaption{padding:4px 0;font-weight:bold;max-width:280px}img{display:block;max-width:100%;height:auto}</style><h1>${component.tag} · ${theme} · ${mode} · ${states.length} states</h1><main>${images.map(({ name, image, width }) => `<figure data-width="${width}"><figcaption>${name}</figcaption><img src="data:image/png;base64,${image}"></figure>`).join('')}</main>`);
          await sheet.locator('img').evaluateAll(images => Promise.all(images.map(image => (image as HTMLImageElement).decode())));
          await sheet.locator('figure').evaluateAll(figures => {
            for (const figure of figures) {
              const element = figure as HTMLElement;
              element.style.gridColumn = `span ${Math.ceil((Number(element.dataset.width) + 8) / 128)}`;
              element.style.gridRow = `span ${Math.ceil(element.getBoundingClientRect().height / 8)}`;
            }
          });
          // Choose the smallest sheet area without shrinking any captured state.
          let best = { columns, area: Infinity };
          const minimumColumns = Math.min(columns, Math.max(3, ...images.map(image => Math.ceil((image.width + 8) / 128))));
          for (let candidate = minimumColumns; candidate <= columns; candidate++) {
            await sheet.setViewportSize({ width: candidate * 128 + 16, height: 800 });
            const area = await sheet.evaluate(candidate => {
              document.querySelector<HTMLElement>('main')!.style.gridTemplateColumns = `repeat(${candidate},120px)`;
              const bounds = document.body.getBoundingClientRect();
              return bounds.width * bounds.height;
            }, candidate);
            if (area < best.area) best = { columns: candidate, area };
          }
          await sheet.setViewportSize({ width: best.columns * 128 + 16, height: 800 });
          await sheet.locator('main').evaluate((element, columns) => { (element as HTMLElement).style.gridTemplateColumns = `repeat(${columns},120px)`; }, best.columns);
          if (process.env.LOOMA_VISUAL_OUTPUT_DIR) {
            await sheet.locator('body').screenshot({ path: resolve(process.env.LOOMA_VISUAL_OUTPUT_DIR, `${component.tag}-${theme}-${mode}.png`), animations: 'disabled' });
          } else {
            throw new Error('Use visual:test to generate a source-to-source visual review.');
          }
        }
        finally {
          await sheet.close();
        }
      });
}
