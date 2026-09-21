import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorMentionMenu',
  props: {
    anchorRect: { type: [Object, null], required: false },
    items: { type: [Array, null], required: false },
    loading: { type: [Boolean, null], required: false, default: false },
    open: { type: [Boolean, null], required: false, default: false },
    query: { type: [String, null], required: false, default: "" },
    selectedIndex: { type: [Number, null], required: false, default: 0 }
  },
  emits: ["highlight", "select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-mention-menu","props":{"anchorRect":{"type":{"kind":"union","members":[{"kind":"object","fields":[{"name":"left","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"top","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"right","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"bottom","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"x","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"y","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"width","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"height","type":{"kind":"terminal","name":"number"},"optional":true}],"open":false},{"kind":"terminal","name":"null"}]},"required":false,"target":{"property":"anchorRect"}},"items":{"type":{"kind":"list","item":{"kind":"object","fields":[{"name":"id","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"label","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"detail","type":{"kind":"terminal","name":"string"},"optional":true},{"name":"initials","type":{"kind":"terminal","name":"string"},"optional":true}],"open":false}},"required":false,"target":{"property":"items"}},"loading":{"type":"boolean","required":false,"target":{"attribute":"loading"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false},"query":{"type":"string","required":false,"target":{"attribute":"query"},"default":""},"selectedIndex":{"type":{"kind":"terminal","name":"integer"},"required":false,"target":{"attribute":"selectedindex"},"default":0}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"property","key":"items","name":"items","expression":"items","expressionPlan":{"source":"items","ast":{"kind":"id","name":"items"},"dependencies":["items"]}},{"kind":"property","key":"anchorrect","name":"anchorRect","expression":"anchorRect","expressionPlan":{"source":"anchorRect","ast":{"kind":"id","name":"anchorRect"},"dependencies":["anchorRect"]}}],"children":[]},"declarations":[{"kind":"event","name":"highlight","type":"object({ index: integer })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"select","type":"object({ index: integer })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("highlight", (event as CustomEvent<{ readonly index: number }>).detail);
const eventListener1 = (event: Event) => emit("select", (event as CustomEvent<{ readonly index: number }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-mention-menu", props);
  root.value.addEventListener("highlight", eventListener0);
  root.value.addEventListener("select", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["anchorRect","items","loading","open","query","selectedIndex"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("highlight", eventListener0);
  root.value?.removeEventListener("select", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-editor-mention-menu",
    "data-component-root": "ui-editor-mention-menu",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */))
}
}

})
