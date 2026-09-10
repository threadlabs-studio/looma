import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import { MultiCombobox } from './index';

const apps: App[] = [];
const flush = async () => { await nextTick(); for (let index = 0; index < 4; index += 1) await new Promise(requestAnimationFrame); };
afterEach(() => { apps.splice(0).forEach(app => app.unmount()); document.body.innerHTML = ''; });

it('binds structured values, renders rich items, and maps tag events', async () => {
  const items = ref([{ id: 'research', value: 'research', label: 'Research', metadata: { color: 'violet' } }]);
  const options = [{ id: 'planning', value: 'planning', label: 'Planning', metadata: { color: 'sky' } }];
  const onRemove = vi.fn();
  const onCreate = vi.fn();
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(MultiCombobox, { label: 'Page tags', items: items.value, config: { options, allowCreate: true }, onRemoveItem: onRemove, onCreateItem: onCreate }, {
      item: ({ item }: { item: { label: string } }) => h('strong', `Selected ${item.label}`),
      option: ({ option }: { option: { label: string } }) => h('span', `Option ${option.label}`),
    }),
  });
  apps.push(app);
  app.mount(host);
  await flush();

  const field = host.querySelector<HTMLElement & { items: unknown; config: unknown }>('ui-multi-combobox')!;
  expect(field.items).toEqual(items.value);
  expect(field.config).toMatchObject({ allowCreate: true });
  expect(field.querySelector('[slot="item-research"]')?.textContent).toContain('Selected Research');
  field.dispatchEvent(new CustomEvent('remove-item', { detail: { item: items.value[0], index: 0, trigger: 'keyboard' } }));
  field.dispatchEvent(new CustomEvent('create-item', { detail: { query: 'Arbitrary', trigger: 'keyboard' } }));
  expect(onRemove).toHaveBeenCalledOnce();
  expect(onCreate).toHaveBeenCalledOnce();
});
