import { defineComponent, getCurrentInstance, h, shallowRef, watch, type Component, type ComponentPublicInstance, type PropType, type SlotsType } from 'vue';
import type { ComboboxOption, ComboboxChange, ComboboxValidationState, MultiComboboxItem, MultiComboboxItemChange, MultiComboboxCreate } from '@threadlabs/looma-core';
import { toHTMLElement } from './adapter';
import { UiCombobox } from './generated';

type ComboboxModel = string | null | readonly MultiComboboxItem[];

/** An option for the list. Rendered as a native <option> (inside <optgroup> when `group` is set). */
export interface ComboboxOptionInput {
  readonly value: string;
  readonly label?: string;
  readonly group?: string;
  readonly disabled?: boolean;
}

// Props are attributes: selected items cross the boundary as JSON in the declared item shape.
const itemShape = (item: MultiComboboxItem) => ({
  id: item.id,
  value: item.value,
  label: item.label,
  ...(item.group === undefined ? {} : { group: item.group }),
  ...(item.disabled === undefined ? {} : { disabled: item.disabled }),
});

function optionElements(options: readonly ComboboxOptionInput[]) {
  const option = (entry: ComboboxOptionInput) =>
    h('option', { value: entry.value, disabled: entry.disabled, key: entry.value }, entry.label ?? entry.value);
  const groups = new Map<string, ComboboxOptionInput[]>();
  const nodes: ReturnType<typeof h>[] = [];
  for (const entry of options) {
    if (entry.group === undefined) nodes.push(option(entry));
    else {
      if (!groups.has(entry.group)) {
        groups.set(entry.group, []);
        nodes.push(h('optgroup', { label: entry.group, key: `group-${entry.group}` }, () => groups.get(entry.group!)!.map(option)));
      }
      groups.get(entry.group)!.push(entry);
    }
  }
  return nodes;
}

export const Combobox = defineComponent({
  name: 'Combobox',
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    modelValue: { type: [String, Array, null] as PropType<ComboboxModel>, default: undefined },
    query: { type: String, default: undefined },
    defaultValue: String,
    defaultQuery: String,
    options: { type: Array as PropType<readonly ComboboxOptionInput[]>, default: () => [] },
    allowFreeText: Boolean,
    allowCreate: Boolean,
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
    // Forward only the props the caller passed, so defaults stay implicit (not reflected).
    const instance = getCurrentInstance();
    const kebab = (name: string) => name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    const passed = (name: string) => {
      const raw = instance?.vnode.props ?? {};
      return Object.hasOwn(raw, name) || Object.hasOwn(raw, kebab(name));
    };
    const element = shallowRef<HTMLElement & { validate(): Promise<ComboboxValidationState> }>();
    const rows = shallowRef<readonly ComboboxOption[]>([]);
    const currentQuery = shallowRef(props.query ?? props.defaultQuery ?? '');
    watch(() => props.query, query => { if (query !== undefined) currentQuery.value = query; });
    expose({ validate: () => element.value!.validate() });
    const items = () => (props.multiple && Array.isArray(props.modelValue) ? props.modelValue : []) as readonly MultiComboboxItem[];
    return () => h(UiCombobox as Component, {
      ...attrs,
      ...Object.fromEntries(Object.entries(props).filter(([key]) =>
        !['modelValue', 'options', 'query', 'tokenSeparators'].includes(key) && passed(key))),
      // Single mode binds the selected value; multiple mode binds the item list as `items`.
      ...(props.multiple
        ? { items: Array.isArray(props.modelValue) ? props.modelValue.map(itemShape) : undefined }
        : { value: props.modelValue as string | null | undefined }),
      query: props.query,
      tokenSeparators: props.tokenSeparators.length ? [...props.tokenSeparators] : undefined,
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
      onValidationChange: (detail: ComboboxValidationState) => emit('validationChange', detail),
      onAddItem: (detail: MultiComboboxItemChange) => emit('addItem', detail),
      onRemoveItem: (detail: MultiComboboxItemChange) => emit('removeItem', detail),
      onCreateItem: (detail: MultiComboboxCreate) => emit('createItem', detail),
    }, {
      default: () => [
        // Options are authored children, exactly as in HTML.
        ...optionElements(props.options),
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
