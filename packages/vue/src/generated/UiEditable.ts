import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled"]
const _hoisted_2 = {
  part: "preview",
  "data-component": "ui-editable"
}
const _hoisted_3 = {
  part: "edit",
  hidden: undefined,
  "data-component": "ui-editable"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditable',
  props: {
    defaultEdit: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    edit: { type: [Boolean, null], required: false, default: undefined }
  },
  emits: ["edit-change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editable","props":{"defaultEdit":{"type":"boolean","required":false,"target":{"attribute":"defaultedit"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"edit":{"type":"boolean","required":false,"target":{"attribute":"edit"}}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-state-edit","expression":"internalEdit","expressionPlan":{"source":"internalEdit","ast":{"kind":"id","name":"internalEdit"},"dependencies":["internalEdit"]}},{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"part","value":"preview"}],"children":[{"kind":"slot","fallback":[],"name":"preview"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"part","value":"edit"},{"kind":"attribute","name":"hidden","expression":"not internalEdit","expressionPlan":{"source":"not internalEdit","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"internalEdit"}},"dependencies":["internalEdit"]}}],"children":[{"kind":"slot","fallback":[],"name":"edit"}]}]},"declarations":[{"kind":"state","name":"internalEdit","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"edit-change","type":"object({ edit: boolean, reason: activate | light-dismiss | escape | programmatic, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("edit-change", (event as CustomEvent<{ readonly edit: boolean; readonly reason: "activate" | "light-dismiss" | "escape" | "programmatic"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editable", props);
  root.value.addEventListener("edit-change", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["defaultEdit","disabled","edit"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("edit-change", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-editable",
    "data-component-root": "ui-editable",
    "data-looma-managed": "framework",
    "data-state-edit": undefined,
    "data-disabled": props.disabled ? '' : undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("span", { slot: "preview", "data-looma-framework-slot": "preview", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "preview")])
    ]),
    _createElementVNode("div", _hoisted_3, [
      _createElementVNode("span", { slot: "edit", "data-looma-framework-slot": "edit", style: { display: "contents" } }, [_renderSlot(_ctx.$slots, "edit")])
    ])
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
