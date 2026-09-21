import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["aria-label"]

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiAvatarGroup',
  props: {
    label: { type: [String, null], required: false, default: "People" },
    max: { type: [Number, null], required: false, default: 5 }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuelabel = props.label;
  const valuemax = props.max;
  return { "label": passed("label", "label") ? valuelabel : undefined, "max": passed("max", "max") ? valuemax : undefined };
};
const definition = {...{"contract":{"tag":"ui-avatar-group","props":{"label":{"type":"string","required":false,"target":{"attribute":"aria-label"},"default":"People"},"max":{"type":"number","required":false,"target":{"attribute":"max"},"default":5}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"group"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"overflowCount","expression":{"source":"0","ast":{"kind":"literal","value":0},"dependencies":[]}}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-avatar-group", explicitProps());
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
    "data-component": "ui-avatar-group",
    "data-component-root": "ui-avatar-group",
    "data-looma-managed": "framework",
    role: "group",
    "aria-label": props.label,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
