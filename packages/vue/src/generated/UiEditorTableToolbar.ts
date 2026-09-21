import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorTableToolbar',
  props: {
    actions: { type: [Array, null], required: false },
    cellAlignment: { type: [String, null], required: false, default: "left" },
    cellBackground: { type: [String, null], required: false, default: "" },
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["action"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-table-toolbar","props":{"actions":{"type":{"kind":"list","item":{"kind":"union","members":[{"kind":"keyword","value":"align-left"},{"kind":"keyword","value":"align-center"},{"kind":"keyword","value":"align-right"},{"kind":"keyword","value":"background-none"},{"kind":"keyword","value":"background-gray"},{"kind":"keyword","value":"background-yellow"},{"kind":"keyword","value":"background-blue"},{"kind":"keyword","value":"background-green"},{"kind":"keyword","value":"background-red"},{"kind":"keyword","value":"add-row-before"},{"kind":"keyword","value":"add-row-after"},{"kind":"keyword","value":"add-column-before"},{"kind":"keyword","value":"add-column-after"},{"kind":"keyword","value":"clear-cells"},{"kind":"keyword","value":"merge-cells"},{"kind":"keyword","value":"split-cell"},{"kind":"keyword","value":"delete-row"},{"kind":"keyword","value":"delete-column"},{"kind":"keyword","value":"delete-table"}]}},"required":false,"target":{"attribute":"actions"}},"cellAlignment":{"type":{"enum":["left","center","right"]},"required":false,"target":{"attribute":"cellalignment"},"default":"left"},"cellBackground":{"type":"string","required":false,"target":{"attribute":"cellbackground"},"default":""},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[],"children":[]},"declarations":[{"kind":"event","name":"action","type":"object({ action: string })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("action", (event as CustomEvent<{ readonly action: string }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-table-toolbar", props);
  root.value.addEventListener("action", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["actions","cellAlignment","cellBackground","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("action", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-editor-table-toolbar",
    "data-component-root": "ui-editor-table-toolbar",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */))
}
}

})
