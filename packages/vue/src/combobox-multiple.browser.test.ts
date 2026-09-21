import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, ref, type App } from 'vue';
import { Combobox } from './index';

const apps: App[] = [];
const flush = async () => { for (let index = 0; index < 4; index += 1) await new Promise(requestAnimationFrame); };
afterEach(() => { apps.splice(0).forEach(app => app.unmount()); document.body.innerHTML = ''; });

it('binds structured values and maps controlled multiple-item events', async () => {
  const items = ref([{ id: 'research', value: 'research', label: 'Research', metadata: { color: 'violet' } }]);
  const query = ref('');
  const options = [{ id: 'planning', value: 'planning', label: 'Planning', metadata: { color: 'sky' } }];
  const onRemove = vi.fn();
  const onCreate = vi.fn();
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(Combobox, { label: 'Page tags', multiple: true, modelValue: items.value, query: query.value, 'onUpdate:query': (value: string) => { query.value = value; }, config: { options, allowCreate: true }, tokenSeparators: [','], onRemoveItem: onRemove, onCreateItem: onCreate }),
  });
  apps.push(app);
  app.mount(host);
  await flush();

  const field = host.querySelector<HTMLElement & { value: unknown; config: unknown; tokenSeparators: unknown }>('[data-component-root~="ui-combobox"]')!;
  expect(field.value).toEqual(items.value);
  expect(field.config).toMatchObject({ allowCreate: true });
  expect(field.tokenSeparators).toEqual([',']);
  expect(field.querySelector('[part="item"]')?.textContent).toContain('Research');
  field.dispatchEvent(new CustomEvent('remove-item', { detail: { item: items.value[0], index: 0, trigger: 'keyboard' } }));
  field.dispatchEvent(new CustomEvent('create-item', { detail: { query: 'Arbitrary', trigger: 'keyboard' } }));
  expect(onRemove).toHaveBeenCalledOnce();
  expect(onCreate).toHaveBeenCalledOnce();

  const input = field.querySelector<HTMLInputElement>('[role="combobox"]')!;
  input.focus();
  input.value = 'Typed';
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'Typed' }));
  await flush();
  expect(query.value).toBe('Typed');
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ',' }));
  expect(onCreate).toHaveBeenLastCalledWith({ query: 'Typed', trigger: 'keyboard' });
});

it('keeps a selected item inside the width bound', async () => {
  const label = 'A custom selected value that must not take over the whole editing control';
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(Combobox, {
      label: 'Page tags',
      multiple: true,
      modelValue: [{ id: 'long-value', value: 'long-value', label }],
      config: { options: [] },
    }),
  });
  apps.push(app);
  app.mount(host);
  await flush();

  const field = host.querySelector('[data-component-root~="ui-combobox"]')!;
  await expect.poll(() => field.querySelector('[part="item"]')).toBeTruthy();
  const item = field.querySelector<HTMLElement>('[part="item"]')!;
  expect(item.textContent).toContain(label);
  expect(item.getBoundingClientRect().width).toBeLessThanOrEqual(193);
});
