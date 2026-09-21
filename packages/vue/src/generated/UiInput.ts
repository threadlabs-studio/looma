import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["value", "disabled", "readonly", "required"]

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiInput',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    invalid: { type: [Boolean, null], required: false, default: false },
    readonly: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false },
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
  const valuevalue = props.value;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "invalid": passed("invalid", "invalid") ? valueinvalid : undefined, "readonly": passed("readonly", "readonly") ? valuereadonly : undefined, "required": passed("required", "required") ? valuerequired : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const definition = {...{"contract":{"tag":"ui-input","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"invalid":{"type":"boolean","required":false,"target":{"attribute":"invalid"},"default":false},"readonly":{"type":"boolean","required":false,"target":{"attribute":"readonly"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"}}}},"template":{"kind":"element","name":"input","attributes":[{"kind":"attribute","name":"value","expression":"value","expressionPlan":{"source":"value","ast":{"kind":"id","name":"value"},"dependencies":["value"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"readonly","expression":"readonly","expressionPlan":{"source":"readonly","ast":{"kind":"id","name":"readonly"},"dependencies":["readonly"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}}],"children":[]},"declarations":[],"root":{"kind":"native","element":"input","choices":["input"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-input", explicitProps());
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
  return (_openBlock(), _createElementBlock("input", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-input",
    "data-component-root": "ui-input",
    "data-looma-managed": "framework",
    value: props.value,
    disabled: props.disabled,
    readonly: props.readonly,
    required: props.required,
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
