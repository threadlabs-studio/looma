import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-value"]
const _hoisted_2 = {
  class: "menu-item__surface",
  "data-component": "ui-menu-item"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiMenuItem',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "" }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "disabled", attribute: "data-disabled", value: props.disabled, type: "boolean", required: false },
    { name: "value", attribute: "data-value", value: props.value, type: "string", required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-menu-item",
    "data-component-root": "ui-menu-item",
    "data-looma-managed": "framework",
    role: "menuitem",
    "data-value": props.value,
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
