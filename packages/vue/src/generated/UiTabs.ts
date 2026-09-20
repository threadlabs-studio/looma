import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-orientation"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTabs',
  props: {
    defaultValue: { type: [String, null], required: false, default: "" },
    orientation: { type: [String, null], required: false, default: "horizontal" },
    value: { type: [String, null], required: false }
  },
  emits: ["select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-tabs","props":{"defaultValue":{"type":"string","required":false,"default":""},"orientation":{"type":"string","required":false,"default":"horizontal"},"value":{"type":"string","required":false}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-orientation","expression":"orientation","expressionPlan":{"source":"orientation","ast":{"kind":"id","name":"orientation"},"dependencies":["orientation"]}}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"select","type":"object({ value: string, previousValue: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("select", (event as CustomEvent<{ readonly value: string; readonly previousValue: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-tabs", props);
  root.value.addEventListener("select", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["defaultValue","orientation","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("select", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-tabs",
    "data-component-root": "ui-tabs",
    "data-looma-managed": "framework",
    "data-orientation": props.orientation,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
