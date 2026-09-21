import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["value", "disabled", "readonly", "required"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
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
const definition = {...{"contract":{"tag":"ui-input","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"invalid":{"type":"boolean","required":false,"target":{"attribute":"invalid"},"default":false},"readonly":{"type":"boolean","required":false,"target":{"attribute":"readonly"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"}}}},"template":{"kind":"element","name":"input","attributes":[{"kind":"attribute","name":"value","expression":"value","expressionPlan":{"source":"value","ast":{"kind":"id","name":"value"},"dependencies":["value"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"readonly","expression":"readonly","expressionPlan":{"source":"readonly","ast":{"kind":"id","name":"readonly"},"dependencies":["readonly"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}}],"children":[]},"declarations":[],"root":{"kind":"native","element":"input","choices":["input"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-input", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","invalid","readonly","required","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
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
