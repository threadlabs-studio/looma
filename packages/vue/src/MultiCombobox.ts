import { defineComponent, h, shallowRef, watch, watchEffect, type PropType, type SlotsType } from 'vue';
import type { ComboboxConfig, ComboboxOption, MultiComboboxCreate, MultiComboboxItem, MultiComboboxItemChange } from '@threadlabs/looma-core';

type MultiComboboxElement = HTMLElement & {
  items: readonly MultiComboboxItem[];
  config: ComboboxConfig;
  query: string | undefined;
  focusInput(): Promise<void>;
};

export const MultiCombobox = defineComponent({
  name: 'MultiCombobox',
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    items: { type: Array as PropType<readonly MultiComboboxItem[]>, default: () => [] },
    config: { type: Object as PropType<ComboboxConfig>, default: () => ({}) },
    query: { type: String, default: undefined },
    defaultQuery: String,
    placeholder: String,
    name: String,
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
  },
  emits: {
    'update:query': (_query: string) => true,
    queryChange: (_detail: { query: string; display: string; trigger: string }) => true,
    addItem: (_detail: MultiComboboxItemChange) => true,
    removeItem: (_detail: MultiComboboxItemChange) => true,
    createItem: (_detail: MultiComboboxCreate) => true,
    optionsChange: (_detail: readonly ComboboxOption[]) => true,
  },
  slots: Object as SlotsType<{
    item: { item: MultiComboboxItem };
    option: { option: ComboboxOption };
    create: { query: string };
    footer: Record<string, never>;
    loading: Record<string, never>;
    empty: Record<string, never>;
    error: Record<string, never>;
  }>,
  setup(props, { attrs, slots, emit, expose }) {
    const element = shallowRef<MultiComboboxElement>();
    const rows = shallowRef<readonly ComboboxOption[]>(props.config.options ?? []);
    const currentQuery = shallowRef(props.query ?? props.defaultQuery ?? '');

    watch(() => props.query, query => { if (query !== undefined) currentQuery.value = query; });
    watchEffect(() => {
      if (!element.value) return;
      element.value.items = props.items;
      element.value.config = props.config;
      element.value.query = props.query;
    });

    expose({ focusInput: () => element.value!.focusInput() });

    return () => h('ui-multi-combobox', {
      ...attrs,
      ...Object.fromEntries(Object.entries(props).filter(([key]) => !['items', 'config', 'query'].includes(key))),
      items: props.items,
      config: props.config,
      query: props.query,
      'data-allow-mismatch': 'class',
      ref: element,
      class: [attrs.class, element.value?.shadowRoot && 'hydrated'],
      'onOptions-change': (event: CustomEvent<readonly ComboboxOption[]>) => {
        rows.value = event.detail;
        emit('optionsChange', event.detail);
      },
      'onQuery-change': (event: CustomEvent<{ query: string; display: string; trigger: string }>) => {
        currentQuery.value = event.detail.query;
        emit('update:query', event.detail.query);
        emit('queryChange', event.detail);
      },
      'onAdd-item': (event: CustomEvent<MultiComboboxItemChange>) => emit('addItem', event.detail),
      'onRemove-item': (event: CustomEvent<MultiComboboxItemChange>) => emit('removeItem', event.detail),
      'onCreate-item': (event: CustomEvent<MultiComboboxCreate>) => emit('createItem', event.detail),
    }, [
      h('label', { slot: 'fallback' }, [props.label, h('input', {
        value: props.query ?? props.defaultQuery ?? '', disabled: props.disabled,
        readonly: props.readOnly, required: props.required,
      })]),
      ...(slots.item ? props.items.map(item => h('span', { slot: `item-${item.id}`, key: item.id }, slots.item!({ item }))) : []),
      ...(slots.option ? rows.value.map(option => h('span', { slot: `option-${option.id}`, key: option.id }, slots.option!({ option }))) : []),
      ...(slots.create ? [h('span', { slot: 'create' }, slots.create({ query: currentQuery.value }))] : []),
      ...(['footer', 'loading', 'empty', 'error'] as const).flatMap(name => slots[name] ? [h('div', { slot: name }, slots[name]!({}))] : []),
    ]);
  },
});
