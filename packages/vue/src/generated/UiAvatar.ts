import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "avatar",
  "data-component": "ui-avatar"
}
const _hoisted_2 = ["src"]

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
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
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuealt = props.alt;
  const valuefallback = props.fallback;
  const valuename = props.name;
  const valuesrc = props.src;
  return { "alt": passed("alt", "alt") ? valuealt : undefined, "fallback": passed("fallback", "fallback") ? valuefallback : undefined, "name": passed("name", "name") ? valuename : undefined, "src": passed("src", "src") ? valuesrc : undefined };
};
const definition = {...{"contract":{"tag":"ui-avatar","props":{"alt":{"type":"string","required":false,"target":{"attribute":"alt"},"default":""},"fallback":{"type":"string","required":false,"target":{"attribute":"fallback"},"default":""},"name":{"type":"string","required":false,"target":{"attribute":"name"},"default":""},"src":{"type":"string","required":false,"target":{"attribute":"src"},"default":""}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-has-image","expression":"hasImage","expressionPlan":{"source":"hasImage","ast":{"kind":"id","name":"hasImage"},"dependencies":["hasImage"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"avatar"}],"children":[{"kind":"slot"},{"kind":"element","name":"img","attributes":[{"kind":"literal","name":"class","value":"avatar__managed-image"},{"kind":"attribute","name":"src","expression":"src","expressionPlan":{"source":"src","ast":{"kind":"id","name":"src"},"dependencies":["src"]}},{"kind":"literal","name":"alt","value":""},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"fallback"}],"children":[]}]}]},"declarations":[{"kind":"state","name":"hasImage","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasAuthoredImage","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-avatar", explicitProps());
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-avatar",
    "data-component-root": "ui-avatar",
    "data-has-image": undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_1, [
      _renderSlot(_ctx.$slots, "default"),
      _createElementVNode("img", {
        class: "avatar__managed-image",
        src: props.src,
        alt: "",
        "aria-hidden": "true",
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
