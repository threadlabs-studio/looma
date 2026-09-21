import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "menu__surface",
  "data-component": "ui-menu"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiMenu',
  props: {
    for: { type: [String, null], required: false, default: "" },
    open: { type: [Boolean, null], required: false, default: false },
    placement: { type: [String, null], required: false, default: "bottom-start" }
  },
  emits: ["select", "open", "close"],
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
  const valueopen = props.open;
  const valueplacement = props.placement;
  return { "for": passed("for", "for") ? valuefor : undefined, "open": passed("open", "open") ? valueopen : undefined, "placement": passed("placement", "placement") ? valueplacement : undefined };
};
const definition = {...{"contract":{"tag":"ui-menu","props":{"for":{"type":"string","required":false,"target":{"attribute":"for"},"default":""},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false},"placement":{"type":"string","required":false,"target":{"attribute":"placement"},"default":"bottom-start"}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"menu"},{"kind":"literal","name":"aria-orientation","value":"vertical"},{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"menu__surface"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"select","type":"object({ value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"open","type":"object({ open: boolean, reason: action | programmatic, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("select", (event as CustomEvent<{ readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("open", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener2 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-menu", explicitProps());
  root.value.addEventListener("select", eventListener0);
  root.value.addEventListener("open", eventListener1);
  root.value.addEventListener("close", eventListener2);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("select", eventListener0);
  root.value?.removeEventListener("open", eventListener1);
  root.value?.removeEventListener("close", eventListener2);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-menu",
    "data-component-root": "ui-menu",
    role: "menu",
    "aria-orientation": "vertical",
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
