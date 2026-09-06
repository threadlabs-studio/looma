import { defineComponent, h, shallowRef, watchEffect, type PropType, type SlotsType } from 'vue';
import type { ComboboxConfig, ComboboxOption, ComboboxChange, ComboboxValidationState } from '@threadlabs/looma-core';

export const Combobox = defineComponent({
  name: 'Combobox',
  inheritAttrs: false,
  props: {
    label: { type: String, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined },
    query: { type: String, default: undefined },
    defaultValue: String,
    defaultQuery: String,
    config: { type: Object as PropType<ComboboxConfig>, default: () => ({}) },
    placeholder: String,
    name: String,
    size: { type: String as PropType<'sm' | 'md'>, default: 'md' },
    disabled: Boolean,
    readOnly: Boolean,
    required: Boolean,
    disclosure: Boolean,
    clearable: Boolean,
    help: String,
  },
  emits: {
    'update:modelValue': (_value: string | null) => true,
    'update:query': (_query: string) => true,
    queryChange: (_detail: { query: string; display: string; trigger: string }) => true,
    valueChange: (_detail: ComboboxChange) => true,
    freeEntry: (_detail: ComboboxChange) => true,
    createEntry: (_detail: ComboboxChange) => true,
    dependencyInvalidate: (_detail: ComboboxChange) => true,
    validationChange: (_detail: ComboboxValidationState) => true,
  },
  slots: Object as SlotsType<{
    option: { option: ComboboxOption };
    loading: Record<string, never>;
    empty: Record<string, never>;
    error: Record<string, never>;
    create: Record<string, never>;
  }>,
  setup(props, { attrs, slots, emit, expose }) {
    const element = shallowRef<HTMLElement & { config: ComboboxConfig; value: string | null | undefined; query: string | undefined; validate(): Promise<ComboboxValidationState> }>();
    const rows = shallowRef<readonly ComboboxOption[]>(props.config.options ?? []);
    watchEffect(() => {
      if (!element.value) return;
      element.value.config = props.config;
      element.value.value = props.modelValue;
      element.value.query = props.query;
    });
    expose({ validate: () => element.value!.validate() });
    return () => h('ui-combobox', {
      ...attrs,
      ...Object.fromEntries(Object.entries(props).filter(([key]) => !['modelValue', 'config', 'query'].includes(key))),
      // Property binding is explicit for non-serializable config; strings remain
      // SSR-compatible attributes until the element upgrades.
      value: props.modelValue,
      query: props.query,
      'data-allow-mismatch': 'class',
      ref: element,
      class: [attrs.class, element.value?.shadowRoot && 'hydrated'],

      'onOptions-change': (event: CustomEvent<readonly ComboboxOption[]>) => { rows.value = event.detail; },
      'onQuery-change': (event: CustomEvent<{ query: string; display: string; trigger: string }>) => {
        emit('update:query', event.detail.query); emit('queryChange', event.detail);
      },
      'onValue-change': (event: CustomEvent<ComboboxChange>) => {
        emit('update:modelValue', event.detail.value); emit('valueChange', event.detail);
      },
      'onFree-entry': (event: CustomEvent<ComboboxChange>) => emit('freeEntry', event.detail),
      'onCreate-entry': (event: CustomEvent<ComboboxChange>) => emit('createEntry', event.detail),
      'onDependency-invalidate': (event: CustomEvent<ComboboxChange>) => emit('dependencyInvalidate', event.detail),
      'onValidation-change': (event: CustomEvent<ComboboxValidationState>) => emit('validationChange', event.detail),
    }, [
      h('label', { slot: 'fallback' }, [props.label, h('input', {
        value: props.query ?? props.defaultQuery ?? '', disabled: props.disabled,
        readonly: props.readOnly, required: props.required,
      })]),
      ...(slots.option ? rows.value.map(option => h('div', { slot: `option-${option.id}`, key: option.id }, slots.option!({ option }))) : []),
      ...(['loading', 'empty', 'error', 'create'] as const).flatMap(name => slots[name] ? [h('div', { slot: name }, slots[name]!({}))] : []),
    ]);
  },
});
