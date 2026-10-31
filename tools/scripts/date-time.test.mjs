import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalValue, parseInput, formatInput, compileDateRules,
  isDateAllowed, isRangeAllowed, isValueAllowed, formatDisplay, rangeFromSelection, updateRangeStart, updateRangeEnd, monthGrid, calendarWeekStart,
} from '../../packages/looma/src/components/shared/date-time.js';

test('week order uses legacy locale data or Sunday when locale week information is unavailable', () => {
  const prototype = Intl.Locale.prototype;
  const modern = Object.getOwnPropertyDescriptor(prototype, 'getWeekInfo');
  const legacy = Object.getOwnPropertyDescriptor(prototype, 'weekInfo');
  try {
    Object.defineProperty(prototype, 'getWeekInfo', { configurable: true, value: undefined });
    Object.defineProperty(prototype, 'weekInfo', { configurable: true, get: () => ({ firstDay: 6 }) });
    assert.equal(calendarWeekStart('en-GB'), 6);
    Object.defineProperty(prototype, 'weekInfo', { configurable: true, value: undefined });
    assert.equal(calendarWeekStart('en-GB'), 7);
    assert.equal(calendarWeekStart('en-GB', 1), 1);
  } finally {
    if (modern) Object.defineProperty(prototype, 'getWeekInfo', modern); else delete prototype.getWeekInfo;
    if (legacy) Object.defineProperty(prototype, 'weekInfo', legacy); else delete prototype.weekInfo;
  }
});

test('date, time, wall-clock and exact values keep distinct meanings and preserve precision', () => {
  assert.equal(canonicalValue('2026-10-30'), '2026-10-30');
  assert.equal(canonicalValue('14:30', { type: 'time' }), '14:30');
  assert.equal(canonicalValue('14:30:45.123', { type: 'time' }), '14:30:45.123');
  assert.equal(canonicalValue('2026-10-30 14:30', { type: 'datetime-local', valueFormat: 'space' }), '2026-10-30 14:30');
  assert.equal(canonicalValue('2026-10-30T14:30-07:00', { type: 'instant' }), '2026-10-30T21:30:00Z');
  assert.equal(canonicalValue('2026-10-30T14:30-07:00[America/Vancouver]', { type: 'zoned' }), '2026-10-30T14:30-07:00[America/Vancouver]');
  for (const text of ['0000-01-01', '2026-02-29', '2026-04-31', '2026-10-30T00:00Z', '2026-10-30T14:30-07:00']) assert.throws(() => canonicalValue(text), text);
  assert.throws(() => canonicalValue('24:00', { type: 'time' }));
  assert.throws(() => canonicalValue('23:59:60', { type: 'time' }));
  assert.throws(() => canonicalValue('2026-10-30T23:59:60', { type: 'datetime-local' }));
});

test('typing accepts ISO or the declared locale order and local digits without guessing ambiguous dates', () => {
  assert.equal(parseInput('03/04/2026', { locale: 'en-US' }), '2026-03-04');
  assert.equal(parseInput('03/04/2026', { locale: 'en-GB' }), '2026-04-03');
  assert.equal(parseInput('30.10.2026', { locale: 'de-DE' }), '2026-10-30');
  assert.equal(parseInput('٣٠/١٠/٢٠٢٦', { locale: 'ar-EG' }), '2026-10-30');
  assert.equal(parseInput('٣٠/١٠/٢٠٢٦', { locale: 'ar-EG-u-nu-latn' }), '2026-10-30');
  assert.equal(parseInput('2026-10-30', { locale: 'en-US' }), '2026-10-30');
  assert.equal(parseInput('2:30 PM', { type: 'time', locale: 'en-US' }), '14:30');
  assert.equal(parseInput('12:00 AM', { type: 'time', locale: 'en-US' }), '00:00');
  assert.equal(parseInput('30/10/2026 14:30', { type: 'datetime-local', locale: 'en-GB' }), '2026-10-30T14:30');
  for (const text of ['2/3/26', '02/30/2026', '01/01/0000', '2026-10-', 'tomorrow']) assert.throws(() => parseInput(text, { locale: 'en-US' }));
  assert.equal(parseInput(''), '');
});

