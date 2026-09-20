import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-tone"]
const _hoisted_2 = {
  class: "callout__surface",
  "data-component": "ui-callout"
}
const _hoisted_3 = {
  class: "content",
  "data-component": "ui-callout"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { manageGeneratedProps } from "@threadlabs/looma-core/declarative-generated";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCallout',
  props: {
    tone: { type: [String, null], required: false, default: "info" }
  },
  setup(__props: any) {



const props = __props;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = manageGeneratedProps(root.value, [
    { name: "tone", attribute: "data-tone", value: props.tone, type: "string", required: false },
  ]);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["tone"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-callout",
    "data-component-root": "ui-callout",
    "data-looma-managed": "framework",
    role: "note",
    "data-tone": props.tone,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_2, [
      _cache[0] || (_cache[0] = _createElementVNode("span", {
        class: "icon",
        "aria-hidden": "true",
        "data-component": "ui-callout"
      }, null, -1 /* CACHED */)),
      _createElementVNode("div", _hoisted_3, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
