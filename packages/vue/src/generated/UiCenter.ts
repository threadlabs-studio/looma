import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps, updateGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCenter',
  props: {
    gutters: { type: [String, null], required: false },
    measure: { type: [String, null], required: false }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuegutters = props.gutters;
  const valuemeasure = props.measure;
  return { "gutters": passed("gutters", "gutters") ? valuegutters : undefined, "measure": passed("measure", "measure") ? valuemeasure : undefined };
};
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  const explicit = explicitProps();
  detach = manageGeneratedProps(root.value, [
    { name: "gutters", attribute: "data-gutters", value: explicit["gutters"], type: ["s","m","l"], required: false },
    { name: "measure", attribute: "data-measure", value: explicit["measure"], type: ["narrow","wide"], required: false },
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
    "data-component": "ui-center",
    "data-component-root": "ui-center",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
