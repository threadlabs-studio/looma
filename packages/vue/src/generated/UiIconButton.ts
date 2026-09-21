import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled", "aria-label"]

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
const definition = {...{"contract":{"tag":"ui-icon-button","props":{"anticipatory":{"type":"boolean","required":false,"target":{"attribute":"anticipatory"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"label":{"type":"string","required":false,"target":{"attribute":"aria-label"},"default":""},"size":{"type":{"enum":["sm","md","lg"]},"required":false,"target":{"attribute":"size"},"default":"md"},"variant":{"type":{"enum":["ghost","outline","solid"]},"required":false,"target":{"attribute":"variant"},"default":"ghost"}}},"template":{"kind":"element","name":"button","attributes":[{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"literal","name":"type","value":"button"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"button","choices":["button"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
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
  return (_openBlock(), _createElementBlock("button", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-icon-button",
    "data-component-root": "ui-icon-button",
    "data-looma-managed": "framework",
    "data-disabled": props.disabled ? '' : undefined,
    type: "button",
    "aria-label": props.label,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
