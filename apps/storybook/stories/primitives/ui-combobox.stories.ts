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
