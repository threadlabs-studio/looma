import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "top-bar",
  part: "base",
  "data-component": "ui-top-bar"
}
const _hoisted_2 = {
  class: "top-bar__leading",
  hidden: undefined,
  "data-component": "ui-top-bar"
}
const _hoisted_3 = {
  class: "top-bar__title",
  "data-component": "ui-top-bar"
}
const _hoisted_4 = {
  class: "top-bar__search",
  hidden: undefined,
  "data-component": "ui-top-bar"
}
const _hoisted_5 = {
  class: "top-bar__actions",
  hidden: undefined,
  "data-component": "ui-top-bar"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTopBar',
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-top-bar","props":{}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"element","name":"header","attributes":[{"kind":"literal","name":"class","value":"top-bar"},{"kind":"literal","name":"part","value":"base"}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"top-bar__leading"},{"kind":"attribute","name":"hidden","expression":"not hasLeading","expressionPlan":{"source":"not hasLeading","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasLeading"}},"dependencies":["hasLeading"]}}],"children":[{"kind":"slot","fallback":[],"name":"leading"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"top-bar__title"}],"children":[{"kind":"slot"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"top-bar__search"},{"kind":"attribute","name":"hidden","expression":"not hasSearch","expressionPlan":{"source":"not hasSearch","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasSearch"}},"dependencies":["hasSearch"]}}],"children":[{"kind":"slot","fallback":[],"name":"search"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"top-bar__actions"},{"kind":"attribute","name":"hidden","expression":"not hasActions","expressionPlan":{"source":"not hasActions","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasActions"}},"dependencies":["hasActions"]}}],"children":[{"kind":"slot","fallback":[],"name":"actions"}]}]}]},"declarations":[{"kind":"state","name":"hasLeading","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasSearch","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasActions","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-top-bar", props);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of []) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-top-bar",
    "data-component-root": "ui-top-bar",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("header", _hoisted_1, [
      _createElementVNode("div", _hoisted_2, [
        _createElementVNode("span", { slot: "leading", "data-looma-framework-slot": "leading", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "leading")])
      ]),
      _createElementVNode("div", _hoisted_3, [
        _createElementVNode("span", { "data-looma-framework-slot": "", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "default")])
      ]),
      _createElementVNode("div", _hoisted_4, [
        _createElementVNode("span", { slot: "search", "data-looma-framework-slot": "search", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "search")])
      ]),
      _createElementVNode("div", _hoisted_5, [
        _createElementVNode("span", { slot: "actions", "data-looma-framework-slot": "actions", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "actions")])
      ])
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
