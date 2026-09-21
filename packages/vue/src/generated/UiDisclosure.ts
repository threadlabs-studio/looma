import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["disabled"]
const _hoisted_2 = {
  class: "disclosure__panel",
  "data-component": "ui-disclosure"
}
const _hoisted_3 = {
  class: "disclosure__panel-inner",
  "data-component": "ui-disclosure"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiDisclosure',
  props: {
    disabled: { type: [Boolean, null], required: false, default: false },
    open: { type: [Boolean, null], required: false, default: false },
    summary: { type: [String, null], required: false, default: "Details" }
  },
  emits: ["open", "close"],
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
  const valueopen = props.open;
  const valuesummary = props.summary;
  return { "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "open": passed("open", "open") ? valueopen : undefined, "summary": passed("summary", "summary") ? valuesummary : undefined };
};
const definition = {...{"contract":{"tag":"ui-disclosure","props":{"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false},"summary":{"type":"string","required":false,"target":{"attribute":"summary"},"default":"Details"}}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"class","value":"disclosure__trigger"},{"kind":"literal","name":"type","value":"button"},{"kind":"attribute","name":"aria-controls","expression":"contentId","expressionPlan":{"source":"contentId","ast":{"kind":"id","name":"contentId"},"dependencies":["contentId"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"span","attributes":[],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"summary","expressionPlan":{"source":"summary","ast":{"kind":"id","name":"summary"},"dependencies":["summary"]}}],"children":[]}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"disclosure__chevron"},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[]}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"disclosure__panel"}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"disclosure__panel-inner"}],"children":[{"kind":"slot"}]}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"contentId","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"event","name":"open","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("open", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-disclosure", explicitProps());
  root.value.addEventListener("open", eventListener0);
  root.value.addEventListener("close", eventListener1);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("open", eventListener0);
  root.value?.removeEventListener("close", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-disclosure",
    "data-component-root": "ui-disclosure",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("button", {
      class: "disclosure__trigger",
      type: "button",
      "aria-controls": undefined,
      disabled: props.disabled,
      "data-component": "ui-disclosure"
    }, [...(_cache[0] || (_cache[0] = [
      _createElementVNode("span", { "data-component": "ui-disclosure" }, [
        _createElementVNode("template", { "data-component": "ui-disclosure" }, [
          _createTextVNode(_toDisplayString(undefined))
        ])
      ], -1 /* CACHED */),
      _createElementVNode("span", {
        class: "disclosure__chevron",
        "aria-hidden": "true",
        "data-component": "ui-disclosure"
      }, null, -1 /* CACHED */)
    ]))], 8 /* PROPS */, _hoisted_1),
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", _hoisted_3, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
