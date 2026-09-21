import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["disabled", "required", "multiple"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSelect',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    invalid: { type: [Boolean, null], required: false, default: false },
    multiple: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false }
  },
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-select","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"invalid":{"type":"boolean","required":false,"target":{"attribute":"invalid"},"default":false},"multiple":{"type":"boolean","required":false,"target":{"attribute":"multiple"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"}}}},"template":{"kind":"element","name":"select","attributes":[{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}},{"kind":"attribute","name":"multiple","expression":"multiple","expressionPlan":{"source":"multiple","ast":{"kind":"id","name":"multiple"},"dependencies":["multiple"]}}],"children":[]},"declarations":[],"root":{"kind":"native","element":"select","choices":["select"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-select", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","invalid","multiple","required","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("select", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-select",
    "data-component-root": "ui-select",
    "data-looma-managed": "framework",
    disabled: props.disabled,
    required: props.required,
    multiple: props.multiple,
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
