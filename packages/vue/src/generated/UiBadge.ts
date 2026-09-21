import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-variant", "data-tone"]
const _hoisted_2 = {
  class: "badge__surface",
  "data-component": "ui-badge"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps, updateGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiBadge',
  props: {
    tone: { type: [String, null], required: false, default: "neutral" },
    variant: { type: [String, null], required: false, default: "subtle" }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuetone = props.tone;
  const valuevariant = props.variant;
  return { "tone": passed("tone", "tone") ? valuetone : undefined, "variant": passed("variant", "variant") ? valuevariant : undefined };
};
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  const explicit = explicitProps();
  detach = manageGeneratedProps(root.value, [
    { name: "tone", attribute: "data-tone", value: explicit["tone"], default: "neutral", bound: true, type: ["neutral","accent","info","success","warning","danger"], required: false },
    { name: "variant", attribute: "data-variant", value: explicit["variant"], default: "subtle", bound: true, type: ["solid","subtle"], required: false },
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
