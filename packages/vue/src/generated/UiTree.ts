import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTree',
  props: {
    hoverExpandDelay: { type: [Number, null], required: false, default: 700 },
    label: { type: [String, null], required: false, default: "Tree" },
    maxDepth: { type: [Number, null], required: false, default: 0 }
  },
  emits: ["reorder", "reorder-rejected"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-tree","props":{"hoverExpandDelay":{"type":"number","required":false,"target":{"attribute":"hoverexpanddelay"},"default":700},"label":{"type":"string","required":false,"target":{"attribute":"label"},"default":"Tree"},"maxDepth":{"type":"number","required":false,"target":{"attribute":"maxdepth"},"default":0}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"tree"}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"event","name":"reorder","type":"object({ sourceId: string, targetId: string, position: before | inside | after, sourceType: string, targetType: string, sourceScope: string, targetScope: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"reorder-rejected","type":"object({ sourceId: string, targetId: string, position: before | inside | after, reason: max-depth, maxDepth: integer, resultingDepth: integer, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("reorder", (event as CustomEvent<{ readonly sourceId: string; readonly targetId: string; readonly position: "before" | "inside" | "after"; readonly sourceType: string; readonly targetType: string; readonly sourceScope: string; readonly targetScope: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("reorder-rejected", (event as CustomEvent<{ readonly sourceId: string; readonly targetId: string; readonly position: "before" | "inside" | "after"; readonly reason: "max-depth"; readonly maxDepth: number; readonly resultingDepth: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-tree", props);
  root.value.addEventListener("reorder", eventListener0);
  root.value.addEventListener("reorder-rejected", eventListener1);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["hoverExpandDelay","label","maxDepth"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("reorder", eventListener0);
  root.value?.removeEventListener("reorder-rejected", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-tree",
    "data-component-root": "ui-tree",
    "data-looma-managed": "framework",
    role: "tree",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
  ], 16 /* FULL_PROPS */))
}
}

})
