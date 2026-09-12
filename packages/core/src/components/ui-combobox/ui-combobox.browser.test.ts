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

it('supports an inline start adornment, popup footer, hidden visual label and imperative focus', async () => {
  document.body.innerHTML = `<ui-combobox label="Page tags" label-visibility="sr-only">
    <span slot="start">Research</span>
    <span slot="footer">Palette</span>
  </ui-combobox>`;
  const field = document.querySelector('ui-combobox') as HTMLUIComboboxElement & { focusInput(): Promise<void> };
  field.config = { options: [{ id: 'planning', value: 'planning', label: 'Planning' }] };
  await flush();
  const root = field.shadowRoot!;
  expect(root.querySelector('slot[name="start"]')).toBeTruthy();
  expect(root.querySelector('label')?.classList.contains('sr-only')).toBe(true);
  await field.focusInput();
  expect(root.activeElement).toBe(root.querySelector('input'));
  await userEvent.fill(root.querySelector('input')!, 'Plan');
  await flush();
  expect(root.querySelector('slot[name="footer"]')).toBeTruthy();
});

const mount = async (config: import('../../field/combobox').ComboboxConfig = {}, attrs = '') => {
  document.body.innerHTML = `<main id="qualification-surface" style="background:var(--ui-surface-default);color:var(--ui-text-primary);padding:1rem"><ui-combobox label="Name" ${attrs}></ui-combobox><button id="after">After</button></main>`;
  const field = document.querySelector('ui-combobox') as HTMLUIComboboxElement;
  field.config = config;
  await flush();
  return { field, input: field.shadowRoot!.querySelector('input')!, root: field.shadowRoot! };
};

it.each(['Replacement', ''])('reconciles query-only replacement %j', async query => {
  const { field, input, root } = await mount({ normalize: (_raw, request) => request.value, options: [{ id: 'a', value: '1', label: 'Alpha' }] }, 'query="Alpha" default-value="1" disclosure required');
  expect((await field.validate()).output).toBe('1');
  field.query = query; await flush();
  expect(input.value).toBe(query);
  expect(field.dataset.validation).toBe('pristine');
  const result = await field.validate();
  expect(result.status).toBe('error'); expect(result.output).toBeUndefined();
  await userEvent.click(root.querySelector('button')!); await flush();
  expect(root.querySelector('[role="option"]')?.getAttribute('aria-selected')).toBe('false');
});

for (const provider of [false, true]) {
  it.each(['selection', 'clear'])('restores rejected %s with ' + (provider ? 'provider' : 'static') + ' labels', async kind => {
    const options = [{ id: 'a', value: '1', label: 'Alpha' }, { id: 'b', value: '2', label: 'Beta' }];
    const { field, input, root } = await mount({ ...(provider ? { provider: () => options, debounce: 0 } : { options }), normalize: (_raw, request) => request.value }, 'value="1" disclosure clearable required');
    await userEvent.click(root.querySelector('button:last-child')!); await flush();
    await expect.poll(() => input.value).toBe('Alpha');
    expect((await field.validate()).output).toBe('1');
    if (kind === 'selection') await userEvent.click(root.querySelectorAll('[role="option"]')[1]);
    else await userEvent.click(root.querySelector('button')!);
    await flush();
    expect(field.value).toBe('1'); expect(input.value).toBe('Alpha');
    const result = await field.validate();
    expect(result.status).toBe('valid'); expect(result.output).toBe('1');
  });
}

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

