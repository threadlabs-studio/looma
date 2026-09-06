import axe from 'axe-core';
import '../../../../tokens/src/tokens.css';
import '../../../../tokens/src/theme-light.css';
import '../../../../tokens/src/theme-dark.css';
import '../../../../tokens/src/theme-high-contrast.css';
import { userEvent } from '@vitest/browser/context';
import { afterEach, expect, it } from 'vitest';

const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame); };
afterEach(() => { document.body.innerHTML = ''; });
it('keeps editing focus while navigating a labeled listbox and selecting an option', async () => {
  document.body.innerHTML = '<ui-combobox label="Destination" disclosure help="Choose a destination."></ui-combobox>';
  const field = document.querySelector('ui-combobox') as HTMLElement & { config: unknown };
  field.config = { options: [{ id: 'a', value: 'a', label: 'Alpha' }, { id: 'b', value: 'b', label: 'Beta', disabled: true }, { id: 'c', value: 'c', label: 'Gamma' }] };
  await flush();
  const input = field.shadowRoot?.querySelector('input');
  expect(input).toBeTruthy();
  await userEvent.click(input!);
  await userEvent.keyboard('{ArrowDown}');
  await flush();
  expect(input!.getAttribute('role')).toBe('combobox');
  expect(input!.getAttribute('aria-expanded')).toBe('true');
  await userEvent.keyboard('{ArrowDown}{Enter}');
  await flush();
  expect(input!.value).toBe('Gamma');
  expect(field.shadowRoot!.activeElement).toBe(input);
  expect(input!.getAttribute('aria-expanded')).toBe('false');
});

const mount = async (config: import('../../field/combobox').ComboboxConfig = {}, attrs = '') => {
  document.body.innerHTML = `<main id="qualification-surface" style="background:var(--ui-surface-default);color:var(--ui-text-primary);padding:1rem"><ui-combobox label="Name" ${attrs}></ui-combobox><button id="after">After</button></main>`;
  const field = document.querySelector('ui-combobox') as HTMLUIComboboxElement;
  field.config = config;
  await flush();
  return { field, input: field.shadowRoot!.querySelector('input')!, root: field.shadowRoot! };
};

it('opens the full set with disclosure without replacing editing text; Home/End and Escape are predictable', async () => {
  const { input, root } = await mount({ options: [{ id: 'a', value: 'a', label: 'Alpha' }, { id: 'b', value: 'b', label: 'Beta' }] }, 'disclosure default-query="Original"');
  await userEvent.click(root.querySelector('button')!); await flush();
  expect(input.value).toBe('Original'); expect(root.querySelectorAll('[role="option"]')).toHaveLength(2);
  await userEvent.keyboard('{ArrowDown}{End}'); await flush(); expect(input.getAttribute('aria-activedescendant')).toBe('option-1');
  await userEvent.keyboard('{Home}'); await flush(); expect(input.getAttribute('aria-activedescendant')).toBe('option-0');
  await userEvent.keyboard('{Escape}'); await flush(); expect(input.value).toBe('Original'); expect(input.getAttribute('aria-expanded')).toBe('false');
  input.setSelectionRange(3, 3); await userEvent.keyboard('{Home}'); expect(input.selectionStart).toBe(0);
});

