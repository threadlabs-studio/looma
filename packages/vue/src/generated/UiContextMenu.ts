import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, unref as _unref, withCtx as _withCtx, createVNode as _createVNode, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "menu",
  "data-state-open": undefined,
  "data-component": "ui-context-menu"
}

import UiMenu from "./UiMenu";
import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiContextMenu',
  props: {
    defaultOpen: { type: [Boolean, null], required: false, default: false },
    for: { type: [String, null], required: false },
    open: { type: [Boolean, null], required: false, default: undefined }
  },
  emits: ["open", "close", "select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-context-menu","props":{"defaultOpen":{"type":"boolean","required":false,"target":{"attribute":"defaultopen"},"default":false},"for":{"type":"string","required":false,"target":{"attribute":"for"}},"open":{"type":"boolean","required":false,"target":{"attribute":"open"}}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"slot","fallback":[],"name":"trigger"},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"menu"},{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"element","name":"ui-menu","attributes":[],"children":[{"kind":"slot"}]}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"focusTrigger","expression":{"source":"'programmatic'","ast":{"kind":"literal","value":"programmatic"},"dependencies":[]}},{"kind":"event","name":"open","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"select","type":"object({ value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("open", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener2 = (event: Event) => emit("select", (event as CustomEvent<{ readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-context-menu", props);
  root.value.addEventListener("open", eventListener0);
  root.value.addEventListener("close", eventListener1);
  root.value.addEventListener("select", eventListener2);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["defaultOpen","for","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("open", eventListener0);
  root.value?.removeEventListener("close", eventListener1);
  root.value?.removeEventListener("select", eventListener2);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-context-menu",
    "data-component-root": "ui-context-menu",
    "data-looma-managed": "framework",
    "data-state-open": undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", { slot: "trigger", "data-looma-framework-slot": "trigger", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "trigger")]),
    _createElementVNode("div", _hoisted_1, [
      _createVNode(_unref(UiMenu), { "data-component": "ui-context-menu" }, {
        default: _withCtx(() => [
          _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
        ]),
        _: 3 /* FORWARDED */
      })
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
