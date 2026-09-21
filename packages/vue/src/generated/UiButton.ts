import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-size", "data-variant"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiButton',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    size: { type: [String, null], required: false },
    variant: { type: [String, null], required: false, default: "outline" }
  },
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-button","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"size":{"type":"string","required":false,"target":{"attribute":"data-size"}},"variant":{"type":"string","required":false,"target":{"attribute":"data-variant"},"default":"outline"}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-size","expression":"size","expressionPlan":{"source":"size","ast":{"kind":"id","name":"size"},"dependencies":["size"]}},{"kind":"attribute","name":"data-variant","expression":"variant","expressionPlan":{"source":"variant","ast":{"kind":"id","name":"variant"},"dependencies":["variant"]}}],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-button", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","size","variant"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-button",
    "data-component-root": "ui-button",
    "data-looma-managed": "framework",
    "data-size": props.size,
    "data-variant": props.variant,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
