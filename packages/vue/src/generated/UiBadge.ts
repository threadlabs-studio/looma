import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-variant", "data-tone"]
const _hoisted_2 = {
  class: "badge__surface",
  "data-component": "ui-badge"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiBadge',
  props: {
    tone: { type: [String, null], required: false, default: "neutral" },
    variant: { type: [String, null], required: false, default: "subtle" }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "tone", attribute: "data-tone", value: props.tone, type: ["neutral","accent","info","success","warning","danger"], required: false },
    { name: "variant", attribute: "data-variant", value: props.variant, type: ["solid","subtle"], required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["tone","variant"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-badge",
    "data-component-root": "ui-badge",
    "data-looma-managed": "framework",
    "data-variant": props.variant,
    "data-tone": props.tone,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", _hoisted_2, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
