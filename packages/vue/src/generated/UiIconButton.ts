import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled"]
const _hoisted_2 = ["aria-label"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiIconButton',
  props: {
    anticipatory: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false, default: "" },
    size: { type: [String, null], required: false, default: "md" },
    variant: { type: [String, null], required: false, default: "ghost" }
  },
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-icon-button","props":{"anticipatory":{"type":"boolean","required":false,"default":false},"disabled":{"type":"boolean","required":false,"default":false},"label":{"type":"string","required":false,"default":""},"size":{"type":"string","required":false,"default":"md"},"variant":{"type":"string","required":false,"default":"ghost"}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[{"kind":"slot"}]}]},"declarations":[],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-icon-button", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["anticipatory","disabled","label","size","variant"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-icon-button",
    "data-component-root": "ui-icon-button",
    "data-looma-managed": "framework",
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("button", {
      type: "button",
      "aria-label": props.label,
      "data-component": "ui-icon-button"
    }, [
      _renderSlot(_ctx.$slots, "default")
    ], 8 /* PROPS */, _hoisted_2)
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