it('restores lookup, validation and anchored positioning after repeated remove/reinsert', async () => {
  const { field, input, root } = await mount({ provider: () => [{ id: 'a', value: 'a', label: 'Alpha' }], debounce: 0 }, 'disclosure');
  const parent = field.parentElement!;
  for (let cycle = 0; cycle < 3; cycle++) {
    await userEvent.click(root.querySelector('button')!); await flush();
    await expect.poll(() => root.querySelectorAll('[role="option"]').length).toBe(1);
    field.remove(); await flush();
    parent.style.paddingLeft = `${(cycle + 1) * 20}px`;
    parent.prepend(field); await flush();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(root.querySelector('button')!); await flush();
    await expect.poll(() => root.querySelectorAll('[role="option"]').length).toBe(1);
    const popup = root.querySelector<HTMLElement>('.popup')!;
    const anchor = root.querySelector<HTMLElement>('.field')!.getBoundingClientRect();
    expect(popup.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(Math.abs(popup.getBoundingClientRect().left - anchor.left)).toBeLessThan(2);
    await userEvent.keyboard('{ArrowDown}{Enter}'); await flush();
    expect(input.value).toBe('Alpha');
    expect((await field.validate()).status).toBe('valid');
  }
});

it('syncs canonical replacements and clears without taking controlled query ownership', async () => {
  const { field, input } = await mount({ options: [{ id: 'a', value: '1', label: 'Alpha' }, { id: 'b', value: '2', label: 'Beta' }] });
  field.value = '1'; await flush(); expect(input.value).toBe('Alpha');
  field.value = '2'; await flush(); expect(input.value).toBe('Beta');
  field.value = null; await flush(); expect(input.value).toBe('');
  field.query = 'Owned query'; await flush();
  field.value = '1'; await flush(); expect(input.value).toBe('Owned query');
  field.value = null; await flush(); expect(input.value).toBe('Owned query');
});

it('syncs provider-backed labels and safely displays an unknown canonical value until results arrive', async () => {
  const { field, input, root } = await mount({ provider: () => [{ id: 'a', value: '1', label: 'Alpha' }, { id: 'b', value: '2', label: 'Beta' }], debounce: 0 }, 'disclosure');
  field.value = '1'; await flush(); expect(input.value).toBe('1');
  await userEvent.click(root.querySelector('button')!); await flush();
  await expect.poll(() => input.value).toBe('Alpha');
  await userEvent.keyboard('{Escape}');
  field.value = '2'; await flush(); expect(input.value).toBe('Beta');
  field.value = null; await flush(); expect(input.value).toBe('');
});

it.each(['static', 'provider'])('refreshes an uncontrolled selected label when %s options are replaced', async source => {
  const first = [{ id: 'a', value: '1', label: 'Alpha' }];
  const second = [{ id: 'a', value: '1', label: 'Uno' }];
  const { field, input, root } = await mount(source === 'static'
    ? { options: first }
    : { provider: () => first, debounce: 0 }, 'value="1" disclosure');
  await userEvent.click(root.querySelector('button')!); await flush();
  await expect.poll(() => input.value).toBe('Alpha');
  await userEvent.keyboard('{Escape}');
  field.config = source === 'static'
    ? { options: second }
    : { provider: () => second, debounce: 0 };
  await flush();
  await userEvent.click(root.querySelector('button')!); await flush();
  await expect.poll(() => input.value).toBe('Uno');
});

it('keeps formatted text and display-coordinate selections stable through unchanged focus/blur cycles', async () => {
  const { input } = await mount({ allowFreeText: true, format: (raw, selection) => ({ display: `${raw.slice(0, 2)} ${raw.slice(2)}`, selection: { start: selection.start + (selection.start > 2 ? 1 : 0), end: selection.end + (selection.end > 2 ? 1 : 0), direction: selection.direction } }) });
  input.focus(); input.value = '1234'; input.setSelectionRange(2, 4, 'backward');
  input.dispatchEvent(new InputEvent('input', { bubbles: true }));
  document.getElementById('after')!.focus(); await flush();
  expect(input.value).toBe('12 34');
  expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([2, 5, 'backward']);
  for (const [start, end] of [[5, 5], [1, 4], [0, 5]]) {
    for (let cycle = 0; cycle < 3; cycle++) {
      input.focus(); input.setSelectionRange(start, end, 'backward');
      document.getElementById('after')!.focus(); await flush();
      expect(input.value).toBe('12 34');
      expect([input.selectionStart, input.selectionEnd]).toEqual([start, end]);
      if (start !== end) expect(input.selectionDirection).toBe('backward');
    }
  }
  input.focus(); await userEvent.fill(input, '5678');
  document.getElementById('after')!.focus(); await flush(); expect(input.value).toBe('56 78');
});

it('preserves formatted editing and caret when a controlled owner echoes the edit clear', async () => {
  const { field, input } = await mount({ options: [{ id: 'a', value: '1', label: 'Alpha' }], formatOn: 'input', format: (raw, selection) => ({ display: `${raw} `, selection }) });
  field.value = '1'; await flush();
  field.addEventListener('value-change', event => { field.value = event.detail.value; });
  input.focus(); input.value = '1234'; input.setSelectionRange(1, 3, 'backward');
  input.dispatchEvent(new InputEvent('input', { bubbles: true })); await flush();
  expect(field.value).toBe(null); expect(input.value).toBe('1234 ');
  expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([1, 3, 'backward']);
});
