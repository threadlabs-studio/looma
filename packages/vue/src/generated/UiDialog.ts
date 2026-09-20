import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  "aria-label": undefined,
  "data-component": "ui-dialog"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiDialog',
  props: {
    defaultOpen: { type: [Boolean, null], required: false, default: false },
    dismissible: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false },
    modal: { type: [Boolean, null], required: false, default: false },
    open: { type: [Boolean, null], required: false }
  },
  emits: ["close"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-dialog","props":{"defaultOpen":{"type":"boolean","required":false,"target":{"attribute":"defaultopen"},"default":false},"dismissible":{"type":"boolean","required":false,"target":{"attribute":"dismissible"},"default":false},"label":{"type":"string","required":false,"target":{"attribute":"label"}},"modal":{"type":"boolean","required":false,"target":{"attribute":"modal"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"}}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"element","name":"dialog","attributes":[{"kind":"attribute","name":"aria-label","expression":"accessibleLabel","expressionPlan":{"source":"accessibleLabel","ast":{"kind":"id","name":"accessibleLabel"},"dependencies":["accessibleLabel"]}}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"accessibleLabel","expression":{"source":"'Dialog'","ast":{"kind":"literal","value":"Dialog"},"dependencies":[]}},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-dialog", props);
  root.value.addEventListener("close", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["defaultOpen","dismissible","label","modal","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("close", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-dialog",
    "data-component-root": "ui-dialog",
    "data-looma-managed": "framework",
    "data-state-open": undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("dialog", _hoisted_1, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
