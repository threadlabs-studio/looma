import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorInsertTableGrid',
  props: {
    maxCols: { type: [Number, null], required: false, default: 8 },
    maxRows: { type: [Number, null], required: false, default: 8 },
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["looma-editor-insert-table"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-insert-table-grid","props":{"maxCols":{"type":{"kind":"terminal","name":"integer"},"required":false,"target":{"attribute":"maxcols"},"default":8},"maxRows":{"type":{"kind":"terminal","name":"integer"},"required":false,"target":{"attribute":"maxrows"},"default":8},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[],"children":[]},"declarations":[{"kind":"event","name":"looma-editor-insert-table","type":"object({ rows: integer, cols: integer, withHeaderRow: boolean })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("looma-editor-insert-table", (event as CustomEvent<{ readonly rows: number; readonly cols: number; readonly withHeaderRow: boolean }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-insert-table-grid", props);
  root.value.addEventListener("looma-editor-insert-table", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["maxCols","maxRows","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("looma-editor-insert-table", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-editor-insert-table-grid",
    "data-component-root": "ui-editor-insert-table-grid",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), null, 16 /* FULL_PROPS */))
}
}

})
