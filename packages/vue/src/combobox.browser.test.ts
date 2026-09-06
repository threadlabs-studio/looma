import { userEvent } from '@vitest/browser/context';
import { afterEach, expect, it, vi } from 'vitest';
import { computed, createApp, createSSRApp, h, nextTick, ref, type App } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Combobox } from './index';
import type { ComboboxConfig, ComboboxValidationState } from '@threadlabs/looma-core';
type ComboboxElement = HTMLElement & { validate(): Promise<ComboboxValidationState> };
const apps: App[] = [];
const flush = async () => { await nextTick(); for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); };
afterEach(() => { apps.splice(0).forEach(app => app.unmount()); document.body.innerHTML = ''; });

for (const provider of [false, true]) {
  it.each(['selection', 'clear'])('respects value-only writable v-model rejection of %s with ' + (provider ? 'provider' : 'static') + ' labels', async kind => {
    const accepted = ref<string | null>('1');
    const proposed = vi.fn();
    const model = computed({ get: () => accepted.value, set: proposed });
    const options = [{ id: 'a', value: '1', label: 'Alpha' }, { id: 'b', value: '2', label: 'Beta' }];
    const config: ComboboxConfig = { ...(provider ? { provider: () => options, debounce: 0 } : { options }), normalize: (_raw, request) => request.value };
    const host = document.createElement('div'); document.body.append(host);
    const app = createApp({ render: () => h(Combobox, { label: 'Name', modelValue: model.value,
      'onUpdate:modelValue': (next: string | null) => { model.value = next; }, config, disclosure: true, clearable: true, required: true }) });
    apps.push(app); app.mount(host); await flush();
    const field = host.querySelector<ComboboxElement>('ui-combobox')!;
    await expect.poll(() => field.shadowRoot?.querySelector('button:last-child')).toBeTruthy();
    const root = field.shadowRoot!; const input = root.querySelector('input')!;
    await userEvent.click(root.querySelector('button:last-child')!); await flush();
    await expect.poll(() => input.value).toBe('Alpha');
    if (kind === 'selection') await userEvent.click(root.querySelectorAll('[role="option"]')[1]!);
    else await userEvent.click(root.querySelector('button')!);
    await flush();
    expect(proposed).toHaveBeenCalledWith(kind === 'selection' ? '2' : null);
    expect(input.value).toBe('Alpha'); expect(model.value).toBe('1');
    expect((await field.validate()).output).toBe('1');
  });
}

