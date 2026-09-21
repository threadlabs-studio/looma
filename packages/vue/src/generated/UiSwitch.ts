import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled"]
const _hoisted_2 = {
  class: "control",
  "data-component": "ui-switch"
}
const _hoisted_3 = ["required", "value"]
const _hoisted_4 = {
  class: "label",
  "data-component": "ui-switch"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSwitch',
  props: {
    checked: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "on" }
  },
  emits: ["change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuechecked = props.checked;
  const valuedisabled = props.disabled;
  const valuerequired = props.required;
  const valuevalue = props.value;
  return { "checked": passed("checked", "checked") ? valuechecked : undefined, "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "required": passed("required", "required") ? valuerequired : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const definition = {...{"contract":{"tag":"ui-switch","props":{"checked":{"type":"boolean","required":false,"target":{"attribute":"checked"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":"on"}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"label","attributes":[{"kind":"literal","name":"class","value":"control"}],"children":[{"kind":"element","name":"input","attributes":[{"kind":"literal","name":"type","value":"checkbox"},{"kind":"literal","name":"role","value":"switch"},{"kind":"attribute","name":"checked","expression":"internalChecked","expressionPlan":{"source":"internalChecked","ast":{"kind":"id","name":"internalChecked"},"dependencies":["internalChecked"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}},{"kind":"attribute","name":"value","expression":"value","expressionPlan":{"source":"value","ast":{"kind":"id","name":"value"},"dependencies":["value"]}}],"children":[]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"label"}],"children":[{"kind":"slot"}]}]}]},"declarations":[{"kind":"state","name":"internalChecked","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"change","type":"object({ checked: boolean, value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("change", (event as CustomEvent<{ readonly checked: boolean; readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-switch", explicitProps());
  root.value.addEventListener("change", eventListener0);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("change", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-switch",
    "data-component-root": "ui-switch",
    "data-looma-managed": "framework",
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("label", _hoisted_2, [
      _createElementVNode("input", {
        type: "checkbox",
        role: "switch",
        checked: undefined,
        required: props.required,
        value: props.value,
        "data-component": "ui-switch"
      }, null, 8 /* PROPS */, _hoisted_3),
      _createElementVNode("span", _hoisted_4, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
