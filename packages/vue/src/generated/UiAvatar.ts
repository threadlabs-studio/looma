import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "avatar",
  "data-component": "ui-avatar"
}
const _hoisted_2 = ["src"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiAvatar',
  props: {
    alt: { type: [String, null], required: false, default: "" },
    fallback: { type: [String, null], required: false, default: "" },
    name: { type: [String, null], required: false, default: "" },
    src: { type: [String, null], required: false, default: "" }
  },
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-avatar","props":{"alt":{"type":"string","required":false,"default":""},"fallback":{"type":"string","required":false,"default":""},"name":{"type":"string","required":false,"default":""},"src":{"type":"string","required":false,"default":""}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"role","value":"img"},{"kind":"attribute","name":"data-has-image","expression":"hasImage","expressionPlan":{"source":"hasImage","ast":{"kind":"id","name":"hasImage"},"dependencies":["hasImage"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"avatar"}],"children":[{"kind":"element","name":"img","attributes":[{"kind":"attribute","name":"src","expression":"src","expressionPlan":{"source":"src","ast":{"kind":"id","name":"src"},"dependencies":["src"]}},{"kind":"attribute","name":"hidden","expression":"not hasImage","expressionPlan":{"source":"not hasImage","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasImage"}},"dependencies":["hasImage"]}}],"children":[]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"fallback"}],"children":[]}]}]},"declarations":[{"kind":"state","name":"hasImage","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-avatar", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["alt","fallback","name","src"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-avatar",
    "data-component-root": "ui-avatar",
    "data-looma-managed": "framework",
    role: "img",
    "data-has-image": undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_1, [
      _createElementVNode("img", {
        src: props.src,
        hidden: undefined,
        "data-component": "ui-avatar"
      }, null, 8 /* PROPS */, _hoisted_2),
      _cache[0] || (_cache[0] = _createElementVNode("span", {
        class: "fallback",
        "data-component": "ui-avatar"
      }, null, -1 /* CACHED */))
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
