import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["value", "disabled", "readonly", "required", "rows"]

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTextarea',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    invalid: { type: [Boolean, null], required: false, default: false },
    readonly: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false },
    rows: { type: [Number, null], required: false, default: 4 },
    value: { type: [String, null], required: false }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuedisabled = props.disabled;
  const valueinvalid = props.invalid;
  const valuereadonly = props.readonly;
  const valuerequired = props.required;
  const valuerows = props.rows;
  const valuevalue = props.value;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "invalid": passed("invalid", "invalid") ? valueinvalid : undefined, "readonly": passed("readonly", "readonly") ? valuereadonly : undefined, "required": passed("required", "required") ? valuerequired : undefined, "rows": passed("rows", "rows") ? valuerows : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const definition = {...{"contract":{"tag":"ui-textarea","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"invalid":{"type":"boolean","required":false,"target":{"attribute":"invalid"},"default":false},"readonly":{"type":"boolean","required":false,"target":{"attribute":"readonly"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"rows":{"type":{"kind":"terminal","name":"integer"},"required":false,"target":{"attribute":"rows"},"default":4},"value":{"type":"string","required":false,"target":{"attribute":"value"}}}},"template":{"kind":"element","name":"textarea","attributes":[{"kind":"attribute","name":"value","expression":"value","expressionPlan":{"source":"value","ast":{"kind":"id","name":"value"},"dependencies":["value"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"readonly","expression":"readonly","expressionPlan":{"source":"readonly","ast":{"kind":"id","name":"readonly"},"dependencies":["readonly"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}},{"kind":"attribute","name":"rows","expression":"rows","expressionPlan":{"source":"rows","ast":{"kind":"id","name":"rows"},"dependencies":["rows"]}}],"children":[]},"declarations":[],"root":{"kind":"native","element":"textarea","choices":["textarea"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-textarea", explicitProps());
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("textarea", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-textarea",
    "data-component-root": "ui-textarea",
    value: props.value,
    disabled: props.disabled,
    readonly: props.readonly,
    required: props.required,
    rows: props.rows,
    ref_key: "root",
    ref: root
  }), "\n  ", 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
