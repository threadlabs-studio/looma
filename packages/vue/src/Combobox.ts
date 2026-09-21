import { defineComponent, h, shallowRef, watch, watchEffect, type Component, type ComponentPublicInstance, type PropType, type SlotsType } from 'vue';
import type { ComboboxConfig, ComboboxOption, ComboboxChange, ComboboxValidationState, MultiComboboxItem, MultiComboboxItemChange, MultiComboboxCreate } from '@threadlabs/looma-core';
import { toHTMLElement } from './adapter';
import { UiCombobox } from './generated';

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
    return () => h(UiCombobox as Component, {
      ...attrs,
      ...Object.fromEntries(Object.entries(props).filter(([key]) => !['modelValue', 'config', 'query', 'tokenSeparators'].includes(key))),
      // Property binding is explicit for non-serializable config; strings remain
      // SSR-compatible attributes until the element upgrades.
      value: typeof props.modelValue === 'string' || props.modelValue == null
        ? props.modelValue
        : [...props.modelValue],
      config: props.config,
      query: props.query,
      tokenSeparators: [...props.tokenSeparators],
      'data-allow-mismatch': 'class',
      ref: (value: Element | ComponentPublicInstance | null) => {
        element.value = toHTMLElement(value) as typeof element.value;
      },
      class: attrs.class,

      onOptionsChange: (detail: readonly ComboboxOption[]) => { rows.value = detail; emit('optionsChange', detail); },
      onQueryChange: (detail: { query: string; display: string; trigger: string }) => {
        currentQuery.value = detail.query; emit('update:query', detail.query); emit('queryChange', detail);
      },
      onValueChange: (detail: ComboboxChange | readonly MultiComboboxItem[]) => {
        // Multiple mode emits the full item list; single mode emits a ComboboxChange.
        // v-model carries the array in multiple mode (the single-mode string channel).
        emit('update:modelValue', props.multiple ? (detail as unknown as string | null) : (detail as ComboboxChange).value);
        emit('valueChange', detail);
      },
      onFreeEntry: (detail: ComboboxChange) => emit('freeEntry', detail),
      onCreateEntry: (detail: ComboboxChange) => emit('createEntry', detail),
      onDependencyInvalidate: (detail: ComboboxChange) => emit('dependencyInvalidate', detail),
      onValidationChange: (detail: ComboboxValidationState) => emit('validationChange', detail),
      onAddItem: (detail: MultiComboboxItemChange) => emit('addItem', detail),
      onRemoveItem: (detail: MultiComboboxItemChange) => emit('removeItem', detail),
      onCreateItem: (detail: MultiComboboxCreate) => emit('createItem', detail),
    }, {
      default: () => [
        h('label', { slot: 'fallback' }, [props.label, h('input', {
          value: props.query ?? props.defaultQuery ?? '', disabled: props.disabled,
          readonly: props.readOnly, required: props.required,
        })]),
        ...(slots.option ? rows.value.map(option => h('div', { slot: `option-${option.id}`, key: option.id }, slots.option!({ option }))) : []),
        ...(props.multiple && slots.item ? items().map(item => h('span', { slot: `item-${item.id}`, key: item.id }, slots.item!({ item }))) : []),
        ...(slots.create ? [h('span', { slot: 'create' }, slots.create!({ query: currentQuery.value }))] : []),
        ...(['start', 'footer', 'loading', 'empty', 'error'] as const).flatMap(name => slots[name] ? [h('div', { slot: name }, slots[name]!({}))] : []),
      ],
    });
  },
});
