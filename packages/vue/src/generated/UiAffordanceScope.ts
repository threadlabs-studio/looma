import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiAffordanceScope',
  props: {
    nearRadius: { type: [Number, null], required: false, default: 16 }
  },
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-affordance-scope","props":{"nearRadius":{"type":"number","required":false,"target":{"attribute":"nearradius"},"default":16}}},"template":{"kind":"element","name":"span","attributes":[],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-affordance-scope", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["nearRadius"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-affordance-scope",
    "data-component-root": "ui-affordance-scope",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
  ], 16 /* FULL_PROPS */))
}
}

})
