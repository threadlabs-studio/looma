import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDateRules } from '../../packages/looma/src/components/shared/date-time.js';
import { availableDate } from '../../packages/looma/src/components/shared/date-navigation.js';

test('navigation skips unavailable days in either direction and respects inclusive bounds', () => {
  const rules = compileDateRules({ min: '2026-10-01', max: '2026-10-31', disabledWeekdays: [6, 7], disabledDates: ['2026-10-12'] });
  assert.equal(availableDate('2026-10-10', 1, rules), '2026-10-13');
  assert.equal(availableDate('2026-10-12', -1, rules), '2026-10-09');
  assert.equal(availableDate('2026-09-30', 1, rules), '2026-10-01');
  assert.equal(availableDate('2026-11-01', -1, rules), '2026-10-30');
  assert.equal(availableDate('2026-11-01', 1, rules), null);
  assert.equal(availableDate('2026-09-30', -1, rules), null);
});

test('navigation jumps across disabled centuries and separated allow intervals', () => {
  const rules = compileDateRules({ disabledRanges: [{ start: '1000-01-01', end: '2999-12-31' }], allowedRanges: [{ start: '0900-01-01', end: '3000-12-31' }, { start: '4000-01-01', end: '4000-12-31' }] });
  assert.equal(availableDate('1500-01-01', 1, rules), '3000-01-01');
  assert.equal(availableDate('1500-01-01', -1, rules), '0999-12-31');
  assert.equal(availableDate('3500-01-01', 1, rules), '4000-01-01');
  assert.equal(availableDate('3500-01-01', -1, rules), '3000-12-31');
});

test('navigation terminates for empty availability and the civil domain edges', () => {
  assert.equal(availableDate('2026-10-01', 1, compileDateRules({ allowedDates: [] })), null);
  assert.equal(availableDate('2026-10-01', 1, compileDateRules({ disabledWeekdays: [1, 2, 3, 4, 5, 6, 7] })), null);
  assert.equal(availableDate('+010000-01-01', 1), null);
  assert.equal(availableDate('0000-12-31', -1), null);
  assert.throws(() => availableDate('2026-10-01', 0));
});
