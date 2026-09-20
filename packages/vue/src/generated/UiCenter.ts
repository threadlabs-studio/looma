import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCenter',
  props: {
    gutters: { type: [String, null], required: false },
    measure: { type: [String, null], required: false }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "gutters", attribute: "data-gutters", value: props.gutters, type: ["s","m","l"], required: false },
    { name: "measure", attribute: "data-measure", value: props.measure, type: ["narrow","wide"], required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["gutters","measure"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
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
