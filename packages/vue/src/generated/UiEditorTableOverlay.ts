import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorTableOverlay',
  props: {
    geometry: { type: [Object, null], required: false },
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["action"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-table-overlay","props":{"geometry":{"type":{"kind":"union","members":[{"kind":"object","fields":[{"name":"rowBoundaries","type":{"kind":"list","item":{"kind":"terminal","name":"number"}},"optional":false},{"name":"columnBoundaries","type":{"kind":"list","item":{"kind":"terminal","name":"number"}},"optional":false},{"name":"activeCell","type":{"kind":"union","members":[{"kind":"object","fields":[{"name":"left","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"top","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"width","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"height","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"rowIndex","type":{"kind":"terminal","name":"integer"},"optional":false},{"name":"columnIndex","type":{"kind":"terminal","name":"integer"},"optional":false}],"open":false},{"kind":"terminal","name":"null"}]},"optional":false},{"name":"hoveredCell","type":{"kind":"union","members":[{"kind":"object","fields":[{"name":"left","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"top","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"width","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"height","type":{"kind":"terminal","name":"number"},"optional":false},{"name":"rowIndex","type":{"kind":"terminal","name":"integer"},"optional":false},{"name":"columnIndex","type":{"kind":"terminal","name":"integer"},"optional":false}],"open":false},{"kind":"terminal","name":"null"}]},"optional":true}],"open":false},{"kind":"terminal","name":"null"}]},"required":false,"target":{"property":"geometry"}},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"property","key":"geometry","name":"geometry","expression":"geometry","expressionPlan":{"source":"geometry","ast":{"kind":"id","name":"geometry"},"dependencies":["geometry"]}}],"children":[]},"declarations":[{"kind":"event","name":"action","type":"object({ action: string, boundaryIndex?: integer, rowIndex?: integer, columnIndex?: integer, anchor?: object({ left: number, top: number, right: number, bottom: number }) })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("action", (event as CustomEvent<{ readonly action: string; readonly boundaryIndex?: number; readonly rowIndex?: number; readonly columnIndex?: number; readonly anchor?: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-table-overlay", props);
  root.value.addEventListener("action", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["geometry","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("action", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-editor-table-overlay",
    "data-component-root": "ui-editor-table-overlay",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */))
}
}

})
