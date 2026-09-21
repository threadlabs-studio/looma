import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiInline',
  props: {
    align: { type: [String, null], required: false },
    gap: { type: [String, null], required: false },
    justify: { type: [String, null], required: false },
    wrap: { type: [Boolean, null], required: false, default: false }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "align", attribute: "data-align", value: props.align, type: ["start","center","end","stretch"], required: false },
    { name: "gap", attribute: "data-gap", value: props.gap, type: ["xs","s","m","l","xl"], required: false },
    { name: "justify", attribute: "data-justify", value: props.justify, type: ["start","center","end","between"], required: false },
    { name: "wrap", attribute: "data-wrap", value: props.wrap, type: "boolean", required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["align","gap","justify","wrap"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-inline",
    "data-component-root": "ui-inline",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
