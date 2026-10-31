import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileDateRules, isDateAllowed, isRangeAllowed, updateRangeStart, updateRangeEnd } from '../../packages/looma/src/components/shared/date-time.js';
import { rangeAvailability } from '../../packages/looma/src/components/shared/date-range.js';

test('endpoint availability preserves the opposite endpoint and permits a valid crossing collapse', () => {
  const range = { start: '2026-10-10', end: '2026-10-15' };
  const rules = compileDateRules({ disabledDates: ['2026-10-08', '2026-10-18'] });
  const availability = rangeAvailability(range, { rules });
  const startRules = compileDateRules({ allowedRanges: availability.startRanges, disabledDates: ['2026-10-08', '2026-10-18'] });
  const endRules = compileDateRules({ allowedRanges: availability.endRanges, disabledDates: ['2026-10-08', '2026-10-18'] });
  for (const date of ['2026-10-05', '2026-10-09', '2026-10-12', '2026-10-20']) {
    assert.equal(isDateAllowed(date, startRules), isRangeAllowed(updateRangeStart(range, date), rules), `start ${date}`);
    assert.equal(isDateAllowed(date, endRules), isRangeAllowed(updateRangeEnd(range, date), rules), `end ${date}`);
  }
});

test('a fresh range disables selections crossing unavailable interior dates in either direction', () => {
  const rules = compileDateRules({ min: '2026-10-01', max: '2026-10-31', disabledDates: ['2026-10-08', '2026-10-18'] });
  assert.deepEqual(rangeAvailability({ start: '', end: '' }, { rules, anchor: '2026-10-12' }).calendarRanges, [{ start: '2026-10-09', end: '2026-10-17' }]);
  assert.deepEqual(rangeAvailability({ start: '', end: '' }, { rules, anchor: '2026-10-12', allowUnavailableWithinRange: true }).calendarRanges, [{ start: '2026-10-01', end: '2026-10-31' }]);
});

test('whitelists, weekdays, empty allow sets and unavailable external endpoints retain their meanings', () => {
  const range = { start: '2026-10-12', end: '2026-10-15' };
  const rules = compileDateRules({ allowedRanges: [{ start: '2026-10-01', end: '2026-10-31' }], disabledWeekdays: [7] });
  const result = rangeAvailability(range, { rules, mode: 'start' });
  assert.deepEqual(result.startRanges, [{ start: '2026-10-12', end: '2026-10-31' }]);
  assert.deepEqual(result.endRanges, [{ start: '2026-10-01', end: '2026-10-17' }]);
  assert.deepEqual(rangeAvailability(range, { rules: compileDateRules({ allowedDates: [] }) }).calendarRanges, []);
  assert.deepEqual(rangeAvailability({ start: '2026-10-11', end: '2026-10-15' }, { rules, mode: 'end' }).endRanges, [{ start: '2026-10-01', end: '2026-10-10' }]);
});
