import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "search-shell",
  part: "base",
  "data-component": "ui-search-shell"
}
const _hoisted_2 = {
  class: "search-shell__panel",
  part: "panel",
  "data-component": "ui-search-shell"
}
const _hoisted_3 = {
  class: "search-shell__search",
  part: "search",
  "data-component": "ui-search-shell"
}
const _hoisted_4 = {
  slot: "search",
  style: {"display":"contents"}
}
const _hoisted_5 = {
  class: "search-shell__status",
  part: "status",
  "data-component": "ui-search-shell"
}
const _hoisted_6 = {
  slot: "status",
  style: {"display":"contents"}
}
const _hoisted_7 = {
  class: "search-shell__body",
  part: "body",
  "data-component": "ui-search-shell"
}
const _hoisted_8 = {
  slot: "body",
  style: {"display":"contents"}
}
const _hoisted_9 = {
  class: "search-shell__footer",
  part: "footer",
  "data-component": "ui-search-shell"
}
const _hoisted_10 = {
  slot: "footer",
  style: {"display":"contents"}
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSearchShell',
  props: {
    dismissible: { type: [Boolean, null], required: false, default: false },
    label: { type: [String, null], required: false, default: "Search" },
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
  const valuelabel = props.label;
  const valuemodal = props.modal;
  const valueopen = props.open;
  return { "dismissible": passed("dismissible", "dismissible") ? valuedismissible : undefined, "label": passed("label", "label") ? valuelabel : undefined, "modal": passed("modal", "modal") ? valuemodal : undefined, "open": passed("open", "open") ? valueopen : undefined };
};
const definition = {...{"contract":{"tag":"ui-search-shell","props":{"dismissible":{"type":"boolean","required":false,"target":{"attribute":"dismissible"},"default":false},"label":{"type":"string","required":false,"target":{"attribute":"label"},"default":"Search"},"modal":{"type":"boolean","required":false,"target":{"attribute":"modal"},"default":false},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"element","name":"dialog","attributes":[{"kind":"literal","name":"class","value":"search-shell"},{"kind":"literal","name":"part","value":"base"}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__panel"},{"kind":"literal","name":"part","value":"panel"}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__search"},{"kind":"literal","name":"part","value":"search"}],"children":[{"kind":"slot","fallback":[],"name":"search"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__status"},{"kind":"literal","name":"part","value":"status"}],"children":[{"kind":"slot","fallback":[],"name":"status"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__body"},{"kind":"literal","name":"part","value":"body"}],"children":[{"kind":"slot","fallback":[],"name":"body"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"search-shell__footer"},{"kind":"literal","name":"part","value":"footer"}],"children":[{"kind":"slot","fallback":[],"name":"footer"}]}]}]}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-search-shell", explicitProps());
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
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-search-shell",
    "data-component-root": "ui-search-shell",
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("dialog", _hoisted_1, [
      _createElementVNode("div", _hoisted_2, [
        _createElementVNode("div", _hoisted_3, [
          _createElementVNode("span", _hoisted_4, [
            _renderSlot(_ctx.$slots, "search")
          ])
        ]),
        _createElementVNode("div", _hoisted_5, [
          _createElementVNode("span", _hoisted_6, [
            _renderSlot(_ctx.$slots, "status")
          ])
        ]),
        _createElementVNode("div", _hoisted_7, [
          _createElementVNode("span", _hoisted_8, [
            _renderSlot(_ctx.$slots, "body")
          ])
        ]),
        _createElementVNode("div", _hoisted_9, [
          _createElementVNode("span", _hoisted_10, [
            _renderSlot(_ctx.$slots, "footer")
          ])
        ])
      ])
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
