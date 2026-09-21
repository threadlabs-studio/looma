import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "tooltip__surface",
  "data-component": "ui-tooltip"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTooltip',
  props: {
    for: { type: [String, null], required: false, default: "" },
    hideDelay: { type: [Number, null], required: false, default: 100 },
    open: { type: [Boolean, null], required: false, default: false },
    placement: { type: [String, null], required: false, default: "top-start" },
    showDelay: { type: [Number, null], required: false, default: 500 }
  },
  emits: ["open", "close"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-tooltip","props":{"for":{"type":"string","required":false,"target":{"attribute":"for"},"default":""},"hideDelay":{"type":"number","required":false,"target":{"attribute":"hidedelay"},"default":100},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false},"placement":{"type":"string","required":false,"target":{"attribute":"placement"},"default":"top-start"},"showDelay":{"type":"number","required":false,"target":{"attribute":"showdelay"},"default":500}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"role","value":"tooltip"},{"kind":"attribute","name":"hidden","expression":"not internalOpen","expressionPlan":{"source":"not internalOpen","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"internalOpen"}},"dependencies":["internalOpen"]}},{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"tooltip__surface"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"open","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("open", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-tooltip", props);
  root.value.addEventListener("open", eventListener0);
  root.value.addEventListener("close", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["for","hideDelay","open","placement","showDelay"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("open", eventListener0);
  root.value?.removeEventListener("close", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-tooltip",
    "data-component-root": "ui-tooltip",
    "data-looma-managed": "framework",
    role: "tooltip",
    hidden: undefined,
    "data-state-open": undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_1, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
