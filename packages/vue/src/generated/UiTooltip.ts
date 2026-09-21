import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-inverse"]
const _hoisted_2 = {
  class: "tooltip__surface",
  "data-component": "ui-tooltip"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTooltip',
  props: {
    for: { type: [String, null], required: false, default: "" },
    hideDelay: { type: [Number, null], required: false, default: 100 },
    inverse: { type: [Boolean, null], required: false, default: false },
    open: { type: [Boolean, null], required: false, default: false },
    placement: { type: [String, null], required: false, default: "top-start" },
    showDelay: { type: [Number, null], required: false, default: 500 }
  },
  emits: ["open", "close"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuefor = props.for;
  const valuehideDelay = props.hideDelay;
  const valueinverse = props.inverse;
  const valueopen = props.open;
  const valueplacement = props.placement;
  const valueshowDelay = props.showDelay;
  return { "for": passed("for", "for") ? valuefor : undefined, "hideDelay": passed("hideDelay", "hide-delay") ? valuehideDelay : undefined, "inverse": passed("inverse", "inverse") ? valueinverse : undefined, "open": passed("open", "open") ? valueopen : undefined, "placement": passed("placement", "placement") ? valueplacement : undefined, "showDelay": passed("showDelay", "show-delay") ? valueshowDelay : undefined };
};
const definition = {...{"contract":{"tag":"ui-tooltip","props":{"for":{"type":"string","required":false,"target":{"attribute":"for"},"default":""},"hideDelay":{"type":"number","required":false,"target":{"attribute":"hidedelay"},"default":100},"inverse":{"type":"boolean","required":false,"target":{"attribute":"data-inverse"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false},"placement":{"type":"string","required":false,"target":{"attribute":"placement"},"default":"top-start"},"showDelay":{"type":"number","required":false,"target":{"attribute":"showdelay"},"default":500}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"role","value":"tooltip"},{"kind":"attribute","name":"hidden","expression":"not internalOpen","expressionPlan":{"source":"not internalOpen","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"internalOpen"}},"dependencies":["internalOpen"]}},{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}},{"kind":"attribute","name":"data-inverse","expression":"inverse","expressionPlan":{"source":"inverse","ast":{"kind":"id","name":"inverse"},"dependencies":["inverse"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"tooltip__surface"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"open","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("open", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-tooltip", explicitProps());
  root.value.addEventListener("open", eventListener0);
  root.value.addEventListener("close", eventListener1);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
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
    "data-inverse": props.inverse ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_2, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