test('locale display remains editable and never changes a date across time zones', () => {
  for (const locale of ['en-US', 'en-GB', 'de-DE', 'ar-EG', 'ja-JP']) {
    const options = { locale };
    for (const value of ['2026-10-30', '0001-01-02', '0099-02-03', '0999-03-04']) {
      assert.equal(parseInput(formatInput(value, options), options), value);
    }
  }
  assert.equal(parseInput(formatInput('14:30', { type: 'time', locale: 'en-US' }), { type: 'time', locale: 'en-US' }), '14:30');
});

test('zoned editing requires a zone and exposes daylight-saving gaps and overlaps', () => {
  const options = { type: 'instant', locale: 'en-CA', timeZone: 'America/New_York' };
  assert.equal(parseInput('2026-10-30T14:30', options), '2026-10-30T18:30:00Z');
  assert.throws(() => parseInput('2026-03-08T02:30', options));
  assert.throws(() => parseInput('2026-11-01T01:30', options));
  assert.equal(parseInput('2026-11-01T01:30', { ...options, disambiguation: 'earlier' }), '2026-11-01T05:30:00Z');
  assert.equal(parseInput('2026-11-01T01:30', { ...options, disambiguation: 'later' }), '2026-11-01T06:30:00Z');
  assert.throws(() => parseInput('2026-10-30T14:30', { type: 'instant' }));
});

test('localized zoned edits retain the saved zone while an explicit zoned paste can replace it', () => {
  const options = { type: 'zoned', timeZone: 'UTC', boundTimeZone: 'America/New_York' };
  assert.equal(parseInput('2026-11-03T02:30', options), '2026-11-02T21:30-05:00[America/New_York]');
  assert.equal(parseInput('2026-11-03T09:00-08:00[America/Los_Angeles]', options), '2026-11-03T09:00-08:00[America/Los_Angeles]');
});

test('inclusive bounds intersect allow rules and disabled rules win conflicts', () => {
  const rules = compileDateRules({ min: '2026-10-01', max: '2026-10-31', allowedDates: ['2026-10-02'], allowedRanges: [{ start: '2026-10-10', end: '2026-10-20' }], disabledDates: ['2026-10-12'], disabledRanges: [{ start: '2026-10-15', end: '2026-10-17' }], disabledWeekdays: [7] });
  for (const date of ['2026-10-02', '2026-10-10', '2026-10-20']) assert.equal(isDateAllowed(date, rules), true, date);
  for (const date of ['2026-09-30', '2026-10-03', '2026-10-11', '2026-10-12', '2026-10-15', '2026-11-01']) assert.equal(isDateAllowed(date, rules), false, date);
  assert.equal(isDateAllowed('2026-10-30', compileDateRules()), true);
  assert.equal(isDateAllowed('2026-10-30', compileDateRules({ allowedDates: [] })), false);
  assert.equal(isDateAllowed('2026-10-30', compileDateRules({ allowedDates: ['2026-10-30'], allowedRanges: null })), true);
  assert.equal(isDateAllowed('2026-10-30', compileDateRules({ allowedDates: null, allowedRanges: [] })), false);
  assert.throws(() => compileDateRules({ min: '2026-11-01', max: '2026-10-01' }));
  assert.throws(() => compileDateRules({ disabledWeekdays: [0] }));
});

test('ranges validate their interior unless explicitly allowed to cross unavailable dates', () => {
  const rules = compileDateRules({ disabledDates: ['2026-10-12'] });
  assert.equal(isRangeAllowed({ start: '2026-10-10', end: '2026-10-15' }, rules), false);
  assert.equal(isRangeAllowed({ start: '2026-10-10', end: '2026-10-15' }, rules, true), true);
  assert.equal(isRangeAllowed({ start: '2026-10-12', end: '2026-10-15' }, rules, true), false);
  const allowed = compileDateRules({ allowedRanges: [{ start: '2026-10-01', end: '2026-10-05' }, { start: '2026-10-06', end: '2026-10-10' }] });
  assert.equal(isRangeAllowed({ start: '2026-10-01', end: '2026-10-10' }, allowed), true);
  assert.equal(isRangeAllowed({ start: '2026-10-01', end: '2026-10-11' }, allowed), false);
  assert.equal(isRangeAllowed({ start: '0001-01-01', end: '9999-12-31' }, compileDateRules()), true);
});

