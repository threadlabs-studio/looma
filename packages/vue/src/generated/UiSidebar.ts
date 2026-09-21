import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, createElementVNode as _createElementVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = {
  class: "sidebar__content",
  "data-component": "ui-sidebar"
}

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSidebar',
  props: {
    breakpoint: { type: [String, null], required: false, default: "md" },
    collapsed: { type: [Boolean, null], required: false, default: false },
    maxWidth: { type: [Number, null], required: false, default: 480 },
    minWidth: { type: [Number, null], required: false, default: 200 },
    resizable: { type: [Boolean, null], required: false, default: false },
    resizeLabel: { type: [String, null], required: false, default: "Resize sidebar" },
    resizeStep: { type: [Number, null], required: false, default: 16 },
    side: { type: [String, null], required: false, default: "start" },
    width: { type: [Number, null], required: false, default: 0 }
  },
  emits: ["resize", "toggle"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuebreakpoint = props.breakpoint;
  const valuecollapsed = props.collapsed;
  const valuemaxWidth = props.maxWidth;
  const valueminWidth = props.minWidth;
  const valueresizable = props.resizable;
  const valueresizeLabel = props.resizeLabel;
  const valueresizeStep = props.resizeStep;
  const valueside = props.side;
  const valuewidth = props.width;
  return { "breakpoint": passed("breakpoint", "breakpoint") ? valuebreakpoint : undefined, "collapsed": passed("collapsed", "collapsed") ? valuecollapsed : undefined, "maxWidth": passed("maxWidth", "max-width") ? valuemaxWidth : undefined, "minWidth": passed("minWidth", "min-width") ? valueminWidth : undefined, "resizable": passed("resizable", "resizable") ? valueresizable : undefined, "resizeLabel": passed("resizeLabel", "resize-label") ? valueresizeLabel : undefined, "resizeStep": passed("resizeStep", "resize-step") ? valueresizeStep : undefined, "side": passed("side", "side") ? valueside : undefined, "width": passed("width", "width") ? valuewidth : undefined };
};
const definition = {...{"contract":{"tag":"ui-sidebar","props":{"breakpoint":{"type":{"enum":["sm","md","lg"]},"required":false,"target":{"attribute":"breakpoint"},"default":"md"},"collapsed":{"type":"boolean","required":false,"target":{"attribute":"collapsed"},"default":false},"maxWidth":{"type":"number","required":false,"target":{"attribute":"maxwidth"},"default":480},"minWidth":{"type":"number","required":false,"target":{"attribute":"minwidth"},"default":200},"resizable":{"type":"boolean","required":false,"target":{"attribute":"resizable"},"default":false},"resizeLabel":{"type":"string","required":false,"target":{"attribute":"resizelabel"},"default":"Resize sidebar"},"resizeStep":{"type":"number","required":false,"target":{"attribute":"resizestep"},"default":16},"side":{"type":{"enum":["start","end"]},"required":false,"target":{"attribute":"side"},"default":"start"},"width":{"type":"number","required":false,"target":{"attribute":"width"},"default":0}}},"template":{"kind":"element","name":"aside","attributes":[{"kind":"attribute","name":"data-state-collapsed","expression":"internalCollapsed","expressionPlan":{"source":"internalCollapsed","ast":{"kind":"id","name":"internalCollapsed"},"dependencies":["internalCollapsed"]}},{"kind":"attribute","name":"data-state-drawer","expression":"drawer","expressionPlan":{"source":"drawer","ast":{"kind":"id","name":"drawer"},"dependencies":["drawer"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"sidebar__content"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"internalCollapsed","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"drawer","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"resize","type":"object({ width: number, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"toggle","type":"object({ open: boolean, mode: docked | drawer, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"aside","choices":["aside"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("resize", (event as CustomEvent<{ readonly width: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("toggle", (event as CustomEvent<{ readonly open: boolean; readonly mode: "docked" | "drawer"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-sidebar", explicitProps());
  root.value.addEventListener("resize", eventListener0);
  root.value.addEventListener("toggle", eventListener1);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("resize", eventListener0);
  root.value?.removeEventListener("toggle", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("aside", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-sidebar",
    "data-component-root": "ui-sidebar",
    "data-state-collapsed": undefined,
    "data-state-drawer": undefined,
    ref_key: "root",
    ref: root
  }), [
    _createElementVNode("div", _hoisted_1, [
      _renderSlot(_ctx.$slots, "default")
    ])
  ], 16 /* FULL_PROPS */))
}
}

})
