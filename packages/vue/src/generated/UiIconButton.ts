import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["disabled", "data-round", "aria-label"]

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiIconButton',
  props: {
    anticipatory: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false, default: "" },
    round: { type: [Boolean, null], required: false, default: false },
    size: { type: [String, null], required: false, default: "md" },
    variant: { type: [String, null], required: false, default: "ghost" }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valueanticipatory = props.anticipatory;
  const valuedisabled = props.disabled;
  const valuelabel = props.label;
  const valueround = props.round;
  const valuesize = props.size;
  const valuevariant = props.variant;
  return { "anticipatory": passed("anticipatory", "anticipatory") ? valueanticipatory : undefined, "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "label": passed("label", "label") ? valuelabel : undefined, "round": passed("round", "round") ? valueround : undefined, "size": passed("size", "size") ? valuesize : undefined, "variant": passed("variant", "variant") ? valuevariant : undefined };
};
const definition = {...{"contract":{"tag":"ui-icon-button","props":{"anticipatory":{"type":"boolean","required":false,"target":{"attribute":"anticipatory"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"label":{"type":"string","required":false,"target":{"attribute":"aria-label"},"default":""},"round":{"type":"boolean","required":false,"target":{"attribute":"data-round"},"default":false},"size":{"type":{"enum":["sm","md","lg"]},"required":false,"target":{"attribute":"size"},"default":"md"},"variant":{"type":{"enum":["ghost","outline","solid"]},"required":false,"target":{"attribute":"variant"},"default":"ghost"}}},"template":{"kind":"element","name":"button","attributes":[{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"data-round","expression":"round","expressionPlan":{"source":"round","ast":{"kind":"id","name":"round"},"dependencies":["round"]}},{"kind":"literal","name":"type","value":"button"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"button","choices":["button"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-icon-button", explicitProps());
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
    "data-component": "ui-icon-button",
    "data-component-root": "ui-icon-button",
    disabled: props.disabled,
    "data-round": props.round ? '' : undefined,
    type: "button",
    "aria-label": props.label,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
