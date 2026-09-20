import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorTableOverlay',
  props: {
    activeCell: { type: [String, Array, null], required: false },
    cols: { type: [Number, null], required: false, default: 3 },
    columnBoundaries: { type: [String, Array, null], required: false },
    geometry: { type: null, required: false },
    hoveredCell: { type: [String, Array, null], required: false },
    open: { type: [Boolean, null], required: false, default: false },
    rowBoundaries: { type: [String, Array, null], required: false },
    rows: { type: [Number, null], required: false, default: 3 }
  },
  emits: ["looma-editor-table-overlay-action"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-table-overlay","props":{"activeCell":{"type":{"kind":"union","members":[{"kind":"terminal","name":"string"},{"kind":"list","item":{"kind":"terminal","name":"number"}}]},"required":false},"cols":{"type":{"kind":"terminal","name":"integer"},"required":false,"default":3},"columnBoundaries":{"type":{"kind":"union","members":[{"kind":"terminal","name":"string"},{"kind":"list","item":{"kind":"terminal","name":"number"}}]},"required":false},"geometry":{"type":{"kind":"terminal","name":"unknown"},"required":false},"hoveredCell":{"type":{"kind":"union","members":[{"kind":"terminal","name":"string"},{"kind":"list","item":{"kind":"terminal","name":"number"}}]},"required":false},"open":{"type":"boolean","required":false,"default":false},"rowBoundaries":{"type":{"kind":"union","members":[{"kind":"terminal","name":"string"},{"kind":"list","item":{"kind":"terminal","name":"number"}}]},"required":false},"rows":{"type":{"kind":"terminal","name":"integer"},"required":false,"default":3}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"property","key":"geometry","name":"geometry","expression":"geometry","expressionPlan":{"source":"geometry","ast":{"kind":"id","name":"geometry"},"dependencies":["geometry"]}}],"children":[]},"declarations":[{"kind":"event","name":"looma-editor-table-overlay-action","type":"object({ action: string, boundaryIndex?: integer, rowIndex?: integer, columnIndex?: integer, anchor?: object({ left: number, top: number, right: number, bottom: number }) })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("looma-editor-table-overlay-action", (event as CustomEvent<{ readonly action: string; readonly boundaryIndex?: number; readonly rowIndex?: number; readonly columnIndex?: number; readonly anchor?: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number } }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-table-overlay", props);
  root.value.addEventListener("looma-editor-table-overlay-action", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["activeCell","cols","columnBoundaries","geometry","hoveredCell","open","rowBoundaries","rows"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("looma-editor-table-overlay-action", eventListener0);
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
