import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type { ComboboxConfig } from '@threadlabs/looma-core';

const meta = {
  title: 'Forms/Combobox',
  tags: ['autodocs'],
  render: () => {
    const host = document.createElement('ui-combobox') as HTMLElement & { config: ComboboxConfig };
    host.setAttribute('label', 'Destination');
    host.setAttribute('disclosure', '');
    host.setAttribute('clearable', '');
    host.setAttribute('size', 'sm');
    host.setAttribute('help', 'Choose a saved destination or enter a new one.');
    host.style.maxWidth = '24rem';
    host.config = {
      allowFreeText: true, allowCreate: true,
      options: [
        { id: 'north', value: 'north', label: 'North terminal', description: 'Harbor district · Available', group: 'Saved destinations' },
        { id: 'west', value: 'west', label: 'West terminal', description: 'Riverside · Unavailable', group: 'Saved destinations', disabled: true },
      ],
      validator: value => String(value).length < 2 ? { issues: [{ message: 'Use at least two characters.' }] } : {},
    };
    return host;
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const SmartField: Story = {};

// Multiple mode: the same component with removable chips and token separators.
export const Multiple: Story = {
  render: () => {
    type Item = { id: string; value: string; label: string };
    const host = document.createElement('ui-combobox') as HTMLElement & {
      config: ComboboxConfig; value: readonly Item[]; multiple: boolean; tokenSeparators: readonly string[];
    };
    host.setAttribute('label', 'Page tags');
    host.setAttribute('placeholder', 'Add a tag…');
    host.style.maxWidth = '24rem';
    host.multiple = true;
    host.tokenSeparators = [','];
    host.config = {
      allowCreate: true,
      options: [
        { id: 'research', value: 'research', label: 'Research' },
        { id: 'design', value: 'design', label: 'Design' },
        { id: 'planning', value: 'planning', label: 'Planning' },
        { id: 'ops', value: 'ops', label: 'Operations' },
      ],
    };
    host.value = [{ id: 'research', value: 'research', label: 'Research' }];
    host.addEventListener('add-item', event => {
      host.value = [...host.value, (event as CustomEvent<{ item: Item }>).detail.item];
    });
    host.addEventListener('remove-item', event => {
      const index = (event as CustomEvent<{ index: number }>).detail.index;
      host.value = host.value.filter((_, position) => position !== index);
    });
    host.addEventListener('create-item', event => {
      const query = (event as CustomEvent<{ query: string }>).detail.query;
      host.value = [...host.value, { id: query, value: query, label: query }];
    });
    return host;
  },
};
