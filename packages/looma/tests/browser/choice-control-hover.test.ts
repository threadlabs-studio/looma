import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Choice control hover", () => {
for (const adapter of ["html", "converted"]) it(`animates radio selection surfaces and removes choice transitions for reduced motion in ${adapter}`, async () => {
    const path = await bundle(`choice-motion-${adapter}`, adapter === "html" ? 'import "@looma-test/runtime";' : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiRadio as Radio, UiCheckbox as Checkbox } from '@looma-test/components';
      createScene({ render: () => [sceneNode(Radio, { name: 'delivery' }, () => 'Standard'), sceneNode(Radio, { name: 'delivery' }, () => 'Express'), sceneNode(Checkbox, {}, () => 'Notify me')] }).mount('#app');`);
    const page = await open(path, adapter === "html" ? '<ui-radio name="delivery">Standard</ui-radio><ui-radio name="delivery">Express</ui-radio><ui-checkbox>Notify me</ui-checkbox>' : '<div id="app"></div>',
      [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "no-preference" });
    try {
      await page.addStyleTag({ content: ':root { --ui-motion-feedback: 1000ms; --ui-motion-fast: 1000ms; --ui-motion-base: 1000ms; }' });
      const radio = page.getByRole("radio", { name: "Standard" });
      const before = await radio.evaluate(element => getComputedStyle(element).backgroundColor);
      await radio.check();
      const middle = await radio.evaluate(element => {
        const animation = element.getAnimations().find(animation => (animation as CSSTransition).transitionProperty === 'background-color');
        if (!animation) return null;
        animation.pause();
        animation.currentTime = 500;
        return getComputedStyle(element).backgroundColor;
      });
      assert.notEqual(middle, null, `${adapter}: the selected surface transitions along with its dot`);
      await radio.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
      const after = await radio.evaluate(element => getComputedStyle(element).backgroundColor);
      assert.notEqual(middle, before);
      assert.notEqual(middle, after);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("radio", { name: "Express" }).check();
      await page.getByRole("checkbox", { name: "Notify me" }).check();
      const transitions = await page.locator('input').evaluateAll(inputs => inputs.flatMap(input => [null, '::after'].map(pseudo => {
        const style = getComputedStyle(input, pseudo);
        return { transition: style.transitionDuration, animation: style.animationName };
      })));
      assert.ok(transitions.every(style => style.transition === '0s' && style.animation === 'none'), JSON.stringify(transitions));
    } finally { await page.close(); }
  });

  for (const adapter of ['html', 'converted']) it(`gives checked and unchecked choices subtle hover from their label in ${adapter}`, async () => {
    const { themeCSS, startingPoints } = await import('../../../looma-docs/tooling/docs/theme.mjs');
    const { toLch } = await import('../../../looma-docs/tooling/docs/palette.mjs');
    const states = ['off', 'on', 'disabled', 'disabled-on'];
    const tags = ['checkbox', 'radio', 'switch'];
    const path = await bundle('choice-hover-' + adapter, adapter === 'html' ? 'import "@looma-test/runtime";' : `
      import { createScene, sceneNode } from "@looma-test/scene"; import { UiCheckbox as Checkbox, UiRadio as Radio, UiSwitch as Switch } from '@looma-test/components';
      createScene({ render: () => sceneNode('main', [Checkbox, Radio, Switch].flatMap((component, index) =>
        ['off', 'on', 'disabled', 'disabled-on'].map(state => sceneNode(component, {
          id: ['checkbox', 'radio', 'switch'][index] + '-' + state,
          checked: state.endsWith('on'), disabled: state.startsWith('disabled')
        }, () => 'Choice label')))) }).mount('#app');
    `);
    const body = tags.flatMap(tag => states.map(state => `<ui-${tag} id="${tag}-${state}" ${state.endsWith('on') ? 'checked' : ''} ${state.startsWith('disabled') ? 'disabled' : ''}>Choice label</ui-${tag}>`)).join('');
    const page = await open(path, adapter === 'html' ? body : '<div id="app"></div>', [join(root, 'tokens.css')], { reducedMotion: 'reduce' });
    try {
      await page.addStyleTag({ path: join(root, 'src/tokens/theme-system.css') });
      await page.addStyleTag({ content: 'body {background:var(--ui-surface)} body, main {display:grid;gap:12px;justify-items:start}' });
      const theme = await page.addStyleTag({ content: ' ' });
      for (const name of ['looma', 'bookish', 'gold'] as const) for (const mode of ['light', 'dark']) {
        await theme.evaluate((el, css) => el.textContent = css, themeCSS(startingPoints[name]));
        await page.locator('html').evaluate((el, mode) => el.setAttribute('data-theme', mode), mode);
        for (const tag of tags) for (const state of states) {
          const control = page.locator('#' + tag + '-' + state), input = control.locator('input');
          await page.mouse.move(0, 0);
          const rest = await input.screenshot(), geometry = await input.boundingBox();
          if (tag === 'radio' && state === 'on') assert.equal(await input.evaluate(el => getComputedStyle(el).backgroundImage), 'none', 'selected radios keep a flat face so lighting cannot distort the dot');
          await control.locator('.label').hover();
          const hovered = await input.screenshot();
          if (tag === 'radio' && state === 'on') assert.equal(await input.evaluate(el => getComputedStyle(el).backgroundImage), 'none', 'hover preserves the selected radio’s flat face');
          assert.equal(rest.equals(hovered), state.startsWith('disabled'), `${name}/${mode}/${tag}/${state}: only enabled marks respond when hovering the label`);
          if (state === 'on') {
            const samples = await page.evaluate(async sources => Promise.all(sources.map(async base64 => {
              const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
              const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
              const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
              return Array.from({ length: 36 }, (_, i) => {
                const rgba = context.getImageData(Math.floor(image.width * (.15 + (i % 6) * .14)), Math.floor(image.height * (.15 + Math.floor(i / 6) * .14)), 1, 1).data;
                return '#' + Array.from(rgba).slice(0, 3).map(n => n.toString(16).padStart(2, '0')).join('');
              });
            })), [rest.toString('base64'), hovered.toString('base64')]);
            const distance = samples[0].reduce((sum, hex, i) => {
              const [l, c, h] = toLch(hex), [hl, hc, hh] = toLch(samples[1][i]);
              return sum + Math.sqrt((l - hl) ** 2 + (c - hc) ** 2 + 2 * c * hc * (1 - Math.cos((h - hh) * Math.PI / 180)));
            }, 0) / samples[0].length;
            assert.ok(distance >= .01 && distance <= .05, `${name}/${mode}/${tag}: small checked marks need a visible but quiet paint change, got ${distance}`);
          }
          assert.deepEqual(await input.boundingBox(), geometry, `${tag}: hover never changes geometry`);
          await expect.poll(() => input.isChecked(), { message: `${tag}: hover never toggles the value` }).toBe(state.endsWith('on'));
        }
      }
      const mixed = page.locator('#checkbox-off input');
      await mixed.evaluate(el => { (el as HTMLInputElement).indeterminate = true; });
      await page.mouse.move(0, 0); const rest = await mixed.screenshot();
      await page.locator('#checkbox-off .label').hover();
      assert.equal(rest.equals(await mixed.screenshot()), false, 'mixed checkboxes also respond to label hover');
      await page.mouse.move(0, 0); await mixed.focus();
      await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
      assert.notEqual(await mixed.evaluate(el => getComputedStyle(el).outlineStyle), 'none', 'keyboard focus remains distinct from hover');
    } finally { await page.close(); }
  });
});
