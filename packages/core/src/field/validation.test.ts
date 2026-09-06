import { describe, expect, it } from 'vitest';
import { validateField, formatEditingValue } from './validation';

describe('field validation and transformation boundary', () => {
  it('retains declined formatting and maps a selection without deleting input', () => {
    expect(formatEditingValue('123', { start: 1, end: 2 }, () => undefined))
      .toEqual({ display: '123', selection: { start: 1, end: 2 } });
    expect(formatEditingValue('1234', { start: 2, end: 4 }, () => ({
      display: '12 34', selection: { start: 2, end: 5 },
    }))).toEqual({ display: '12 34', selection: { start: 2, end: 5 } });
    expect(formatEditingValue('+44 ext 2', { start: 9, end: 9 }, () => ({
      display: '442', selection: { start: 3, end: 3 },
    })).display).toBe('+44 ext 2');
  });

  it('supports Standard Schema transformed output and structured issue paths', async () => {
    const signal = new AbortController().signal;
    const result = await validateField({ raw: '  Ada ', value: null, context: null, signal }, {
      schema: { '~standard': { version: 1, vendor: 'test', validate: async value => ({ value: String(value).trim() }) } },
      normalize: value => String(value).toUpperCase(),
    });
    expect(result).toEqual({ output: 'ADA', issues: [] });
    const issues = [{ message: 'Required', path: ['contact', { key: 'name' }] }];
    expect((await validateField({ raw: '', value: null, context: null, signal }, {
      schema: { '~standard': { version: 1, vendor: 'test', validate: () => ({ issues }) } },
    })).issues).toEqual(issues);
  });

  it('keeps warnings nonblocking and merges external server issues', async () => {
    const result = await validateField({ raw: 'x', value: null, context: null, signal: new AbortController().signal }, {
      validator: () => ({ issues: [{ message: 'Unusual', severity: 'warning' }] }),
      issues: [{ message: 'Already used', path: ['name'], severity: 'error' }],
    });
    expect(result.issues).toHaveLength(2);
  });
});

it('declines nonfinite mappings and preserves arbitrary Unicode text', () => {
  expect(formatEditingValue('😀', { start: 2, end: 2 }, () => ({ display: '😀 ', selection: { start: 2, end: 2 } })).display).toBe('😀 ');
  expect(formatEditingValue('raw', { start: 1, end: 1 }, () => ({ display: 'raw ', selection: { start: NaN, end: 2 } })).display).toBe('raw');
});