it('reconciles query-only v-model external replacements and clears after accepted selection echoes', async () => {
  const query = ref('');
  const config: ComboboxConfig = { normalize: (_raw, request) => request.value, options: [{ id: 'a', value: '1', label: 'Alpha' }] };
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Combobox, { label: 'Name', query: query.value,
    'onUpdate:query': (next: string) => { query.value = next; }, config, disclosure: true, required: true }) });
  apps.push(app); app.mount(host); await flush();
  const field = host.querySelector<ComboboxElement>('ui-combobox')!;
  await expect.poll(() => field.shadowRoot?.querySelector('button')).toBeTruthy();
  const root = field.shadowRoot!; const input = root.querySelector('input')!;
  for (const replacement of ['Replacement', '']) {
    await userEvent.click(root.querySelector('button')!); await flush();
    await userEvent.click(root.querySelector('[role="option"]')!); await flush();
    expect(query.value).toBe('Alpha'); expect((await field.validate()).output).toBe('1');
    query.value = replacement; await flush(); expect(input.value).toBe(replacement);
    expect(field.dataset.validation).toBe('pristine');
    const result = await field.validate(); expect(result.status).toBe('error'); expect(result.output).toBeUndefined();
  }
});
it('hydrates controlled query and selection, updates rich rows and dependency context', async () => {
  const query = ref('Initial');
  const value = ref<string | null>(null);
  const config = ref<ComboboxConfig>({ context: 'one', allowFreeText: true, options: [{ id: 'a', value: '1', label: 'Alpha', description: 'Available' }] });
  const invalidation = vi.fn();
  const view = () => h(Combobox, { label: 'Destination', query: query.value, modelValue: value.value, config: config.value, disclosure: true,
    'onUpdate:query': (next: string) => { query.value = next; }, 'onUpdate:modelValue': (next: string | null) => { value.value = next; }, onDependencyInvalidate: invalidation,
  }, { option: ({ option }: { option: { label: string } }) => h('span', `Rich ${option.label}`) });
  const host = document.createElement('div');
  host.innerHTML = await renderToString(createSSRApp({ render: view }));
  expect(host.querySelector('input')?.value).toBe('Initial');
  expect(host.querySelector('label')?.textContent).toBe('Destination');
  document.body.append(host);
  const app = createSSRApp({ render: view }); apps.push(app); app.mount(host);
  await flush();
  const field = host.querySelector('ui-combobox')!;
  await expect.poll(() => field.shadowRoot?.querySelector('input')).toBeTruthy();
  const input = field.shadowRoot!.querySelector('input')!;
  expect(input.value).toBe('Initial');
  await userEvent.fill(input, 'Al'); await flush(); expect(query.value).toBe('Al');
  expect(field.querySelector('[slot="option-a"]')?.textContent).toBe('Rich Alpha');
  await userEvent.keyboard('{ArrowDown}{Enter}'); await flush();
  expect(value.value).toBe('1'); expect(query.value).toBe('Alpha'); expect(input.value).toBe('Alpha');
  query.value = 'External'; await flush(); expect(input.value).toBe('External');
  invalidation.mockClear(); // Measure this dependency replacement, independently of hydration/upgrade order.
  config.value = { ...config.value, context: 'two' }; await flush();
  expect(value.value).toBe(null); expect(query.value).toBe('External'); expect(invalidation).toHaveBeenCalledOnce();
});
it('preserves uncontrolled editing across unrelated Vue updates', async () => {
  const label = ref('Name'); const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Combobox, { label: label.value, defaultQuery: 'Start', config: { allowFreeText: true } }) });
  apps.push(app); app.mount(host); await flush();
  await expect.poll(() => host.querySelector('ui-combobox')!.shadowRoot?.querySelector('input')).toBeTruthy();
  const input = host.querySelector('ui-combobox')!.shadowRoot!.querySelector('input')!;
  await userEvent.fill(input, 'Typed'); label.value = 'Full name'; await flush(); expect(input.value).toBe('Typed');
});

it('reacts to canonical-only ownership, provider labels, external clears and selection echoes', async () => {
  const value = ref<string | null>('1'); const label = ref('Name');
  const config: ComboboxConfig = { debounce: 0, provider: () => [{ id: 'a', value: '1', label: 'Alpha' }, { id: 'b', value: '2', label: 'Beta' }] };
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Combobox, { label: label.value, modelValue: value.value, config, disclosure: true,
    'onUpdate:modelValue': (next: string | null) => { value.value = next; },
  }) });
  apps.push(app); app.mount(host); await flush();
  const root = host.querySelector('ui-combobox')!.shadowRoot!; const input = root.querySelector('input')!;
  expect(input.value).toBe('1');
  await userEvent.click(root.querySelector('button')!); await flush();
  await expect.poll(() => input.value).toBe('Alpha');
  await userEvent.keyboard('{Escape}');
  value.value = '2'; await flush(); expect(input.value).toBe('Beta');
  value.value = null; await flush(); expect(input.value).toBe('');
  await userEvent.click(root.querySelector('button')!); await flush();
  await userEvent.keyboard('{ArrowDown}{Enter}'); await flush(); expect(value.value).toBe('1'); expect(input.value).toBe('Alpha');
  await userEvent.fill(input, 'Native edit'); await flush(); expect(value.value).toBe(null); expect(input.value).toBe('Native edit');
  label.value = 'Updated label'; await flush(); expect(input.value).toBe('Native edit');
});
