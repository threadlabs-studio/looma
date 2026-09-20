import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-appearance", "data-size"]
const _hoisted_2 = {
  class: "chip__surface",
  "data-component": "ui-chip"
}
const _hoisted_3 = {
  class: "chip__label",
  "data-component": "ui-chip"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiChip',
  props: {
    appearance: { type: [String, null], required: false, default: "tag" },
    size: { type: [String, null], required: false, default: "xs" }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "appearance", attribute: "data-appearance", value: props.appearance, type: "string", required: false },
    { name: "size", attribute: "data-size", value: props.size, type: "string", required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["appearance","size"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-chip",
    "data-component-root": "ui-chip",
    "data-looma-managed": "framework",
    "data-appearance": props.appearance,
    "data-size": props.size,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", _hoisted_2, [
      _createElementVNode("span", _hoisted_3, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
