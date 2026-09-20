import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorTableToolbar',
  props: {
    canAddColumnAfter: { type: [Boolean, null], required: false, default: false },
    canAddColumnBefore: { type: [Boolean, null], required: false, default: false },
    canAddRowAfter: { type: [Boolean, null], required: false, default: false },
    canAddRowBefore: { type: [Boolean, null], required: false, default: false },
    canDeleteColumn: { type: [Boolean, null], required: false, default: false },
    canDeleteRow: { type: [Boolean, null], required: false, default: false },
    canDeleteTable: { type: [Boolean, null], required: false, default: false },
    canMergeCells: { type: [Boolean, null], required: false, default: false },
    canSplitCell: { type: [Boolean, null], required: false, default: false },
    cellAlignment: { type: [String, null], required: false, default: "left" },
    cellBackground: { type: [String, null], required: false, default: "" },
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["looma-editor-table-action"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editor-table-toolbar","props":{"canAddColumnAfter":{"type":"boolean","required":false,"target":{"attribute":"canaddcolumnafter"},"default":false},"canAddColumnBefore":{"type":"boolean","required":false,"target":{"attribute":"canaddcolumnbefore"},"default":false},"canAddRowAfter":{"type":"boolean","required":false,"target":{"attribute":"canaddrowafter"},"default":false},"canAddRowBefore":{"type":"boolean","required":false,"target":{"attribute":"canaddrowbefore"},"default":false},"canDeleteColumn":{"type":"boolean","required":false,"target":{"attribute":"candeletecolumn"},"default":false},"canDeleteRow":{"type":"boolean","required":false,"target":{"attribute":"candeleterow"},"default":false},"canDeleteTable":{"type":"boolean","required":false,"target":{"attribute":"candeletetable"},"default":false},"canMergeCells":{"type":"boolean","required":false,"target":{"attribute":"canmergecells"},"default":false},"canSplitCell":{"type":"boolean","required":false,"target":{"attribute":"cansplitcell"},"default":false},"cellAlignment":{"type":{"enum":["left","center","right"]},"required":false,"target":{"attribute":"cellalignment"},"default":"left"},"cellBackground":{"type":"string","required":false,"target":{"attribute":"cellbackground"},"default":""},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[],"children":[]},"declarations":[{"kind":"event","name":"looma-editor-table-action","type":"object({ action: string })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("looma-editor-table-action", (event as CustomEvent<{ readonly action: string }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-table-toolbar", props);
  root.value.addEventListener("looma-editor-table-action", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["canAddColumnAfter","canAddColumnBefore","canAddRowAfter","canAddRowBefore","canDeleteColumn","canDeleteRow","canDeleteTable","canMergeCells","canSplitCell","cellAlignment","cellBackground","open"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("looma-editor-table-action", eventListener0);
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
