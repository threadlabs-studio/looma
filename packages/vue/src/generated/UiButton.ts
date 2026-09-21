import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-size", "data-variant", "disabled"]

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiButton',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    size: { type: [String, null], required: false, default: "md" },
    variant: { type: [String, null], required: false, default: "outline" }
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
  const valuesize = props.size;
  const valuevariant = props.variant;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "size": passed("size", "size") ? valuesize : undefined, "variant": passed("variant", "variant") ? valuevariant : undefined };
};
const definition = {...{"contract":{"tag":"ui-button","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"size":{"type":{"enum":["sm","md","lg"]},"required":false,"target":{"attribute":"data-size"},"default":"md"},"variant":{"type":{"enum":["outline","solid","danger","ghost"]},"required":false,"target":{"attribute":"data-variant"},"default":"outline"}}},"template":{"kind":"element","name":"button","attributes":[{"kind":"attribute","name":"data-size","expression":"size","expressionPlan":{"source":"size","ast":{"kind":"id","name":"size"},"dependencies":["size"]}},{"kind":"attribute","name":"data-variant","expression":"variant","expressionPlan":{"source":"variant","ast":{"kind":"id","name":"variant"},"dependencies":["variant"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"button","choices":["button"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-button", explicitProps());
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
    "data-component": "ui-button",
    "data-component-root": "ui-button",
    "data-looma-managed": "framework",
    "data-size": props.size,
    "data-variant": props.variant,
    disabled: props.disabled,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
