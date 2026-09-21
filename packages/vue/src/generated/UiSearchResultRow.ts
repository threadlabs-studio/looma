import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["disabled", "data-selected"]
const _hoisted_2 = {
  class: "search-result-row__leading",
  part: "leading",
  hidden: undefined,
  "data-component": "ui-search-result-row"
}
const _hoisted_3 = {
  slot: "leading",
  style: {"display":"contents"}
}
const _hoisted_4 = {
  class: "search-result-row__content",
  part: "content",
  "data-component": "ui-search-result-row"
}
const _hoisted_5 = {
  class: "search-result-row__title",
  part: "title",
  "data-component": "ui-search-result-row"
}
const _hoisted_6 = {
  slot: "title",
  style: {"display":"contents"}
}
const _hoisted_7 = {
  class: "search-result-row__meta",
  part: "meta",
  hidden: undefined,
  "data-component": "ui-search-result-row"
}
const _hoisted_8 = {
  slot: "meta",
  style: {"display":"contents"}
}
const _hoisted_9 = {
  class: "search-result-row__excerpt",
  part: "excerpt",
  hidden: undefined,
  "data-component": "ui-search-result-row"
}
const _hoisted_10 = {
  slot: "excerpt",
  style: {"display":"contents"}
}
const _hoisted_11 = {
  class: "search-result-row__trailing",
  part: "trailing",
  hidden: undefined,
  "data-component": "ui-search-result-row"
}
const _hoisted_12 = {
  slot: "trailing",
  style: {"display":"contents"}
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSearchResultRow',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    selected: { type: [Boolean, null], required: false, default: false }
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
  const valueselected = props.selected;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "selected": passed("selected", "selected") ? valueselected : undefined };
};
const definition = {...{"contract":{"tag":"ui-search-result-row","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"selected":{"type":"boolean","required":false,"target":{"attribute":"data-selected"},"default":false}}},"template":{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"class","value":"search-result-row"},{"kind":"literal","name":"type","value":"button"},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"data-selected","expression":"selected","expressionPlan":{"source":"selected","ast":{"kind":"id","name":"selected"},"dependencies":["selected"]}},{"kind":"literal","name":"part","value":"button"}],"children":[{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"search-result-row__leading"},{"kind":"literal","name":"part","value":"leading"},{"kind":"attribute","name":"hidden","expression":"not hasLeading","expressionPlan":{"source":"not hasLeading","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasLeading"}},"dependencies":["hasLeading"]}}],"children":[{"kind":"slot","fallback":[],"name":"leading"}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"search-result-row__content"},{"kind":"literal","name":"part","value":"content"}],"children":[{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"search-result-row__title"},{"kind":"literal","name":"part","value":"title"}],"children":[{"kind":"slot","fallback":[],"name":"title"}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"search-result-row__meta"},{"kind":"literal","name":"part","value":"meta"},{"kind":"attribute","name":"hidden","expression":"not hasMeta","expressionPlan":{"source":"not hasMeta","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasMeta"}},"dependencies":["hasMeta"]}}],"children":[{"kind":"slot","fallback":[],"name":"meta"}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"search-result-row__excerpt"},{"kind":"literal","name":"part","value":"excerpt"},{"kind":"attribute","name":"hidden","expression":"not hasExcerpt","expressionPlan":{"source":"not hasExcerpt","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasExcerpt"}},"dependencies":["hasExcerpt"]}}],"children":[{"kind":"slot","fallback":[],"name":"excerpt"}]}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"search-result-row__trailing"},{"kind":"literal","name":"part","value":"trailing"},{"kind":"attribute","name":"hidden","expression":"not hasTrailing","expressionPlan":{"source":"not hasTrailing","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"hasTrailing"}},"dependencies":["hasTrailing"]}}],"children":[{"kind":"slot","fallback":[],"name":"trailing"}]}]},"declarations":[{"kind":"state","name":"hasLeading","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasMeta","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasExcerpt","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"hasTrailing","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}}],"root":{"kind":"native","element":"button","choices":["button"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-search-result-row", explicitProps());
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
  return (_openBlock(), _createElementBlock("button", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-search-result-row",
    "data-component-root": "ui-search-result-row",
    class: "search-result-row",
    type: "button",
    disabled: props.disabled,
    "data-selected": props.selected ? '' : undefined,
    part: "button",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("span", _hoisted_2, [
      _createElementVNode("span", _hoisted_3, [
        _renderSlot(_ctx.$slots, "leading")
      ])
    ]),
    _createElementVNode("span", _hoisted_4, [
      _createElementVNode("span", _hoisted_5, [
        _createElementVNode("span", _hoisted_6, [
          _renderSlot(_ctx.$slots, "title")
        ])
      ]),
      _createElementVNode("span", _hoisted_7, [
        _createElementVNode("span", _hoisted_8, [
          _renderSlot(_ctx.$slots, "meta")
        ])
      ]),
      _createElementVNode("span", _hoisted_9, [
        _createElementVNode("span", _hoisted_10, [
          _renderSlot(_ctx.$slots, "excerpt")
        ])
      ])
    ]),
    _createElementVNode("span", _hoisted_11, [
      _createElementVNode("span", _hoisted_12, [
        _renderSlot(_ctx.$slots, "trailing")
      ])
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
