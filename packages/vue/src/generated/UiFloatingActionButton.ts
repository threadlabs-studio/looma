import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled"]
const _hoisted_2 = ["aria-label"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiFloatingActionButton',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false, default: "" },
    mobileOnly: { type: [Boolean, null], required: false, default: false }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "disabled", attribute: "data-disabled", value: props.disabled, type: "boolean", required: false },
    { name: "label", attribute: "data-label", value: props.label, type: "string", required: false },
    { name: "mobileOnly", attribute: "data-mobile-only", value: props.mobileOnly, type: "boolean", required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","label","mobileOnly"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-floating-action-button",
    "data-component-root": "ui-floating-action-button",
    "data-looma-managed": "framework",
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("button", {
      type: "button",
      "aria-label": props.label,
      "data-component": "ui-floating-action-button"
    }, [
      _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
    ], 8 /* PROPS */, _hoisted_2)
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
