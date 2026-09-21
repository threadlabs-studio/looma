import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "dialog__body",
  "data-component": "ui-dialog"
}
const _hoisted_2 = {
  "data-html-next-slot": "",
  style: {"display":"contents"}
}
const _hoisted_3 = {
  class: "dialog__footer",
  "data-component": "ui-dialog"
}
const _hoisted_4 = {
  slot: "actions",
  "data-html-next-slot": "actions",
  style: {"display":"contents"}
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiDialog',
  props: {
    dismissible: { type: [Boolean, null], required: false, default: false },
    for: { type: [String, null], required: false, default: "" },
    label: { type: [String, null], required: false },
    modal: { type: [Boolean, null], required: false, default: false },
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["close"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuedismissible = props.dismissible;
  const valuefor = props.for;
  const valuelabel = props.label;
  const valuemodal = props.modal;
  const valueopen = props.open;
  return { "dismissible": passed("dismissible", "dismissible") ? valuedismissible : undefined, "for": passed("for", "for") ? valuefor : undefined, "label": passed("label", "label") ? valuelabel : undefined, "modal": passed("modal", "modal") ? valuemodal : undefined, "open": passed("open", "open") ? valueopen : undefined };
};
const definition = {...{"contract":{"tag":"ui-dialog","props":{"dismissible":{"type":"boolean","required":false,"target":{"attribute":"dismissible"},"default":false},"for":{"type":"string","required":false,"target":{"attribute":"for"},"default":""},"label":{"type":"string","required":false,"target":{"attribute":"label"}},"modal":{"type":"boolean","required":false,"target":{"attribute":"modal"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"dialog","attributes":[{"kind":"attribute","name":"aria-label","expression":"accessibleLabel","expressionPlan":{"source":"accessibleLabel","ast":{"kind":"id","name":"accessibleLabel"},"dependencies":["accessibleLabel"]}}],"children":[{"kind":"element","name":"header","attributes":[{"kind":"literal","name":"class","value":"dialog__header"}],"children":[{"kind":"element","name":"h2","attributes":[{"kind":"literal","name":"class","value":"dialog__title"}],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[]}],"flow":{"kind":"if","test":"label","testPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"class","value":"dialog__close"},{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"aria-label","value":"Close"}],"children":[]}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"dialog__body"}],"children":[{"kind":"slot"}]},{"kind":"element","name":"footer","attributes":[{"kind":"literal","name":"class","value":"dialog__footer"}],"children":[{"kind":"slot","fallback":[],"name":"actions"}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"accessibleLabel","expression":{"source":"'Dialog'","ast":{"kind":"literal","value":"Dialog"},"dependencies":[]}},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"dialog","choices":["dialog"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-dialog", explicitProps());
  root.value.addEventListener("close", eventListener0);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("close", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("dialog", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-dialog",
    "data-component-root": "ui-dialog",
    "data-looma-managed": "framework",
    "aria-label": undefined,
    ref_key: "root",
    ref: root
  }), [
    _cache[0] || (_cache[0] = _createElementVNode("header", {
      class: "dialog__header",
      "data-component": "ui-dialog"
    }, [
      _createElementVNode("h2", {
        class: "dialog__title",
        "data-component": "ui-dialog"
      }, [
        _createElementVNode("template", { "data-component": "ui-dialog" }, [
          _createTextVNode(_toDisplayString(undefined))
        ])
      ]),
      _createElementVNode("button", {
        class: "dialog__close",
        type: "button",
        "aria-label": "Close",
        "data-component": "ui-dialog"
      })
    ], -1 /* CACHED */)),
    _createElementVNode("div", _hoisted_1, [
      _createElementVNode("span", _hoisted_2, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ]),
    _createElementVNode("footer", _hoisted_3, [
      _createElementVNode("span", _hoisted_4, [
        _renderSlot(_ctx.$slots, "actions")
      ])
    ])
  ], -2 /* BAIL */))
}
}

})
