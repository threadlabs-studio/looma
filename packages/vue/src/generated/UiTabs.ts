import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-orientation", "data-stretch"]
const _hoisted_2 = ["aria-label"]
const _hoisted_3 = {
  class: "tabs__panels",
  "data-component": "ui-tabs"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTabs',
  props: {
    label: { type: [String, null], required: false, default: "Tabs" },
    orientation: { type: [String, null], required: false, default: "horizontal" },
    stretch: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "" }
  },
  emits: ["select"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuelabel = props.label;
  const valueorientation = props.orientation;
  const valuestretch = props.stretch;
  const valuevalue = props.value;
  return { "label": passed("label", "label") ? valuelabel : undefined, "orientation": passed("orientation", "orientation") ? valueorientation : undefined, "stretch": passed("stretch", "stretch") ? valuestretch : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const definition = {...{"contract":{"tag":"ui-tabs","props":{"label":{"type":"string","required":false,"target":{"attribute":"aria-label"},"default":"Tabs"},"orientation":{"type":{"enum":["horizontal","vertical"]},"required":false,"target":{"attribute":"data-orientation"},"default":"horizontal"},"stretch":{"type":"boolean","required":false,"target":{"attribute":"data-stretch"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":""}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-orientation","expression":"orientation","expressionPlan":{"source":"orientation","ast":{"kind":"id","name":"orientation"},"dependencies":["orientation"]}},{"kind":"attribute","name":"data-stretch","expression":"stretch","expressionPlan":{"source":"stretch","ast":{"kind":"id","name":"stretch"},"dependencies":["stretch"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"tabs__list"},{"kind":"literal","name":"role","value":"tablist"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"tabs__panels"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"select","type":"object({ value: string, previousValue: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("select", (event as CustomEvent<{ readonly value: string; readonly previousValue: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-tabs", explicitProps());
  root.value.addEventListener("select", eventListener0);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("select", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-tabs",
    "data-component-root": "ui-tabs",
    "data-looma-managed": "framework",
    "data-orientation": props.orientation,
    "data-stretch": props.stretch ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", {
      class: "tabs__list",
      role: "tablist",
      "aria-label": props.label,
      "data-component": "ui-tabs"
    }, null, 8 /* PROPS */, _hoisted_2),
    _createElementVNode("div", _hoisted_3, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
