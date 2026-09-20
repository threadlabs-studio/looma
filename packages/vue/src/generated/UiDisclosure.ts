import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiDisclosure',
  props: {
    defaultOpen: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    open: { type: [Boolean, null], required: false }
  },
  emits: ["open", "close"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-disclosure","props":{"defaultOpen":{"type":"boolean","required":false,"target":{"attribute":"defaultopen"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"}}}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"contentId","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"open","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("open", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-disclosure", props);
  root.value.addEventListener("open", eventListener0);
  root.value.addEventListener("close", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["defaultOpen","disabled","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("open", eventListener0);
  root.value?.removeEventListener("close", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-disclosure",
    "data-component-root": "ui-disclosure",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
  ], 16 /* FULL_PROPS */))
}
}

})
