import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled"]
const _hoisted_2 = {
  class: "control",
  "data-component": "ui-radio"
}
const _hoisted_3 = ["name", "required", "value"]
const _hoisted_4 = {
  class: "label",
  "data-component": "ui-radio"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiRadio',
  props: {
    checked: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    name: { type: [String, null], required: false, default: "" },
    required: { type: [Boolean, null], required: false, default: false },
    value: { type: [String, null], required: false, default: "on" }
  },
  emits: ["change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-radio","props":{"checked":{"type":"boolean","required":false,"target":{"attribute":"checked"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"name":{"type":"string","required":false,"target":{"attribute":"name"},"default":""},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":"on"}}},"template":{"kind":"element","name":"span","attributes":[{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"label","attributes":[{"kind":"literal","name":"class","value":"control"}],"children":[{"kind":"element","name":"input","attributes":[{"kind":"literal","name":"type","value":"radio"},{"kind":"attribute","name":"checked","expression":"internalChecked","expressionPlan":{"source":"internalChecked","ast":{"kind":"id","name":"internalChecked"},"dependencies":["internalChecked"]}},{"kind":"attribute","name":"name","expression":"name","expressionPlan":{"source":"name","ast":{"kind":"id","name":"name"},"dependencies":["name"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}},{"kind":"attribute","name":"value","expression":"value","expressionPlan":{"source":"value","ast":{"kind":"id","name":"value"},"dependencies":["value"]}}],"children":[]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"label"}],"children":[{"kind":"slot"}]}]}]},"declarations":[{"kind":"state","name":"internalChecked","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"change","type":"object({ checked: boolean, value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"span","choices":["span"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("change", (event as CustomEvent<{ readonly checked: boolean; readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-radio", props);
  root.value.addEventListener("change", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["checked","disabled","name","required","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("change", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("span", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-radio",
    "data-component-root": "ui-radio",
    "data-looma-managed": "framework",
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("label", _hoisted_2, [
      _createElementVNode("input", {
        type: "radio",
        checked: undefined,
        name: props.name,
        required: props.required,
        value: props.value,
        "data-component": "ui-radio"
      }, null, 8 /* PROPS */, _hoisted_3),
      _createElementVNode("span", _hoisted_4, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
