import { defineComponent as _defineComponent } from 'vue'
import { createElementVNode as _createElementVNode, renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["aria-label", "data-container", "data-selected", "data-disabled", "data-drop-scope", "data-accepts"]
const _hoisted_2 = {
  class: "row",
  part: "row",
  "data-component": "ui-tree-item"
}
const _hoisted_3 = {
  class: "leading",
  part: "leading",
  "data-component": "ui-tree-item"
}
const _hoisted_4 = {
  class: "label",
  part: "label",
  "data-component": "ui-tree-item"
}
const _hoisted_5 = {
  class: "actions",
  part: "actions",
  "data-component": "ui-tree-item"
}
const _hoisted_6 = {
  class: "children",
  part: "children",
  role: "group",
  "data-component": "ui-tree-item"
}

import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiTreeItem',
  props: {
    accepts: { type: [String, null], required: false, default: "" },
    container: { type: [Boolean, null], required: false, default: false },
    defaultExpanded: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    dragType: { type: [String, null], required: false, default: "item" },
    dropDepth: { type: [Number, null], required: false },
    dropScope: { type: [String, null], required: false, default: "" },
    expanded: { type: [Boolean, null], required: false },
    itemId: { type: [String, null], required: false, default: "" },
    label: { type: [String, null], required: false, default: "" },
    selected: { type: [Boolean, null], required: false, default: false },
    sortable: { type: [Boolean, null], required: false, default: false },
    subtreeDepth: { type: [Number, null], required: false }
  },
  emits: ["expand"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-tree-item","props":{"accepts":{"type":"string","required":false,"default":""},"container":{"type":"boolean","required":false,"default":false},"defaultExpanded":{"type":"boolean","required":false,"default":false},"disabled":{"type":"boolean","required":false,"default":false},"dragType":{"type":"string","required":false,"default":"item"},"dropDepth":{"type":"number","required":false},"dropScope":{"type":"string","required":false,"default":""},"expanded":{"type":"boolean","required":false},"itemId":{"type":"string","required":false,"default":""},"label":{"type":"string","required":false,"default":""},"selected":{"type":"boolean","required":false,"default":false},"sortable":{"type":"boolean","required":false,"default":false},"subtreeDepth":{"type":"number","required":false}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"treeitem"},{"kind":"attribute","name":"aria-label","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}},{"kind":"attribute","name":"data-container","expression":"container","expressionPlan":{"source":"container","ast":{"kind":"id","name":"container"},"dependencies":["container"]}},{"kind":"attribute","name":"data-selected","expression":"selected","expressionPlan":{"source":"selected","ast":{"kind":"id","name":"selected"},"dependencies":["selected"]}},{"kind":"attribute","name":"data-disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"data-drop-scope","expression":"dropScope","expressionPlan":{"source":"dropScope","ast":{"kind":"id","name":"dropScope"},"dependencies":["dropScope"]}},{"kind":"attribute","name":"data-accepts","expression":"accepts","expressionPlan":{"source":"accepts","ast":{"kind":"id","name":"accepts"},"dependencies":["accepts"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"row"},{"kind":"literal","name":"part","value":"row"}],"children":[{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"class","value":"drag-handle"},{"kind":"literal","name":"part","value":"drag-handle"},{"kind":"literal","name":"type","value":"button"}],"children":[{"kind":"element","name":"span","attributes":[],"children":[]}],"flow":{"kind":"if","test":"sortable and not disabled","testPlan":{"source":"sortable and not disabled","ast":{"kind":"binary","op":"and","left":{"kind":"id","name":"sortable"},"right":{"kind":"unary","op":"not","operand":{"kind":"id","name":"disabled"}}},"dependencies":["disabled","sortable"]}}},{"kind":"element","name":"template","attributes":[],"children":[{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"class","value":"disclosure"},{"kind":"literal","name":"part","value":"disclosure"},{"kind":"literal","name":"type","value":"button"}],"children":[{"kind":"element","name":"span","attributes":[],"children":[]}],"flow":{"kind":"when","test":"container","testPlan":{"source":"container","ast":{"kind":"id","name":"container"},"dependencies":["container"]}}},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"disclosure-spacer"},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[],"flow":{"kind":"else"}}],"flow":{"kind":"match"}},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"leading"},{"kind":"literal","name":"part","value":"leading"}],"children":[{"kind":"slot","fallback":[],"name":"leading"}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"label"},{"kind":"literal","name":"part","value":"label"}],"children":[{"kind":"slot"}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"actions"},{"kind":"literal","name":"part","value":"actions"}],"children":[{"kind":"slot","fallback":[],"name":"actions"}]},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"drop-indicator row-drop-indicator"},{"kind":"literal","name":"part","value":"drop-indicator"},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[]}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"children"},{"kind":"literal","name":"part","value":"children"},{"kind":"literal","name":"role","value":"group"}],"children":[{"kind":"slot","fallback":[],"name":"children"}],"flow":{"kind":"if","test":"container","testPlan":{"source":"container","ast":{"kind":"id","name":"container"},"dependencies":["container"]}}},{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"class","value":"drop-indicator subtree-drop-indicator"},{"kind":"literal","name":"part","value":"drop-indicator"},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[]}]},"declarations":[{"kind":"state","name":"internalExpanded","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"structuralLevel","expression":{"source":"1","ast":{"kind":"literal","value":1},"dependencies":[]}},{"kind":"state","name":"tabStop","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"expand","type":"object({ id: string, expanded: boolean, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("expand", (event as CustomEvent<{ readonly id: string; readonly expanded: boolean; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-tree-item", props);
  root.value.addEventListener("expand", eventListener0);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["accepts","container","defaultExpanded","disabled","dragType","dropDepth","dropScope","expanded","itemId","label","selected","sortable","subtreeDepth"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
onUnmounted(() => {
  root.value?.removeEventListener("expand", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-tree-item",
    "data-component-root": "ui-tree-item",
    "data-looma-managed": "framework",
    role: "treeitem",
    "aria-label": props.label,
    "data-container": props.container ? '' : undefined,
    "data-selected": props.selected ? '' : undefined,
    "data-disabled": props.disabled ? '' : undefined,
    "data-drop-scope": props.dropScope,
    "data-accepts": props.accepts,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_2, [
      _cache[0] || (_cache[0] = _createElementVNode("button", {
        class: "drag-handle",
        part: "drag-handle",
        type: "button",
        "data-component": "ui-tree-item"
      }, [
        _createElementVNode("span", { "data-component": "ui-tree-item" })
      ], -1 /* CACHED */)),
      _cache[1] || (_cache[1] = _createElementVNode("template", { "data-component": "ui-tree-item" }, [
        _createElementVNode("button", {
          class: "disclosure",
          part: "disclosure",
          type: "button",
          "data-component": "ui-tree-item"
        }, [
          _createElementVNode("span", { "data-component": "ui-tree-item" })
        ]),
        _createElementVNode("span", {
          class: "disclosure-spacer",
          "aria-hidden": "true",
          "data-component": "ui-tree-item"
        })
      ], -1 /* CACHED */)),
      _createElementVNode("span", _hoisted_3, [
        _renderSlot(_ctx.$slots, "leading")
      ]),
      _createElementVNode("span", _hoisted_4, [
        _renderSlot(_ctx.$slots, "default")
      ]),
      _createElementVNode("span", _hoisted_5, [
        _renderSlot(_ctx.$slots, "actions")
      ]),
      _cache[2] || (_cache[2] = _createElementVNode("span", {
        class: "drop-indicator row-drop-indicator",
        part: "drop-indicator",
        "aria-hidden": "true",
        "data-component": "ui-tree-item"
      }, null, -1 /* CACHED */))
    ]),
    _createElementVNode("div", _hoisted_6, [
      _renderSlot(_ctx.$slots, "children")
    ]),
    _cache[3] || (_cache[3] = _createElementVNode("span", {
      class: "drop-indicator subtree-drop-indicator",
      part: "drop-indicator",
      "aria-hidden": "true",
      "data-component": "ui-tree-item"
    }, null, -1 /* CACHED */))
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
