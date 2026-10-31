import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeOptions } from '../../packages/looma/src/components/ui-time-picker/time-options.js';

test('overnight choices disable unavailable hours and minutes without altering the current parts', () => {
  const choices = timeOptions('03:15', { min: '21:00', max: '03:00' });
  assert.deepEqual(choices.hours.filter(choice => !choice.disabled).map(choice => choice.value), ['0', '1', '2', '3', '21', '22', '23']);
  assert.deepEqual(choices.minutes.filter(choice => !choice.disabled).map(choice => choice.value), ['0']);
  assert.equal(choices.hours[12].disabled, true);
});

test('minute choices do not silently round a bound with seconds', () => {
  const bounds = { min: '09:30:01', max: '09:30:59' };
  assert.equal(timeOptions('09:30', bounds).hours.every(choice => choice.disabled), true);
  const choices = timeOptions('09:30', { ...bounds, showSeconds: true });
  assert.deepEqual(choices.hours.filter(choice => !choice.disabled).map(choice => choice.value), ['9']);
  assert.deepEqual(choices.minutes.filter(choice => !choice.disabled).map(choice => choice.value), ['30']);
  assert.equal(choices.seconds[0].disabled, true);
  assert.equal(choices.seconds[1].disabled, false);
  assert.equal(choices.seconds[59].disabled, false);
});

test('retained fractions participate in inclusive bounds at nanosecond precision', () => {
  const choices = timeOptions('14:30:45.123456789', { min: '14:30:45.123456789', max: '14:30:45.123456789', showSeconds: true });
  assert.deepEqual(choices.hours.filter(choice => !choice.disabled).map(choice => choice.value), ['14']);
  assert.deepEqual(choices.minutes.filter(choice => !choice.disabled).map(choice => choice.value), ['30']);
  assert.deepEqual(choices.seconds.filter(choice => !choice.disabled).map(choice => choice.value), ['45']);
  assert.equal(timeOptions('14:30:45.123456788', { min: '14:30:45.123456789', max: '14:30:45.123456789', showSeconds: true }).hours.every(choice => choice.disabled), true);
  assert.throws(() => timeOptions('14:30', { min: '23:59:60' }));
  assert.throws(() => timeOptions('23:59:60'));
});
