import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-value"]
const _hoisted_2 = {
  class: "menu-item__surface",
  "data-component": "ui-menu-item"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps, updateGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiMenuItem',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "" }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuedisabled = props.disabled;
  const valuevalue = props.value;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  const explicit = explicitProps();
  detach = manageGeneratedProps(root.value, [
    { name: "disabled", attribute: "data-disabled", value: explicit["disabled"], default: false, type: "boolean", required: false },
    { name: "value", attribute: "data-value", value: explicit["value"], default: "", bound: true, type: "string", required: false },
  ]);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateGeneratedProps(root.value, next);
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
