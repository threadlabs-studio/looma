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
    render: () => h(MultiCombobox, { label: 'Page tags', items: items.value, config: { options, allowCreate: true }, tokenSeparators: [','], onRemoveItem: onRemove, onCreateItem: onCreate }, {
      item: ({ item }: { item: { label: string } }) => h('strong', `Selected ${item.label}`),
      option: ({ option }: { option: { label: string } }) => h('span', `Option ${option.label}`),
    }),
  });
  apps.push(app);
  app.mount(host);
  await flush();

  const field = host.querySelector<HTMLElement & { items: unknown; config: unknown; tokenSeparators: unknown }>('ui-multi-combobox')!;
  expect(field.items).toEqual(items.value);
  expect(field.config).toMatchObject({ allowCreate: true });
  expect(field.tokenSeparators).toEqual([',']);
  expect(field.querySelector('[slot="item-research"]')?.textContent).toContain('Selected Research');
  field.dispatchEvent(new CustomEvent('remove-item', { detail: { item: items.value[0], index: 0, trigger: 'keyboard' } }));
  field.dispatchEvent(new CustomEvent('create-item', { detail: { query: 'Arbitrary', trigger: 'keyboard' } }));
  expect(onRemove).toHaveBeenCalledOnce();
  expect(onCreate).toHaveBeenCalledOnce();
});

it('keeps a custom chip renderer inside the selected-item width bound', async () => {
  const label = 'A custom selected value that must not take over the whole editing control';
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(MultiCombobox, {
      label: 'Page tags',
      items: [{ id: 'long-value', value: 'long-value', label }],
      config: { options: [] },
    }, {
      item: ({ item }: { item: { label: string } }) => h('ui-chip', { appearance: 'tag' }, item.label),
    }),
  });
  apps.push(app);
  app.mount(host);
  await flush();

  const field = host.querySelector('ui-multi-combobox')!;
  const item = field.shadowRoot!.querySelector<HTMLElement>('[part="item"]')!;
  const chip = field.querySelector<HTMLUiChipElement>('ui-chip')!;
  await expect.poll(() => chip.shadowRoot?.querySelector('.chip__label')).toBeTruthy();
  const chipLabel = chip.shadowRoot!.querySelector<HTMLElement>('.chip__label')!;

  expect(item.getBoundingClientRect().width).toBeLessThanOrEqual(193);
  expect(getComputedStyle(chipLabel).textOverflow).toBe('ellipsis');
  expect(chipLabel.scrollWidth).toBeGreaterThan(chipLabel.clientWidth);
});
