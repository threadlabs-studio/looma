import assert from 'node:assert/strict';
import test from 'node:test';
import { themeFields } from './theme.mjs';
import { valueEditor, editorValue, convertValueUnit } from './value-editors.mjs';
const field = id => themeFields.find(item => item.id === id);
test('editor ranges come from canonical bounds and percentages round-trip without drift', () => {
  assert.deepEqual(valueEditor(field('glassiness'), '.8'), { kind: 'slider', value: 80, min: 0, max: 100, step: 1, unit: '%', scale: 100 });
  assert.equal(editorValue(field('glassiness'), 35), '0.35');
  assert.equal(editorValue(field('spacing'), 85), '0.85');
  const editor = valueEditor(field('text-size'), '16px');
  assert.equal(editor.min, 14); assert.equal(editor.max, 24); assert.equal(editor.unit, 'px'); assert.equal(editor.units, undefined);
});
test('unit changes preserve the numeric quantity and keep relative and time units explicit', () => {
  assert.equal(convertValueUnit('40px', 'rem'), '2.5rem');
  assert.equal(convertValueUnit('2.5rem', 'px'), '40px');
  assert.equal(convertValueUnit('150ms', 's'), '0.15s');
  assert.throws(() => convertValueUnit('150ms', 'px'));
  assert.equal(valueEditor(field('response-curve'), 'step-start').kind, 'text');
});

test('relative authoring bounds convert through the chosen root', () => {
  const editor = valueEditor(field('corner-roundness'), '1rem', {remPixels:32});
  assert.equal(editor.min, 0); assert.equal(editor.max, 1);
  assert.equal(convertValueUnit('1rem','px',{remPixels:32}), '32px');
});

test('relative editor bounds use the current root so switching units preserves edge values', () => {
  for (const [id, root, pixels] of [['line-weight',18,.5],['corner-roundness',14,32]]) {
    const converted=convertValueUnit(pixels+'px','rem',{remPixels:root});
    const editor=valueEditor(field(id),converted,{remPixels:root});
    assert.ok(parseFloat(converted)>=editor.min-1e-6 && parseFloat(converted)<=editor.max+1e-6, JSON.stringify({id,root,converted,editor}));
  }
});
