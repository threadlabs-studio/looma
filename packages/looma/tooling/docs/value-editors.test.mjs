import assert from 'node:assert/strict';
import test from 'node:test';
import { themeFields } from './theme.mjs';
import { valueEditor, editorValue, convertValueUnit } from './value-editors.mjs';
const field = id => themeFields.find(item => item.id === id);
test('editor ranges come from canonical bounds and percentages round-trip without drift', () => {
  assert.deepEqual(valueEditor(field('glassiness'), '.8'), { kind: 'slider', value: 80, min: 0, max: 100, step: 1, unit: '%', scale: 100 });
  assert.equal(editorValue(field('glassiness'), 35), '0.35');
  assert.equal(editorValue(field('spacing'), 85), '0.85');
  const editor = valueEditor(field('text-size'), '1rem');
  assert.equal(editor.min, .875); assert.equal(editor.max, 1.5); assert.equal(editor.unit, 'rem');
});
test('unit changes preserve the numeric quantity and keep relative and time units explicit', () => {
  assert.equal(convertValueUnit('40px', 'rem'), '2.5rem');
  assert.equal(convertValueUnit('2.5rem', 'px'), '40px');
  assert.equal(convertValueUnit('150ms', 's'), '0.15s');
  assert.throws(() => convertValueUnit('150ms', 'px'));
  assert.equal(valueEditor(field('response-curve'), 'step-start').kind, 'text');
});

test('relative authoring bounds follow the root preference instead of shrinking the editor range', () => {
  const editor = valueEditor(field('text-size'), '1rem', {remPixels:32});
  assert.equal(editor.min, .875); assert.equal(editor.max, 1.5);
  assert.equal(convertValueUnit('1rem','px',{remPixels:32}), '32px');
});
