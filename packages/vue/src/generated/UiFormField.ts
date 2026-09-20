import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-invalid", "data-disabled", "data-required"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiFormField',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    invalid: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false }
  },
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-form-field","props":{"disabled":{"type":"boolean","required":false,"default":false},"invalid":{"type":"boolean","required":false,"default":false},"required":{"type":"boolean","required":false,"default":false}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-invalid","expression":"invalid","expressionPlan":{"source":"invalid","ast":{"kind":"id","name":"invalid"},"dependencies":["invalid"]}},{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"data-required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}}],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-form-field", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","invalid","required"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-form-field",
    "data-component-root": "ui-form-field",
    "data-looma-managed": "framework",
    "data-invalid": props.invalid ? '' : undefined,
    "data-disabled": props.disabled ? '' : undefined,
    "data-required": props.required ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
