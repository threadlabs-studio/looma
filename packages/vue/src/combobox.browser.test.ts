import { userEvent } from '@vitest/browser/context';
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h, nextTick, ref, type App } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { Combobox } from './index';
import type { ComboboxConfig } from '@threadlabs/looma-core';
const apps: App[] = [];
const flush = async () => { await nextTick(); for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame); };
afterEach(() => { apps.splice(0).forEach(app => app.unmount()); document.body.innerHTML = ''; });
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