it('debounces and aborts providers, ignores stale success and error, and exposes empty/loading/error states', async () => {
  const calls: Array<{ signal: AbortSignal; query: string; resolve: (rows: readonly import('../../field/combobox').ComboboxOption[]) => void; reject: (error: Error) => void }> = [];
  const { input, root } = await mount({ debounce: 20, provider: request => new Promise((resolve, reject) => calls.push({ ...request, resolve, reject })) });
  await userEvent.fill(input, 'a'); await flush();
  await expect.poll(() => calls.length).toBe(1); expect(root.textContent).toContain('Loading suggestions');
  await userEvent.fill(input, 'ab'); await expect.poll(() => calls.length).toBe(2); expect(calls[0].signal.aborted).toBe(true);
  calls[1].resolve([{ id: 'b', value: 'b', label: 'Current' }]); await flush();
  calls[0].resolve([{ id: 'a', value: 'a', label: 'Stale' }]); await flush();
  expect(root.querySelector('[role="option"]')?.textContent).toBe('Current');
  await userEvent.fill(input, 'none'); await expect.poll(() => calls.length).toBe(3); calls[2].resolve([]); await flush(); expect(root.textContent).toContain('No suggestions.');
  await userEvent.fill(input, 'error'); await expect.poll(() => calls.length).toBe(4); calls[3].reject(new Error('Try again')); await flush(); expect(root.textContent).toContain('Try again');
  await userEvent.fill(input, 'cancel'); await expect.poll(() => calls.length).toBe(5);
  await userEvent.keyboard('{Escape}'); expect(calls[4].signal.aborted).toBe(true);
  calls[4].reject(new Error('Late error')); await flush(); expect(root.textContent).not.toContain('Late error');
});

it('supports grouped rich options, pointer/touch selection, clear, create and free entry', async () => {
  const { field, input, root } = await mount({ allowCreate: true, allowFreeText: true, options: [{ id: 'a', value: 'a', label: 'Alpha', group: 'Group', description: 'Metadata' }] }, 'clearable');
  const events: string[] = []; field.addEventListener('value-change', (event: CustomEvent) => events.push(event.detail.kind));
  await userEvent.fill(input, 'Al'); await flush(); expect(root.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Group');
  const row = root.querySelector<HTMLElement>('[role="option"]')!;
  row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' })); row.click(); await flush(); expect(input.value).toBe('Alpha');
  await userEvent.click(root.querySelector('button')!); await flush(); expect(input.value).toBe('');
  await userEvent.fill(input, 'Novel'); await userEvent.keyboard('{ArrowDown}{Enter}'); await flush(); expect(events).toContain('create'); expect(input.value).toBe('Novel');
  await userEvent.fill(input, '+44 ext 2'); await userEvent.keyboard('{Enter}'); await flush(); expect(events).toContain('free-entry'); expect(input.value).toBe('+44 ext 2');
});

it('preserves transform timing and selection, declined free text, and native composition', async () => {
  const formatter: import('../../field/validation').FieldFormatter = (raw, selection) => /^\d{4}$/.test(raw) ? { display: `${raw.slice(0, 2)} ${raw.slice(2)}`, selection: { start: selection.start + (selection.start > 2 ? 1 : 0), end: selection.end + (selection.end > 2 ? 1 : 0) } } : undefined;
  const { field, input } = await mount({ allowFreeText: true, format: formatter, formatOn: 'input' });
  input.focus(); input.value = '1234'; input.setSelectionRange(2, 4); input.dispatchEvent(new InputEvent('input', { bubbles: true })); await flush();
  expect(input.value).toBe('12 34'); expect(input.selectionStart).toBe(2); expect(input.selectionEnd).toBe(5);
  await userEvent.fill(input, '+44 (0) x/ext 2'); expect(input.value).toBe('+44 (0) x/ext 2');
  field.config = { allowFreeText: true, format: formatter, formatOn: 'blur' }; await flush();
  await userEvent.fill(input, '1234'); expect(input.value).toBe('1234'); await userEvent.tab(); await flush(); expect(input.value).toBe('12 34');
  input.focus(); input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); input.value = '仮'; input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true })); await flush(); expect(input.value).toBe('仮');
  input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); await flush(); expect(input.value).toBe('仮');
});

