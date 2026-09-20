import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-orientation", "data-disabled"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiRadioGroup',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    name: { type: [String, null], required: false, default: "" },
    orientation: { type: [String, null], required: false, default: "horizontal" },
    required: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "" }
  },
  emits: ["select", "change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-radio-group","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"name":{"type":"string","required":false,"target":{"attribute":"name"},"default":""},"orientation":{"type":{"enum":["horizontal","vertical"]},"required":false,"target":{"attribute":"data-orientation"},"default":"horizontal"},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":""}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"role","value":"radiogroup"},{"kind":"attribute","name":"data-orientation","expression":"orientation","expressionPlan":{"source":"orientation","ast":{"kind":"id","name":"orientation"},"dependencies":["orientation"]}},{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"select","type":"object({ value: string, previousValue: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"change","type":"object({ checked: boolean, value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("select", (event as CustomEvent<{ readonly value: string; readonly previousValue: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("change", (event as CustomEvent<{ readonly checked: boolean; readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-radio-group", props);
  root.value.addEventListener("select", eventListener0);
  root.value.addEventListener("change", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","name","orientation","required","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("select", eventListener0);
  root.value?.removeEventListener("change", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-radio-group",
    "data-component-root": "ui-radio-group",
    "data-looma-managed": "framework",
    role: "radiogroup",
    "data-orientation": props.orientation,
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
