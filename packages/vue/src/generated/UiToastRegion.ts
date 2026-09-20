import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiToastRegion',
  props: {
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["close", "dismiss"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-toast-region","props":{"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"region"},{"kind":"literal","name":"aria-label","value":"Notifications"},{"kind":"literal","name":"aria-live","value":"polite"},{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"dismiss","type":"object({ id: string, reason: action, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("dismiss", (event as CustomEvent<{ readonly id: string; readonly reason: "action"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-toast-region", props);
  root.value.addEventListener("close", eventListener0);
  root.value.addEventListener("dismiss", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("close", eventListener0);
  root.value?.removeEventListener("dismiss", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-toast-region",
    "data-component-root": "ui-toast-region",
    "data-looma-managed": "framework",
    role: "region",
    "aria-label": "Notifications",
    "aria-live": "polite",
    "data-state-open": undefined,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
