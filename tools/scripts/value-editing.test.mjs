import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateValue, boundedNumber, numberText } from '../../packages/looma/src/components/ui-number-input/arithmetic.js';
test('arithmetic calculates precedence, parentheses, signed values and matching units', () => {
  assert.equal(calculateValue('42 / 1.2', 'px'), 35);
  assert.equal(calculateValue('150ms * 2', 'ms'), 300);
  assert.equal(calculateValue('(12px + 4) / 2', 'px'), 8);
  assert.equal(calculateValue('-2 * -3 + 1'), 7);
  assert.equal(numberText(35, 'px'), '35px');
});
test('rejects code, dimensional errors, empty and nonfinite results', () => {
  for (const value of ['', 'alert(1)', '1/0', '2px * 3px', '1rem + 2px', '1px / 2px', '(1 + 2', '1 2', '1e999']) assert.throws(() => calculateValue(value, 'px'), value);
});
test('all numeric edits use finite shared bounds', () => {
  assert.equal(boundedNumber(calculateValue('100px * 20', 'px'), 8, 40), 40);
  assert.equal(boundedNumber(-10, 8, 40), 8);
  assert.equal(boundedNumber(20, 40, 8), 20);
});
import { curvePoints, curveText } from '../../packages/looma/src/components/ui-curve-editor/curve.js';
test('curves share bounded coordinates and support easing keywords', () => {
  assert.deepEqual(curvePoints('ease'), [.25, .1, .25, 1]);
  assert.deepEqual(curvePoints('cubic-bezier(-2, -4, 3, 8)'), [0, -1, 1, 2]);
  assert.equal(curveText([.123456, 0, 1, 1]), 'cubic-bezier(0.123, 0, 1, 1)');
  for (const value of ['cubic-bezier(1, 2)', 'cubic-bezier(NaN,0,1,1)', 'url(x)']) assert.throws(() => curvePoints(value));
});

import { connect as connectNumber } from '../../packages/looma/src/components/ui-number-input/ui-number-input.js';
class Field extends EventTarget {
  constructor(document = new EventTarget()) { super(); this.ownerDocument = document; this.value = ''; this.defaultValue = ''; this.attrs = new Map(); }
  setAttribute(key, value) { this.attrs.set(key, String(value)); }
  removeAttribute(key) { this.attrs.delete(key); }
  setCustomValidity(value) { this.validityMessage = value; }
}
function numberHost(values = {}) {
  const refs = Object.fromEntries(['input', 'decrease', 'increase'].map(name => [name, new Field()]));
  const props = Object.fromEntries(Object.entries({value: '16px', unit: 'px', min: 8, max: 40, step: 2, disabled: false, ...values}).map(([key, value]) => [key, {value}]));
  const events = []; let effect;
  const stop = connectNumber({element: { querySelector: selector => refs[selector === 'input' ? 'input' : selector.includes('decrease') ? 'decrease' : 'increase'] }, props, effect: callback => { effect = callback; callback(); return () => {}; }, dispatch: (type, detail) => events.push({type, detail})});
  return {refs, props, events, stop, sync: () => effect()};
}
test('number controller calculates on commit, clamps typing and steps, rejects invalid edits', () => {
  const host = numberHost();
  assert.equal(host.refs.input.value, '16px');
  assert.equal(host.refs.input.attrs.get('role'), 'spinbutton');
  assert.equal(host.refs.input.attrs.get('aria-valuenow'), '16');
  assert.equal(host.refs.input.attrs.get('aria-valuetext'), '16px');
  host.refs.input.value = '150px * 2'; host.refs.input.dispatchEvent(new Event('blur'));
  assert.equal(host.refs.input.value, '40px'); assert.deepEqual(host.events.at(-1), {type:'change', detail:{value:'40px'}});
  host.refs.decrease.dispatchEvent(new Event('click')); assert.equal(host.refs.input.value, '38px');
  host.refs.input.value = '2rem'; host.refs.input.dispatchEvent(new Event('blur'));
  assert.equal(host.refs.input.attrs.get('aria-invalid'), 'true');
  const count = host.events.length;
  host.props.disabled.value = true; host.refs.increase.dispatchEvent(new Event('click'));
  assert.equal(host.events.length, count);
  host.props.disabled.value = false; host.props.value.value = '-10px'; host.sync();
  assert.equal(host.refs.input.value, '8px');
  host.stop();
});
test('number keyboard provides exact stepping and cleanup removes listeners', () => {
  const host = numberHost();
  const key = new Event('keydown', {cancelable:true}); Object.assign(key, {key:'ArrowUp', shiftKey:true});
  host.refs.input.dispatchEvent(key); assert.equal(host.refs.input.value, '36px'); assert.equal(key.defaultPrevented, true);
  host.stop(); const count = host.events.length;
  host.refs.increase.dispatchEvent(new Event('click')); assert.equal(host.events.length, count);
});
