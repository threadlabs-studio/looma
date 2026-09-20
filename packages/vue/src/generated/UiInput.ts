import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-invalid"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiInput',
  props: {
    defaultValue: { type: [String, null], required: false, default: "" },
    disabled: { type: [Boolean, null], required: false, default: false },
    invalid: { type: [Boolean, null], required: false, default: false },
    readOnly: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false }
  },
  emits: ["input", "change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-input","props":{"defaultValue":{"type":"string","required":false,"target":{"attribute":"defaultvalue"},"default":""},"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"invalid":{"type":"boolean","required":false,"target":{"attribute":"data-invalid"},"default":false},"readOnly":{"type":"boolean","required":false,"target":{"attribute":"readonly"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"}}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-invalid","expression":"invalid","expressionPlan":{"source":"invalid","ast":{"kind":"id","name":"invalid"},"dependencies":["invalid"]}}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"input","type":"object({ value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"change","type":"object({ value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("input", (event as CustomEvent<{ readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("change", (event as CustomEvent<{ readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-input", props);
  root.value.addEventListener("input", eventListener0);
  root.value.addEventListener("change", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["defaultValue","disabled","invalid","readOnly","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("input", eventListener0);
  root.value?.removeEventListener("change", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-input",
    "data-component-root": "ui-input",
    "data-looma-managed": "framework",
    "data-invalid": props.invalid ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
