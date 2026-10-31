import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerParts, replacePickerParts } from '../../packages/looma/src/components/shared/date-picker.js';

test('the default binding exports only a date even when editing zones or clocks are supplied', () => {
  for (const timeZone of ['Pacific/Kiritimati', 'America/Adak', 'UTC']) {
    const options = { timeZone };
    assert.deepEqual(pickerParts('2026-10-30', options), { date: '2026-10-30', time: '' });
    assert.equal(replacePickerParts('2026-10-30', '2026-11-02', '23:59', options), '2026-11-02');
    assert.equal(replacePickerParts('', '2026-11-02', undefined, options), '2026-11-02');
    assert.throws(() => pickerParts('2026-10-30T00:00:00Z', options));
  }
});

test('calendar date replacement preserves local clock precision and the selected separator', () => {
  assert.deepEqual(pickerParts('2026-10-30 14:30:45.123456789', { type: 'datetime-local', valueFormat: 'space' }), { date: '2026-10-30', time: '14:30:45.123456789' });
  assert.equal(replacePickerParts('2026-10-30 14:30:45.123456789', '2026-11-02', undefined, { type: 'datetime-local', valueFormat: 'space' }), '2026-11-02 14:30:45.123456789');
  assert.equal(replacePickerParts('', '0001-01-01', undefined), '0001-01-01');
  assert.throws(() => replacePickerParts('', '2026-10-30', '', { type: 'datetime-local' }));
});

test('instant projection uses the editing date, retaining its wall clock across offset changes', () => {
  const options = { type: 'instant', timeZone: 'America/New_York' };
  assert.deepEqual(pickerParts('2026-10-31T02:30:45.123456789Z', options), { date: '2026-10-30', time: '22:30:45.123456789' });
  assert.equal(replacePickerParts('2026-10-31T02:30:45.123456789Z', '2026-11-02', undefined, options), '2026-11-03T03:30:45.123456789Z');
  assert.throws(() => pickerParts('2026-10-31T02:30Z', { type: 'instant' }));
});

test('zoned replacement retains a bound zone even when the explicit editing zone differs', () => {
  const value = '2026-10-30T22:30:45.123456789-04:00[America/New_York]';
  assert.equal(replacePickerParts(value, '2026-11-03', undefined, { type: 'zoned', timeZone: 'UTC' }), '2026-11-02T21:30:45.123456789-05:00[America/New_York]');
});

test('DST gaps and repeats reject by default and support explicit Temporal resolution', () => {
  const options = { type: 'instant', timeZone: 'America/New_York' };
  assert.throws(() => replacePickerParts('', '2026-03-08', '02:30', options));
  assert.throws(() => replacePickerParts('', '2026-11-01', '01:30', options));
  assert.equal(replacePickerParts('', '2026-11-01', '01:30', { ...options, disambiguation: 'later' }), '2026-11-01T06:30:00Z');
  assert.equal(replacePickerParts('2026-11-01T05:30:00Z', '2026-11-01', undefined, options), '2026-11-01T05:30:00Z');
});
