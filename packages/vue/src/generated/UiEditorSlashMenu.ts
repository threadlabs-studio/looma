import { defineComponent as _defineComponent } from 'vue'
import { mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditorSlashMenu',
  props: {
    anchorRect: { type: [Object, null], required: false },
    items: { type: [Array, null], required: false },
    open: { type: [Boolean, null], required: false, default: false },
    query: { type: [String, null], required: false, default: "" },
    selectedIndex: { type: [Number, null], required: false, default: 0 }
  },
  emits: ["highlight", "select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valueanchorRect = props.anchorRect;
  const valueitems = props.items;
  const valueopen = props.open;
  const valuequery = props.query;
  const valueselectedIndex = props.selectedIndex;
  return { "anchorRect": passed("anchorRect", "anchor-rect") ? valueanchorRect : undefined, "items": passed("items", "items") ? valueitems : undefined, "open": passed("open", "open") ? valueopen : undefined, "query": passed("query", "query") ? valuequery : undefined, "selectedIndex": passed("selectedIndex", "selected-index") ? valueselectedIndex : undefined };
};
const definition = {...{"contract":{"tag":"ui-editor-slash-menu","props":{"anchorRect":{"type":{"kind":"union","members":[{"kind":"object","fields":[{"name":"left","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"top","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"right","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"bottom","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"x","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"y","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"width","type":{"kind":"terminal","name":"number"},"optional":true},{"name":"height","type":{"kind":"terminal","name":"number"},"optional":true}],"open":false},{"kind":"terminal","name":"null"}]},"required":false,"target":{"attribute":"anchorrect"}},"items":{"type":{"kind":"list","item":{"kind":"object","fields":[{"name":"title","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"description","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"icon","type":{"kind":"terminal","name":"string"},"optional":false}],"open":false}},"required":false,"target":{"attribute":"items"}},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false},"query":{"type":"string","required":false,"target":{"attribute":"query"},"default":""},"selectedIndex":{"type":{"kind":"terminal","name":"integer"},"required":false,"target":{"attribute":"selectedindex"},"default":0}}},"template":{"kind":"element","name":"div","attributes":[],"children":[]},"declarations":[{"kind":"event","name":"highlight","type":"object({ index: integer })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"select","type":"object({ index: integer })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("highlight", (event as CustomEvent<{ readonly index: number }>).detail);
const eventListener1 = (event: Event) => emit("select", (event as CustomEvent<{ readonly index: number }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editor-slash-menu", explicitProps());
  root.value.addEventListener("highlight", eventListener0);
  root.value.addEventListener("select", eventListener1);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("highlight", eventListener0);
  root.value?.removeEventListener("select", eventListener1);
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
