import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiSidebar',
  props: {
    align: { type: [String, null], required: false },
    gap: { type: [String, null], required: false },
    maxWidth: { type: [Number, null], required: false, default: 480 },
    minWidth: { type: [Number, null], required: false, default: 176 },
    resizable: { type: [Boolean, null], required: false, default: false },
    resizeLabel: { type: [String, null], required: false, default: "Resize sidebar" },
    resizeStep: { type: [Number, null], required: false, default: 16 },
    side: { type: [String, null], required: false, default: "start" },
    width: { type: [String, null], required: false, default: "default" }
  },
  emits: ["resize"],
  setup(__props: any, { emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuealign = props.align;
  const valuegap = props.gap;
  const valuemaxWidth = props.maxWidth;
  const valueminWidth = props.minWidth;
  const valueresizable = props.resizable;
  const valueresizeLabel = props.resizeLabel;
  const valueresizeStep = props.resizeStep;
  const valueside = props.side;
  const valuewidth = props.width;
  return { "align": passed("align", "align") ? valuealign : undefined, "gap": passed("gap", "gap") ? valuegap : undefined, "maxWidth": passed("maxWidth", "max-width") ? valuemaxWidth : undefined, "minWidth": passed("minWidth", "min-width") ? valueminWidth : undefined, "resizable": passed("resizable", "resizable") ? valueresizable : undefined, "resizeLabel": passed("resizeLabel", "resize-label") ? valueresizeLabel : undefined, "resizeStep": passed("resizeStep", "resize-step") ? valueresizeStep : undefined, "side": passed("side", "side") ? valueside : undefined, "width": passed("width", "width") ? valuewidth : undefined };
};
const definition = {...{"contract":{"tag":"ui-sidebar","props":{"align":{"type":{"enum":["start","center","end","stretch"]},"required":false,"target":{"attribute":"align"}},"gap":{"type":{"enum":["xs","s","m","l","xl"]},"required":false,"target":{"attribute":"gap"}},"maxWidth":{"type":"number","required":false,"target":{"attribute":"maxwidth"},"default":480},"minWidth":{"type":"number","required":false,"target":{"attribute":"minwidth"},"default":176},"resizable":{"type":"boolean","required":false,"target":{"attribute":"resizable"},"default":false},"resizeLabel":{"type":"string","required":false,"target":{"attribute":"resizelabel"},"default":"Resize sidebar"},"resizeStep":{"type":"number","required":false,"target":{"attribute":"resizestep"},"default":16},"side":{"type":{"enum":["start","end"]},"required":false,"target":{"attribute":"side"},"default":"start"},"width":{"type":{"enum":["narrow","default","wide"]},"required":false,"target":{"attribute":"width"},"default":"default"}}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"slot"}]},"declarations":[{"kind":"event","name":"resize","type":"object({ width: number, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("resize", (event as CustomEvent<{ readonly width: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-sidebar", explicitProps());
  root.value.addEventListener("resize", eventListener0);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
onUnmounted(() => {
  root.value?.removeEventListener("resize", eventListener0);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-sidebar",
    "data-component-root": "ui-sidebar",
    "data-looma-managed": "framework",
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