it('announces pending/warning/error validation, cancels stale validation and respects disabled/read-only fields', async () => {
  let resolve!: (value: { issues: { message: string; severity: 'warning' }[] }) => void;
  const { field, input, root } = await mount({ allowFreeText: true, validateOn: 'input', validator: () => new Promise(done => { resolve = done; }) }, 'help="Optional guidance"');
  await userEvent.fill(input, 'a'); await flush(); expect(root.textContent).toContain('Checking value'); expect(input.getAttribute('aria-invalid')).toBe('false');
  resolve({ issues: [{ message: 'Unusual value', severity: 'warning' }] }); await flush(); expect(input.getAttribute('aria-invalid')).toBe('false'); expect(root.querySelector('#validation')?.textContent).toBe('Unusual value');
  field.config = { allowFreeText: true, issues: [{ message: 'Server rejected', path: ['name'] }] }; await flush(); expect(input.getAttribute('aria-invalid')).toBe('true'); expect(input.getAttribute('aria-describedby')).toContain('validation');
  const help = root.querySelector<HTMLButtonElement>('#help')!; await userEvent.click(help); await flush(); expect(root.querySelector('ui-tooltip')?.hidden).toBe(false);
  await userEvent.click(help); await flush(); expect(root.querySelector('ui-tooltip')?.hidden).toBe(true);
  await userEvent.click(help); await flush(); expect(root.querySelector('ui-tooltip')?.hidden).toBe(false);
  await userEvent.keyboard('{Escape}'); await flush(); expect(root.querySelector('ui-tooltip')?.hidden).toBe(true);
  field.readOnly = true; await flush(); expect(input.readOnly).toBe(true); await userEvent.click(input); await userEvent.keyboard('{ArrowDown}'); expect(input.getAttribute('aria-expanded')).toBe('false');
  field.disabled = true; await flush(); expect(input.disabled).toBe(true); expect(help.disabled).toBe(true);
});

for (const theme of ['light', 'dark', 'high-contrast']) {
  it(`has accessible semantics and restrained hierarchy in ${theme}`, async () => {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    document.documentElement.setAttribute('data-contrast', theme === 'high-contrast' ? 'high' : 'normal');
    const { field, input, root } = await mount({ options: [{ id: 'a', value: 'a', label: 'Alpha', description: 'Metadata' }] }, 'disclosure help="Optional guidance"');
    await userEvent.click(root.querySelector('button:last-child')!); await flush();
    const result = await axe.run(document.getElementById('qualification-surface')!, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    expect(result.violations.map(violation => `${violation.id}: ${violation.description}`)).toEqual([]);
    expect(getComputedStyle(root.querySelector('label')!).fontWeight).toBe('500');
    expect(getComputedStyle(root.querySelector('.secondary')!).fontWeight).toBe('400');
    expect(input.labels?.[0]?.textContent).toBe('Name');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-contrast');
  });
}

it('invalidates validated output on external edits and ignores stale validation after context changes', async () => {
  let finish!: (value: { output: string }) => void;
  let signal!: AbortSignal;
  const { field, input } = await mount({ allowFreeText: true, context: 'one', validator: (_value, request) => {
    signal = request.signal;
    return new Promise(resolve => { finish = resolve; });
  } });
  const states: import('../../field/combobox').ComboboxValidationState[] = [];
  field.addEventListener('validation-change', event => states.push(event.detail));
  await userEvent.fill(input, 'Draft');
  const pending = field.validate(); await flush();
  field.config = { allowFreeText: true, context: 'two' }; await flush(); expect(signal.aborted).toBe(true);
  finish({ output: 'STALE' }); await pending; await flush(); expect(states.at(-1)?.output).not.toBe('STALE');
  const result = await field.validate(); expect(result.output).toBe('Draft');
  field.config = { allowFreeText: true, context: 'two', validateOn: 'submit' }; await flush();
  expect(states.at(-1)?.status).toBe('pristine'); expect(states.at(-1)?.output).toBeUndefined();
  await field.validate();
  field.query = 'External'; await flush(); expect(states.at(-1)?.status).toBe('pristine'); expect(states.at(-1)?.output).toBeUndefined();
});
