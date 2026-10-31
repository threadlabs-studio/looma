import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarModel } from '../../packages/looma/src/components/shared/calendar-model.js';

test('calendar models supply stable rows, localized headings and one available grid tab stop', () => {
  const model = calendarModel({ month: '2024-02', locale: 'en-GB', weekStartsOn: 1, value: '2024-02-29', today: '2024-02-12' });
  assert.equal(model.title, 'February 2024');
  assert.equal(model.weekStartsOn, 1);
  assert.equal(model.rows.length, 6);
  assert.equal(model.rows[0][0].value, '2024-01-29');
  assert.equal(model.weekdays[0].fullLabel, 'Monday');
  assert.deepEqual(model.weekdays.map(day => day.label), ['M', 'T', 'W', 'Th', 'F', 'S', 'Su']);
  assert.equal(model.focusDate, '2024-02-29');
  assert.equal(model.rows.flat().filter(cell => cell.tabIndex === 0).length, 1);
  assert.equal(model.rows.flat().find(cell => cell.value === '2024-02-12').today, true);
  assert.equal(model.rows.flat().find(cell => cell.value === '2024-02-29').selected, true);
  assert.equal(model.previousMonth, '2024-01');
  assert.equal(model.nextMonth, '2024-03');
});

test('locale week order is the default, with explicit Sunday, Saturday and Monday overrides', () => {
  for (const [locale, first] of [['en-US', 7], ['en-GB', 1], ['ar-EG', 6], ['dv-MV', 5]]) {
    const model = calendarModel({ month: '2026-10', locale });
    assert.equal(model.weekStartsOn, first);
    assert.equal(model.weekdays[0].day, first);
    assert.equal(model.weekdays.at(-1).day, (first + 5) % 7 + 1);
    assert.deepEqual(model.weekendColumns.map(column => model.weekdays[column - 1].day).sort(), [6, 7]);
  }
  for (const [first, last] of [[7, 6], [6, 5], [1, 7]]) {
    const model = calendarModel({ month: '2026-10', locale: 'en-GB', weekStartsOn: first });
    assert.equal(model.weekdays[0].day, first);
    assert.equal(model.weekdays.at(-1).day, last);
  }
  assert.throws(() => calendarModel({ month: '2026-10', weekStartsOn: 0 }));
});

test('availability wins over selected and focused values without erasing selection identity', () => {
  const model = calendarModel({ month: '2026-10', value: '2026-10-12', focusedDate: '2026-10-12', min: '2026-10-10', disabledDates: ['2026-10-12'] });
  assert.equal(model.focusDate, '2026-10-10');
  const selected = model.rows.flat().find(cell => cell.value === '2026-10-12');
  assert.equal(selected.selected, true);
  assert.equal(selected.disabled, true);
  assert.equal(selected.tabIndex, -1);
  const empty = calendarModel({ month: '2026-10', allowedDates: [] });
  assert.equal(empty.empty, true);
  assert.equal(empty.focusDate, '');
  assert.equal(empty.rows.flat().filter(cell => cell.tabIndex === 0).length, 0);
});

test('range identity includes both endpoints and continues across the visible month edges', () => {
  const model = calendarModel({ month: '2026-10', start: '2026-09-30', end: '2026-10-03' });
  for (const date of ['2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03']) assert.equal(model.rows.flat().find(cell => cell.value === date).inRange, true);
  assert.equal(model.rows.flat().find(cell => cell.value === '2026-09-30').rangeStart, true);
  assert.equal(model.rows.flat().find(cell => cell.value === '2026-10-03').rangeEnd, true);
  assert.throws(() => calendarModel({ month: '2026-10', start: '2026-10-03', end: '2026-10-01' }));
});

test('month and year navigation reflect bounds while leaving empty months navigable', () => {
  const model = calendarModel({ month: '2026-10', min: '2026-03-10', max: '2027-02-20', allowedDates: ['2026-10-30'], yearPageStart: 2020 });
  assert.equal(model.months.length, 12);
  assert.equal(model.months[1].outsideBounds, true);
  assert.equal(model.months[2].outsideBounds, false);
  assert.equal(model.months[9].current, true);
  assert.equal(model.months[10].outsideBounds, false);
  assert.equal(model.months[9].disabled, false);
  assert.equal(model.months[10].disabled, true);
  assert.equal(model.years.length, 12);
  assert.equal(model.years.find(year => year.value === 2025).outsideBounds, true);
  assert.equal(model.years.find(year => year.value === 2026).current, true);
  assert.equal(model.years.find(year => year.value === 2027).outsideBounds, false);
  assert.equal(model.years.find(year => year.value === 2026).disabled, false);
  assert.equal(model.years.find(year => year.value === 2027).disabled, true);
  assert.equal(model.years.find(year => year.value === 2028).outsideBounds, true);
});

test('week starts and localized weekday names remain independent of cell identity', () => {
  const model = calendarModel({ month: '2026-10', locale: 'ar-EG', weekStartsOn: 6 });
  assert.equal(model.weekdays[0].day, 6);
  assert.equal(model.rows[0][0].value, '2026-09-26');
  assert.equal(model.rows[0][0].label, new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', calendar: 'gregory', timeZone: 'UTC' }).format(new Date('2026-09-26T12:00Z')));
  assert.throws(() => calendarModel({ month: '2026-10', weekStartsOn: 0 }));
  assert.throws(() => calendarModel({ month: '2026-13' }));
  assert.throws(() => calendarModel({ month: '2026-10', yearPageStart: -1 }));
});

test('calendar navigation does not expose years outside its four-digit native date domain', () => {
  const earliest = calendarModel({ month: '0001-01' });
  assert.equal(earliest.previousMonth, '');
  assert.equal(earliest.years[0].value, 1);
  assert.equal(earliest.rows.flat().filter(cell => cell.value.startsWith('0000-')).every(cell => cell.disabled), true);
  const latest = calendarModel({ month: '9999-12' });
  assert.equal(latest.nextMonth, '');
  assert.equal(latest.years.at(-1).value, 9999);
  assert.equal(latest.rows.flat().filter(cell => cell.value.startsWith('+010000-')).every(cell => cell.disabled), true);
});
