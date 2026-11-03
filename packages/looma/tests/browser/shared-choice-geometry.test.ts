import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Shared choice geometry", () => {
  for (const adapter of ['html', 'converted']) it(`scales marks with typography and keeps first-line alignment in ${adapter}`, async () => {
    const path = await bundle(adapter + '-choice-geometry', adapter === 'html' ? `import '@looma-test/runtime';` : `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCheckbox as Checkbox, UiRadio as Radio, UiSwitch as Switch } from '@looma-test/components';
      createScene({ render: () => sceneNode('div', {}, [Checkbox, Radio, Switch].flatMap((component, i) => ['sm', 'md', 'lg'].map(size => sceneNode(component, { id: 'choice-' + i + '-' + size, size }, { default: () => 'A choice with a label that wraps onto another line', description: () => 'An explanatory description' })))) }).mount('#app');`);
    const body = adapter === 'html' ? ['checkbox', 'radio', 'switch'].flatMap((kind, i) => ['sm', 'md', 'lg'].map(size => `<ui-${kind} id="choice-${i}-${size}" size="${size}">A choice with a label that wraps onto another line<span slot="description">An explanatory description</span></ui-${kind}>`)).join('') : '<div id="app"></div>';
    const page = await open(path, body, [join(root, 'tokens.css')]);
    try {
      await page.addStyleTag({content: '[id^="choice-"] { max-width:180px; }'});
      for (const font of [12, 16, 24]) {
        await page.evaluate(value => { document.documentElement.style.setProperty('--ui-font-size', value + 'px'); }, font);
        for (const kind of [0, 1, 2]) for (const size of ['sm', 'md', 'lg']) {
          const metrics = await page.locator('#choice-' + kind + '-' + size).evaluate(el => {
            const input = el.querySelector('input')!, label = el.querySelector('.label')!;
            const box = input.getBoundingClientRect(), text = label.getBoundingClientRect(), css = getComputedStyle(label), thumb = getComputedStyle(input, '::after');
            return { width: box.width, height: box.height, delta: Math.abs(box.y + box.height / 2 - (text.y + parseFloat(css.paddingTop) + parseFloat(css.lineHeight) / 2)), thumb: parseFloat(thumb.height), inset: parseFloat(thumb.top), border: parseFloat(getComputedStyle(input).borderTopWidth) };
          });
          assert.ok(Math.abs(metrics.height - font * (kind === 2 ? 1.5 : 1.125)) < .1, JSON.stringify({kind, size, font, ...metrics}));
          assert.ok(metrics.delta < .6, JSON.stringify({kind, size, font, ...metrics}));
          if (kind === 2) {
            assert.ok(Math.abs(metrics.width - font * 2.5) < .1);
            assert.ok(Math.abs(metrics.inset + metrics.border + metrics.thumb / 2 - metrics.height / 2) < .1);
          }
        }
      }
    } finally { await page.close(); }
  });
});
