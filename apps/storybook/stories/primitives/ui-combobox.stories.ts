import type { Meta, StoryObj } from '@storybook/web-components-vite';
const meta = {
  title: 'Forms/Combobox',
  tags: ['autodocs'],
  render: () => {
    // Props are attributes and options are authored children, exactly as in HTML.
    const host = document.createElement('ui-combobox');
    host.setAttribute('label', 'Destination');
    host.setAttribute('disclosure', '');
    host.setAttribute('clearable', '');
    host.setAttribute('allow-free-text', '');
    host.setAttribute('allow-create', '');
    host.setAttribute('size', 'sm');
    host.setAttribute('help', 'Choose a saved destination or enter a new one.');
    host.style.maxWidth = '24rem';
    host.innerHTML = `<optgroup label="Saved destinations">
      <option value="north">North terminal</option>
      <option value="west" disabled>West terminal</option>
    </optgroup>`;
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
    const host = document.createElement('ui-combobox');
    host.setAttribute('label', 'Page tags');
    host.setAttribute('placeholder', 'Add a tag…');
    host.setAttribute('multiple', '');
    host.setAttribute('allow-create', '');
    host.setAttribute('token-separators', JSON.stringify([',']));
    host.style.maxWidth = '24rem';
    host.innerHTML = ['research:Research', 'design:Design', 'planning:Planning', 'ops:Operations']
      .map(entry => { const [value, label] = entry.split(':'); return `<option value="${value}">${label}</option>`; }).join('');
    // The invocation is replaced by its lowered root, so listen on a wrapper (events bubble) and
    // write the selected items to whichever element currently exists: `value` before lowering,
    // its reflected `data-value` after.
    const wrapper = document.createElement('div');
    wrapper.append(host);
    let items: Item[] = [{ id: 'research', value: 'research', label: 'Research' }];
    const setItems = (next: Item[]) => {
      items = next;
      const root = wrapper.querySelector<HTMLElement>('[data-component-root~="ui-combobox"]');
      if (root) root.setAttribute('data-value', JSON.stringify(items));
      else host.setAttribute('value', JSON.stringify(items));
    };
    setItems(items);
    wrapper.addEventListener('add-item', event => setItems([...items, (event as CustomEvent<{ item: Item }>).detail.item]));
    wrapper.addEventListener('remove-item', event => {
      const index = (event as CustomEvent<{ index: number }>).detail.index;
      setItems(items.filter((_, position) => position !== index));
    });
    wrapper.addEventListener('create-item', event => {
      const query = (event as CustomEvent<{ query: string }>).detail.query;
      setItems([...items, { id: query, value: query, label: query }]);
    });
    return wrapper;
  },
};
