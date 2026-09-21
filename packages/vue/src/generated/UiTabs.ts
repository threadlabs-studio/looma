import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-orientation"]
const _hoisted_2 = ["aria-label"]
const _hoisted_3 = {
  class: "tabs__panels",
  "data-component": "ui-tabs"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTabs',
  props: {
    label: { type: [String, null], required: false, default: "Tabs" },
    orientation: { type: [String, null], required: false, default: "horizontal" },
    value: { type: [String, null], required: false, default: "" }
  },
  emits: ["select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-tabs","props":{"label":{"type":"string","required":false,"target":{"attribute":"aria-label"},"default":"Tabs"},"orientation":{"type":{"enum":["horizontal","vertical"]},"required":false,"target":{"attribute":"data-orientation"},"default":"horizontal"},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":""}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-orientation","expression":"orientation","expressionPlan":{"source":"orientation","ast":{"kind":"id","name":"orientation"},"dependencies":["orientation"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"tabs__list"},{"kind":"literal","name":"role","value":"tablist"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"tabs__panels"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"select","type":"object({ value: string, previousValue: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
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
  for (const name of ["label","orientation","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
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
    _createElementVNode("div", {
      class: "tabs__list",
      role: "tablist",
      "aria-label": props.label,
      "data-component": "ui-tabs"
    }, null, 8 /* PROPS */, _hoisted_2),
    _createElementVNode("div", _hoisted_3, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
