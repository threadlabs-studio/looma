import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-disabled"]

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiEditable',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    edit: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false, default: "Edit value" },
    value: { type: [String, null], required: false, default: "" }
  },
  emits: ["input", "change", "edit-change"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-editable","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"data-disabled"},"default":false},"edit":{"type":"boolean","required":false,"target":{"attribute":"edit"},"default":false},"label":{"type":"string","required":false,"target":{"attribute":"label"},"default":"Edit value"},"value":{"type":"string","required":false,"target":{"attribute":"value"},"default":""}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-state-edit","expression":"internalEdit","expressionPlan":{"source":"internalEdit","ast":{"kind":"id","name":"internalEdit"},"dependencies":["internalEdit"]}},{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"class","value":"editable__preview"},{"kind":"literal","name":"type","value":"button"}],"children":[{"kind":"element","name":"span","attributes":[],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"internalValue","expressionPlan":{"source":"internalValue","ast":{"kind":"id","name":"internalValue"},"dependencies":["internalValue"]}}],"children":[]}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"editable__affordance"},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[{"kind":"text","value":"Edit"}]}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"editable__editor"},{"kind":"attribute","name":"hidden","expression":"not internalEdit","expressionPlan":{"source":"not internalEdit","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"internalEdit"}},"dependencies":["internalEdit"]}}],"children":[{"kind":"element","name":"input","attributes":[{"kind":"literal","name":"class","value":"editable__input"},{"kind":"literal","name":"type","value":"text"},{"kind":"attribute","name":"value","expression":"draft","expressionPlan":{"source":"draft","ast":{"kind":"id","name":"draft"},"dependencies":["draft"]}}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"editable__actions"}],"children":[{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"data-action","value":"save"}],"children":[{"kind":"text","value":"Save"}]},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"data-action","value":"cancel"}],"children":[{"kind":"text","value":"Cancel"}]}]}]}]},"declarations":[{"kind":"state","name":"internalEdit","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"internalValue","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"draft","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"input","type":"object({ value: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"change","type":"object({ value: string, previousValue: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"edit-change","type":"object({ edit: boolean, reason: activate | commit | cancel | light-dismiss | escape | programmatic, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("input", (event as CustomEvent<{ readonly value: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("change", (event as CustomEvent<{ readonly value: string; readonly previousValue: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener2 = (event: Event) => emit("edit-change", (event as CustomEvent<{ readonly edit: boolean; readonly reason: "activate" | "commit" | "cancel" | "light-dismiss" | "escape" | "programmatic"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-editable", props);
  root.value.addEventListener("input", eventListener0);
  root.value.addEventListener("change", eventListener1);
  root.value.addEventListener("edit-change", eventListener2);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["disabled","edit","label","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("input", eventListener0);
  root.value?.removeEventListener("change", eventListener1);
  root.value?.removeEventListener("edit-change", eventListener2);
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
  }), [...(_cache[0] || (_cache[0] = [
    _createElementVNode("button", {
      class: "editable__preview",
      type: "button",
      "data-component": "ui-editable"
    }, [
      _createElementVNode("span", { "data-component": "ui-editable" }, [
        _createElementVNode("template", { "data-component": "ui-editable" }, [
          _createTextVNode(_toDisplayString(undefined))
        ])
      ]),
      _createElementVNode("span", {
        class: "editable__affordance",
        "aria-hidden": "true",
        "data-component": "ui-editable"
      }, " Edit ")
    ], -1 /* CACHED */),
    _createElementVNode("div", {
      class: "editable__editor",
      hidden: undefined,
      "data-component": "ui-editable"
    }, [
      _createElementVNode("input", {
        class: "editable__input",
        type: "text",
        value: undefined,
        "data-component": "ui-editable"
      }),
      _createElementVNode("div", {
        class: "editable__actions",
        "data-component": "ui-editable"
      }, [
        _createElementVNode("button", {
          type: "button",
          "data-action": "save",
          "data-component": "ui-editable"
        }, " Save "),
        _createElementVNode("button", {
          type: "button",
          "data-action": "cancel",
          "data-component": "ui-editable"
        }, " Cancel ")
      ])
    ], -1 /* CACHED */)
  ]))], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