test('a fresh range uses the earlier second click as start and keeps the first click as end', () => {
  const range = { start: '2024-02-28', end: '2024-03-02' };
  assert.deepEqual(rangeFromSelection('2024-03-02', '2024-02-28'), range);
  assert.deepEqual(rangeFromSelection('2024-02-28', '2024-03-02'), range);
  assert.deepEqual(rangeFromSelection('2024-02-29', '2024-02-29'), { start: '2024-02-29', end: '2024-02-29' });
  assert.throws(() => rangeFromSelection('', '2024-03-02'));
  assert.throws(() => rangeFromSelection('2024-03-02', '2024-02-30'));
});

test('editing a range start preserves its end except when crossing it', () => {
  const range = { start: '2026-10-10', end: '2026-10-15' };
  assert.deepEqual(updateRangeStart(range, '2026-10-12'), { start: '2026-10-12', end: '2026-10-15' });
  assert.deepEqual(updateRangeStart(range, '2026-10-05'), { start: '2026-10-05', end: '2026-10-15' });
  assert.deepEqual(updateRangeStart(range, '2026-10-15'), { start: '2026-10-15', end: '2026-10-15' });
  assert.deepEqual(updateRangeStart(range, '2026-10-20'), { start: '2026-10-20', end: '2026-10-20' });
  assert.deepEqual(range, { start: '2026-10-10', end: '2026-10-15' });
});

test('editing a range end preserves its start except when crossing it', () => {
  const range = { start: '2026-10-10', end: '2026-10-15' };
  assert.deepEqual(updateRangeEnd(range, '2026-10-12'), { start: '2026-10-10', end: '2026-10-12' });
  assert.deepEqual(updateRangeEnd(range, '2026-10-20'), { start: '2026-10-10', end: '2026-10-20' });
  assert.deepEqual(updateRangeEnd(range, '2026-10-05'), { start: '2026-10-05', end: '2026-10-05' });
});

test('display options do not change the editable grammar and time fractions survive localization', () => {
  assert.equal(formatDisplay('2026-10-30', { locale: 'en-US', displayOptions: { dateStyle: 'long' } }), 'October 30, 2026');
  for (const locale of ['en-US', 'en-GB', 'de-DE', 'ar-EG']) {
    const options = { type: 'time', locale };
    assert.equal(parseInput(formatInput('14:30:45.123', options), options), '14:30:45.123');
  }
  for (const hourCycle of ['h11', 'h12', 'h23', 'h24']) {
    const options = { type: 'time', locale: 'en-US', hourCycle };
    assert.equal(parseInput(formatInput('00:30', options), options), '00:30', hourCycle);
  }
});

test('typed time and timestamp bounds compare the complete value', () => {
  assert.equal(isValueAllowed('14:30', { type: 'time', min: '09:00', max: '17:00' }), true);
  assert.equal(isValueAllowed('08:59', { type: 'time', min: '09:00', max: '17:00' }), false);
  assert.equal(isValueAllowed('00:30', { type: 'time', min: '21:00', max: '03:00' }), true);
  assert.equal(isValueAllowed('12:30', { type: 'time', min: '21:00', max: '03:00' }), false);
  const options = { type: 'instant', timeZone: 'America/New_York', min: '2026-10-30T09:00-04:00', max: '2026-10-30T17:00-04:00', disabledDates: ['2026-10-31'] };
  assert.equal(isValueAllowed('2026-10-30T13:00:00Z', options), true);
  assert.equal(isValueAllowed('2026-10-30T12:59:59Z', options), false);
  assert.equal(isValueAllowed('2026-10-31T01:00:00Z', { ...options, max: '' }), true);
  assert.equal(isValueAllowed('2026-10-31T04:00:00Z', { ...options, max: '' }), false);
});

test('calendar rows include leap days and obey the explicit week start', () => {
  const grid = monthGrid('2024-02', { locale: 'en-GB', weekStartsOn: 1 });
  assert.equal(grid.length, 6);
  assert.equal(grid[0].length, 7);
  assert.equal(grid[0][0].value, '2024-01-29');
  assert.equal(grid.flat().find(day => day.value === '2024-02-29').outside, false);
  assert.equal(monthGrid('2026-10', { locale: 'en-US', weekStartsOn: 7 })[0][0].value, '2026-09-27');
});
