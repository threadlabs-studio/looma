import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-orientation", "data-disabled"]
const _hoisted_2 = { "data-component": "ui-radio-group" }

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiRadioGroup',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false, default: "Options" },
    name: { type: [String, null], required: false, default: "" },
    orientation: { type: [String, null], required: false, default: "horizontal" },
    required: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "" }
  },
  emits: ["select", "change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuedisabled = props.disabled;
  const valuelabel = props.label;
  const valuename = props.name;
  const valueorientation = props.orientation;
  const valuerequired = props.required;
  const valuevalue = props.value;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "label": passed("label", "label") ? valuelabel : undefined, "name": passed("name", "name") ? valuename : undefined, "orientation": passed("orientation", "orientation") ? valueorientation : undefined, "required": passed("required", "required") ? valuerequired : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const definition = {...{"contract":{"tag":"ui-radio-group","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"label":{"type":"string","required":false,"target":{"attribute":"label"},"default":"Options"},"name":{"type":"string","required":false,"target":{"attribute":"name"},"default":""},"orientation":{"type":{"enum":["horizontal","vertical"]},"required":false,"target":{"attribute":"data-orientation"},"default":"horizontal"},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":""}}},"template":{"kind":"element","name":"fieldset","attributes":[{"kind":"literal","name":"role","value":"radiogroup"},{"kind":"attribute","name":"data-orientation","expression":"orientation","expressionPlan":{"source":"orientation","ast":{"kind":"id","name":"orientation"},"dependencies":["orientation"]}},{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"legend","attributes":[],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[]}]},{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"select","type":"object({ value: string, previousValue: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"change","type":"object({ checked: boolean, value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"fieldset","choices":["fieldset"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("select", (event as CustomEvent<{ readonly value: string; readonly previousValue: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("change", (event as CustomEvent<{ readonly checked: boolean; readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-radio-group", explicitProps());
  root.value.addEventListener("select", eventListener0);
  root.value.addEventListener("change", eventListener1);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("select", eventListener0);
  root.value?.removeEventListener("change", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("fieldset", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-radio-group",
    "data-component-root": "ui-radio-group",
    role: "radiogroup",
    "data-orientation": props.orientation,
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("legend", _hoisted_2, _toDisplayString(props.label), 1 /* TEXT */),
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
