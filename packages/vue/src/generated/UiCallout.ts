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

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCallout',
  props: {
    tone: { type: [String, null], required: false, default: "info" }
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
  return { "tone": passed("tone", "tone") ? valuetone : undefined };
};
const definition = {...{"contract":{"tag":"ui-callout","props":{"tone":{"type":{"enum":["info","note","warning","success","danger"]},"required":false,"target":{"attribute":"data-tone"},"default":"info"}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"note"},{"kind":"attribute","name":"data-tone","expression":"tone","expressionPlan":{"source":"tone","ast":{"kind":"id","name":"tone"},"dependencies":["tone"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"callout__surface"}],"children":[{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"icon"},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"content"}],"children":[{"kind":"slot"}]}]}]},"declarations":[],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-callout", explicitProps());
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
