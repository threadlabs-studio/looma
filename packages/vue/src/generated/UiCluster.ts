import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps, updateGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCluster',
  props: {
    align: { type: [String, null], required: false },
    gap: { type: [String, null], required: false }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuealign = props.align;
  const valuegap = props.gap;
  return { "align": passed("align", "align") ? valuealign : undefined, "gap": passed("gap", "gap") ? valuegap : undefined };
};
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  const explicit = explicitProps();
  detach = manageGeneratedProps(root.value, [
    { name: "align", attribute: "data-align", value: explicit["align"], type: ["start","center","end","stretch"], required: false },
    { name: "gap", attribute: "data-gap", value: explicit["gap"], type: ["xs","s","m","l","xl"], required: false },
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
    "data-component": "ui-cluster",
    "data-component-root": "ui-cluster",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
