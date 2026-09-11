import { userEvent } from '@vitest/browser/context';
import { afterEach, expect, it, vi } from 'vitest';

const flush = async () => { for (let index = 0; index < 4; index += 1) await new Promise(requestAnimationFrame); };

afterEach(() => { document.body.innerHTML = ''; });

type MultiComboboxElement = HTMLElement & {
  items: Array<{ id: string; value: string; label: string }>;
  config: { options: Array<{ id: string; value: string; label: string }>; allowCreate?: boolean };
  tokenSeparators: readonly string[];
};

async function mount() {
  document.body.innerHTML = '<ui-multi-combobox label="Page tags" placeholder="Tag…"></ui-multi-combobox>';
  const field = document.querySelector('ui-multi-combobox') as MultiComboboxElement;
  field.items = [
    { id: 'research', value: 'research', label: 'Research' },
    { id: 'design', value: 'design', label: 'Design' },
  ];
  field.config = {
    allowCreate: true,
    options: [
      { id: 'research', value: 'research', label: 'Research' },
      { id: 'design', value: 'design', label: 'Design' },
      { id: 'planning', value: 'planning', label: 'Planning' },
    ],
  };
  await flush();
  const root = field.shadowRoot!;
  const combobox = root.querySelector('ui-combobox')!;
  await expect.poll(() => combobox.shadowRoot?.querySelector('input')).toBeTruthy();
  return { field, root, combobox, input: combobox.shadowRoot!.querySelector('input')! };
}

it('renders selected items and the cursor in one control with keyboard removal', async () => {
  const { field, root, input } = await mount();
  const removed = vi.fn();
  field.addEventListener('remove-item', removed);
  const tags = root.querySelectorAll<HTMLButtonElement>('[part="item"]');
  expect(tags).toHaveLength(2);
  expect(tags[0].querySelector<HTMLUiChipElement>('ui-chip')?.appearance).toBe('pill');

  input.focus();
  await userEvent.keyboard('{ArrowLeft}');
  expect(root.activeElement).toBe(tags[1]);
  await userEvent.keyboard('{Backspace}');
  expect(removed).toHaveBeenCalledOnce();
  expect(removed.mock.calls[0][0].detail.item.label).toBe('Design');

  await userEvent.click(tags[0]);
  await userEvent.keyboard('{Delete}');
  expect(removed).toHaveBeenCalledTimes(2);
  expect(removed.mock.calls[1][0].detail.item.label).toBe('Research');
});

it('adds and creates without leaving a stale selection or blank open popup', async () => {
  const { field, root, input, combobox } = await mount();
  const initialConfig = (combobox as HTMLUiComboboxElement).config;
  const added = vi.fn();
  const created = vi.fn();
  field.addEventListener('add-item', added);
  field.addEventListener('create-item', created);

  await userEvent.fill(input, 'Plan');
  await flush();
  expect((combobox as HTMLUiComboboxElement).config).toBe(initialConfig);
  const planning = [...combobox.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
    .find(option => option.textContent?.includes('Planning'))!;
  await userEvent.click(planning);
  await flush();
  expect(added.mock.calls[0][0].detail.item.label).toBe('Planning');
  expect(input.value).toBe('');
  expect(input.getAttribute('aria-expanded')).toBe('false');
  expect(root.querySelectorAll('[part="item"]')).toHaveLength(2);

  await userEvent.fill(input, 'Arbitrary');
  await flush();
  const create = [...combobox.shadowRoot!.querySelectorAll<HTMLElement>('[role="option"]')]
    .find(option => option.textContent?.includes('Create'))!;
  await userEvent.click(create);
  await flush();
  expect(created.mock.calls[0][0].detail.query).toBe('Arbitrary');
  expect(input.value).toBe('');
  expect(input.getAttribute('aria-expanded')).toBe('false');
});

it('commits exact matches or new values on a configured token separator and keeps typing', async () => {
  const { field, root, input } = await mount();
  const added = vi.fn();
  const created = vi.fn();
  field.tokenSeparators = [','];
  field.addEventListener('add-item', added);
  field.addEventListener('create-item', created);

  input.focus();
  await userEvent.keyboard('Planning,');
  await flush();
  expect(added.mock.calls[0][0].detail.item.label).toBe('Planning');
  expect(created).not.toHaveBeenCalled();
  expect(input.value).toBe('');
  expect(root.querySelector('ui-combobox')?.shadowRoot?.activeElement).toBe(input);

  await userEvent.keyboard('Arbitrary,Next');
  await flush();
  expect(created.mock.calls[0][0].detail.query).toBe('Arbitrary');
  expect(input.value).toBe('Next');
  expect(root.querySelector('ui-combobox')?.shadowRoot?.activeElement).toBe(input);
});

it('keeps an unmatched query when creation is disabled', async () => {
  const { field, input } = await mount();
  const added = vi.fn();
  const created = vi.fn();
  field.tokenSeparators = [','];
  field.config = { ...field.config, allowCreate: false };
  field.addEventListener('add-item', added);
  field.addEventListener('create-item', created);

  input.focus();
  await userEvent.keyboard('Unknown,');
  await flush();
  expect(added).not.toHaveBeenCalled();
  expect(created).not.toHaveBeenCalled();
  expect(input.value).toBe('Unknown');
});
