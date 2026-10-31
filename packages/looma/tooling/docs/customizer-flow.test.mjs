import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { customizerResource } from './customizer-render.mjs';
import { defaultRecipe, themeFields } from './theme.mjs';

function consumer(t) {
  const recipe = defaultRecipe();
  const markup = customizerResource({ catalog: { components: [], groups: [] }, config: {}, base: '/' }, recipe);
  const dom = new JSDOM(markup);
  t.after(() => dom.window.close());
  return { root: dom.window.document.querySelector('template').content, recipe };
}

test('material keeps its core choices beside local precision controls without duplicate fields', t => {
  const { root } = consumer(t);
  for (const field of themeFields.filter(field => !['light-x','light-y','palette-relationship'].includes(field.id))) assert.equal(root.querySelectorAll(`#theme-${field.id}`).length, 1, field.id);
  assert.deepEqual([...root.querySelectorAll('[data-relationship]')].map(node => node.dataset.relationship), ['preserve','neighboring','complementary']);
  for (const id of ['finish','translucency','glassiness']) assert.equal(root.querySelector(`#theme-${id}`).closest('[data-advanced]'), null);
  for (const id of ['light-color','edge-light','glow','outer-depth','inner-depth','surface-separation']) assert.equal(root.querySelector(`#theme-${id}`).closest('ui-disclosure'), null, `${id}: everyday material choices stay visible`);
  assert.ok(root.querySelector('[data-refinement-view="material"] ui-light-editor'));
  assert.ok(root.querySelector('[data-refinement-view="material"] ui-card[treatment="expressive"]'));
});

test('the scene belongs to material specimens while controls have their own backing', t => {
  const { root, recipe } = consumer(t);
  assert.equal(root.querySelector('[data-preview-background]'), null);
  assert.equal(root.querySelector('[data-action="inspect-glass"]'), null);
  assert.ok(root.querySelector('[data-glass-hint] [data-action="use-glass"]'));
  assert.deepEqual(JSON.parse(root.querySelector('[data-looma-customizer]').dataset.recipe).values, recipe.values);
  assert.equal(Object.hasOwn(recipe.values, 'preview-background'), false);
  assert.ok(root.querySelector('[data-customizer-summary] > ui-card'));
  assert.ok(root.querySelector('[data-refinement-view="palette"] .controls-panel > ui-card'));
  assert.match(root.querySelector('style').textContent, /\[data-editor-preview="material"\].*repeating-linear-gradient/);
});

test('palette exposes governed relationships and shows every status in both modes', t => {
  const {root}=consumer(t);
  const palette=root.querySelector('[data-refinement-view="palette"]');
  for(const role of ['success','danger','warning','info']) {
    assert.equal(palette.querySelectorAll(`ui-badge[tone="${role}"]`).length,2);
    const select=palette.querySelector(`#theme-${role}-source`);
    assert.deepEqual([...select.children].map(option=>option.value),['derived','related','primary','secondary','tertiary']);
    assert.equal(palette.querySelector(`#theme-${role}-color`),null);
  }
  const relationships = palette.querySelector('[data-refinement-preset=status]');
  assert.deepEqual([...relationships.children].map(option => option.value), ['custom','semantic','restrained','primary']);
  assert.equal(relationships.closest('[data-advanced]'), null);
  for (const family of ['palette','material','status']) assert.equal(root.querySelector(`[data-action=restore-${family}]`), null, `${family}: one shared history replaces section resets`);
  assert.equal(palette.querySelectorAll('ui-callout[tone=tip]').length, 2);
  assert.equal(palette.querySelector('#theme-tip-source'), null);
  assert.ok(palette.querySelector('#theme-neutral-source'));
  assert.ok(palette.querySelector('#theme-neutral-border-contrast'));
  for(const role of ['secondary','tertiary']) assert.ok(palette.querySelector(`ui-color-picker[clearable][data-optional-color="${role}-action"]`));
  assert.equal(palette.querySelector('[data-color-source]'), null);
  assert.equal(palette.querySelectorAll('[data-base-colors] ui-color-picker').length, 4);
  for (const id of ['selection-accent','focus-accent','link-accent']) assert.equal(palette.querySelector(`#theme-${id}`).closest('ui-disclosure'), null);
});

test('the updating overview and compact history controls persist outside editor panes', t => {
  const {root}=consumer(t);const summary=root.querySelector('[data-customizer-summary]');
  assert.equal(summary.closest('[data-refinement-view]'),null);
  assert.equal(root.querySelectorAll('[data-preset]').length,1);
  assert.ok(summary.querySelector('[data-preset]'));
  assert.equal(root.querySelector('[data-refinement-view=themes]'),null);
  assert.equal(root.querySelector('[data-action=refine-themes]'),null);
  assert.deepEqual([...summary.querySelectorAll('[data-summary]')].map(el=>el.dataset.summary), ['palette','material','typography','layout','motion']);
  for(const action of ['undo','redo','reset']) assert.ok(summary.querySelector(`[data-action="${action}"]`));
  for(const field of root.querySelectorAll('ui-slider[data-token], ui-number-input[data-token]')) assert.ok(field.hasAttribute('compact'));
});
