import { describe, expect, it } from 'vitest';
import * as v from 'valibot';
import { valibotField } from './valibot';
import { validateField } from './validation';
const request = (raw: string) => ({ raw, value: null, context: null, signal: new AbortController().signal });
describe('Valibot field adapter', () => {
  it('validates and transforms synchronously through Standard Schema', async () => {
    const config = valibotField(v.pipe(v.string(), v.trim(), v.minLength(2)));
    expect(await validateField(request(' Ada '), config)).toEqual({ output: 'Ada', issues: [] });
    expect((await validateField(request('x'), config)).issues).toHaveLength(1);
  });
  it('preserves asynchronous validation and transformed outputs', async () => {
    const config = valibotField(v.pipeAsync(v.string(), v.transformAsync(async value => value.toUpperCase())));
    expect((await validateField(request('ada'), config)).output).toBe('ADA');
  });
  it('preserves multiple nested issue paths', async () => {
    const config = valibotField(v.object({ first: v.string(), second: v.string() }), { parse: () => ({ first: 1, second: false }) });
    const result = await validateField(request('x'), config);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.map(issue => issue.path)).toMatchObject([[{ key: 'first' }], [{ key: 'second' }]]);
  });
});
