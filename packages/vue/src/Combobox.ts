import { defineComponent, h, shallowRef, watch, watchEffect, type PropType, type SlotsType } from 'vue';
import type { ComboboxConfig, ComboboxOption, ComboboxChange, ComboboxValidationState, MultiComboboxItem, MultiComboboxItemChange, MultiComboboxCreate } from '@threadlabs/looma-core';

type ComboboxModel = string | null | readonly MultiComboboxItem[];

export const Combobox = defineComponent({
  name: 'Combobox',
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    modelValue: { type: [String, Array, null] as PropType<ComboboxModel>, default: undefined },
    query: { type: String, default: undefined },
    defaultValue: String,
    defaultQuery: String,
    config: { type: Object as PropType<ComboboxConfig>, default: () => ({}) },
    placeholder: String,
    name: String,
    size: { type: String as PropType<'sm' | 'md'>, default: 'md' },
    labelVisibility: { type: String as PropType<'visible' | 'sr-only'>, default: 'visible' },
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    disclosure: Boolean,
    clearable: Boolean,
    help: String,
    // Multiple mode: `modelValue` holds the selected item list and chips render before the cursor.
    multiple: Boolean,
    tokenSeparators: { type: Array as PropType<readonly string[]>, default: () => [] },
  },
  emits: {
    // Typed for single mode (v-model of `string | null`); multiple mode writes the
    // item array through the same channel (cast at the emit site below).
    'update:modelValue': (_value: string | null) => true,
    'update:query': (_query: string) => true,
    queryChange: (_detail: { query: string; display: string; trigger: string }) => true,
    valueChange: (_detail: ComboboxChange | readonly MultiComboboxItem[]) => true,
    freeEntry: (_detail: ComboboxChange) => true,
    createEntry: (_detail: ComboboxChange) => true,
    dependencyInvalidate: (_detail: ComboboxChange) => true,
    validationChange: (_detail: ComboboxValidationState) => true,
    // Multiple mode item events.
    addItem: (_detail: MultiComboboxItemChange) => true,
    removeItem: (_detail: MultiComboboxItemChange) => true,
    createItem: (_detail: MultiComboboxCreate) => true,
    optionsChange: (_detail: readonly ComboboxOption[]) => true,
  },
  slots: Object as SlotsType<{
    option: { option: ComboboxOption };
    item: { item: MultiComboboxItem };
    loading: Record<string, never>;
    empty: Record<string, never>;
    error: Record<string, never>;
    create: { query: string };
    start: Record<string, never>;
    footer: Record<string, never>;
  }>,
  setup(props, { attrs, slots, emit, expose }) {
    const element = shallowRef<HTMLElement & { config: ComboboxConfig; value: ComboboxModel | undefined; query: string | undefined; multiple: boolean; tokenSeparators: readonly string[]; validate(): Promise<ComboboxValidationState> }>();
    const rows = shallowRef<readonly ComboboxOption[]>(props.config.options ?? []);
    const currentQuery = shallowRef(props.query ?? props.defaultQuery ?? '');
    watch(() => props.query, query => { if (query !== undefined) currentQuery.value = query; });
    watchEffect(() => {
      if (!element.value) return;
      element.value.config = props.config;
      element.value.value = props.modelValue;
      element.value.query = props.query;
      element.value.multiple = props.multiple;
      element.value.tokenSeparators = props.tokenSeparators;
    });
    expose({ validate: () => element.value!.validate() });
    const items = () => (props.multiple && Array.isArray(props.modelValue) ? props.modelValue : []) as readonly MultiComboboxItem[];
    return () => h('ui-combobox', {
      ...attrs,
      ...Object.fromEntries(Object.entries(props).filter(([key]) => !['modelValue', 'config', 'query', 'tokenSeparators'].includes(key))),
      // Property binding is explicit for non-serializable config; strings remain
      // SSR-compatible attributes until the element upgrades.
      value: props.modelValue,
      query: props.query,
      tokenSeparators: props.tokenSeparators,
      'data-allow-mismatch': 'class',
      ref: element,
      class: [attrs.class, element.value?.shadowRoot && 'hydrated'],

      'onOptions-change': (event: CustomEvent<readonly ComboboxOption[]>) => { rows.value = event.detail; emit('optionsChange', event.detail); },
      'onQuery-change': (event: CustomEvent<{ query: string; display: string; trigger: string }>) => {
        currentQuery.value = event.detail.query; emit('update:query', event.detail.query); emit('queryChange', event.detail);
      },
      'onValue-change': (event: CustomEvent<ComboboxChange | readonly MultiComboboxItem[]>) => {
        // Multiple mode emits the full item list; single mode emits a ComboboxChange.
        // v-model carries the array in multiple mode (the single-mode string channel).
        emit('update:modelValue', props.multiple ? (event.detail as unknown as string | null) : (event.detail as ComboboxChange).value);
        emit('valueChange', event.detail);
      },
      'onFree-entry': (event: CustomEvent<ComboboxChange>) => emit('freeEntry', event.detail),
      'onCreate-entry': (event: CustomEvent<ComboboxChange>) => emit('createEntry', event.detail),
      'onDependency-invalidate': (event: CustomEvent<ComboboxChange>) => emit('dependencyInvalidate', event.detail),
      'onValidation-change': (event: CustomEvent<ComboboxValidationState>) => emit('validationChange', event.detail),
      'onAdd-item': (event: CustomEvent<MultiComboboxItemChange>) => emit('addItem', event.detail),
      'onRemove-item': (event: CustomEvent<MultiComboboxItemChange>) => emit('removeItem', event.detail),
      'onCreate-item': (event: CustomEvent<MultiComboboxCreate>) => emit('createItem', event.detail),
    }, [
      h('label', { slot: 'fallback' }, [props.label, h('input', {
        value: props.query ?? props.defaultQuery ?? '', disabled: props.disabled,
        readonly: props.readOnly, required: props.required,
      })]),
      ...(slots.option ? rows.value.map(option => h('div', { slot: `option-${option.id}`, key: option.id }, slots.option!({ option }))) : []),
      ...(props.multiple && slots.item ? items().map(item => h('span', { slot: `item-${item.id}`, key: item.id }, slots.item!({ item }))) : []),
      ...(slots.create ? [h('span', { slot: 'create' }, slots.create!({ query: currentQuery.value }))] : []),
      ...(['start', 'footer', 'loading', 'empty', 'error'] as const).flatMap(name => slots[name] ? [h('div', { slot: name }, slots[name]!({}))] : []),
    ]);
  },
});
