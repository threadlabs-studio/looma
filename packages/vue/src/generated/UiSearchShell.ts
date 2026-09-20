import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "search-shell",
  part: "base",
  "data-component": "ui-search-shell"
}
const _hoisted_2 = {
  class: "search-shell__panel",
  part: "panel",
  "data-component": "ui-search-shell"
}
const _hoisted_3 = {
  class: "search-shell__search",
  part: "search",
  "data-component": "ui-search-shell"
}
const _hoisted_4 = {
  class: "search-shell__status",
  part: "status",
  hidden: undefined,
  "data-component": "ui-search-shell"
}
const _hoisted_5 = {
  class: "search-shell__body",
  part: "body",
  "data-component": "ui-search-shell"
}
const _hoisted_6 = {
  class: "search-shell__footer",
  part: "footer",
  hidden: undefined,
  "data-component": "ui-search-shell"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSearchShell',
  setup(__props: any) {



const props = __props;
const definition = {...{"contract":{"tag":"ui-search-shell","props":{}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell"},{"kind":"literal","name":"part","value":"base"}],"children":[{"kind":"slot","fallback":[],"name":"backdrop"},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__panel"},{"kind":"literal","name":"part","value":"panel"}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__search"},{"kind":"literal","name":"part","value":"search"}],"children":[{"kind":"slot","fallback":[],"name":"search"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__status"},{"kind":"literal","name":"part","value":"status"},{"kind":"attribute","name":"hidden","expression":"not hasStatus","expressionPlan":{"source":"not hasStatus","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasStatus"}},"dependencies":["hasStatus"]}}],"children":[{"kind":"slot","fallback":[],"name":"status"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__body"},{"kind":"literal","name":"part","value":"body"}],"children":[{"kind":"slot","fallback":[],"name":"body"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__footer"},{"kind":"literal","name":"part","value":"footer"},{"kind":"attribute","name":"hidden","expression":"not hasFooter","expressionPlan":{"source":"not hasFooter","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasFooter"}},"dependencies":["hasFooter"]}}],"children":[{"kind":"slot","fallback":[],"name":"footer"}]}]}]}]},"declarations":[{"kind":"state","name":"hasStatus","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasFooter","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-search-shell", props);
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
    "data-component": "ui-search-shell",
    "data-component-root": "ui-search-shell",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_1, [
      _renderSlot(_ctx.$slots, "backdrop"),
      _createElementVNode("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, [
          _renderSlot(_ctx.$slots, "search")
        ]),
        _createElementVNode("div", _hoisted_4, [
          _renderSlot(_ctx.$slots, "status")
        ]),
        _createElementVNode("div", _hoisted_5, [
          _renderSlot(_ctx.$slots, "body")
        ]),
        _createElementVNode("div", _hoisted_6, [
          _renderSlot(_ctx.$slots, "footer")
        ])
      ])
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
