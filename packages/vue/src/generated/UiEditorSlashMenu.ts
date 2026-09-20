import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorSlashMenu',
  props: {
    anchorRect: { type: null, required: false },
    items: { type: [Array, null], required: false },
    open: { type: [Boolean, null], required: false, default: false },
    query: { type: [String, null], required: false, default: "" },
    selectedIndex: { type: [Number, null], required: false, default: 0 }
  },
  emits: ["looma-editor-slash-menu-highlight", "looma-editor-slash-menu-select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-slash-menu","props":{"anchorRect":{"type":{"kind":"terminal","name":"unknown"},"required":false},"items":{"type":{"kind":"list","item":{"kind":"terminal","name":"unknown"}},"required":false},"open":{"type":"boolean","required":false,"default":false},"query":{"type":"string","required":false,"default":""},"selectedIndex":{"type":{"kind":"terminal","name":"integer"},"required":false,"default":0}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"property","key":"items","name":"items","expression":"items","expressionPlan":{"source":"items","ast":{"kind":"id","name":"items"},"dependencies":["items"]}},{"kind":"property","key":"anchorrect","name":"anchorRect","expression":"anchorRect","expressionPlan":{"source":"anchorRect","ast":{"kind":"id","name":"anchorRect"},"dependencies":["anchorRect"]}}],"children":[]},"declarations":[{"kind":"event","name":"looma-editor-slash-menu-highlight","type":"object({ index: integer })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"looma-editor-slash-menu-select","type":"object({ index: integer })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("looma-editor-slash-menu-highlight", (event as CustomEvent<{ readonly index: number }>).detail);
const eventListener1 = (event: Event) => emit("looma-editor-slash-menu-select", (event as CustomEvent<{ readonly index: number }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-slash-menu", props);
  root.value.addEventListener("looma-editor-slash-menu-highlight", eventListener0);
  root.value.addEventListener("looma-editor-slash-menu-select", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["anchorRect","items","open","query","selectedIndex"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("looma-editor-slash-menu-highlight", eventListener0);
  root.value?.removeEventListener("looma-editor-slash-menu-select", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-editor-slash-menu",
    "data-component-root": "ui-editor-slash-menu",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */))
}
}

})
