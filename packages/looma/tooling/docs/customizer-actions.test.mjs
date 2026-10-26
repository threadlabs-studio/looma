import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { customizerResource } from './customizer-render.mjs';

// Inspect the real generated consumer, rather than a separately composed sample.
test('material and palette card actions delegate secondary/primary placement to ActionBar', t => {
  const markup = customizerResource({ catalog: { components: [], groups: [] }, config: {}, base: '/' });
  const dom = new JSDOM(markup);
  t.after(() => dom.window.close());
  const document = dom.window.document;
  const root = document.querySelector('template').content;
  for (const [primary, secondary] of [['Send briefing', 'Keep draft'], ['Accent', 'Neutral']]) {
    const action = [...root.querySelectorAll('ui-button')].find(node => node.textContent === primary);
    assert.equal(action.parentElement.localName, 'ui-action-bar');
    assert.equal(action.getAttribute('slot'), 'primary');
    const buttons = [...action.parentElement.children];
    assert.deepEqual(buttons.slice(-2).map(node => [node.getAttribute('slot'), node.textContent]), [['secondary', secondary], ['primary', primary]]);
  }
  assert.ok([...document.querySelectorAll('link')].some(node => node.getAttribute('href') === '@threadlabs/looma/components/ui-action-bar/ui-action-bar.html'));
});
