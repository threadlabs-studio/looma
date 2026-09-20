import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSwitcher',
  props: {
    align: { type: [String, null], required: false },
    gap: { type: [String, null], required: false },
    threshold: { type: [String, null], required: false }
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
    { name: "threshold", attribute: "data-threshold", value: props.threshold, type: ["xs","sm","md","lg"], required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["align","gap","threshold"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-switcher",
    "data-component-root": "ui-switcher",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
  ], 16 /* FULL_PROPS */))
}
}

})
