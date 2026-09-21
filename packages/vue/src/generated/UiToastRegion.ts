import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiToastRegion',
  props: {
    auto: { type: [Boolean, null], required: false, default: false },
    duration: { type: [Number, null], required: false, default: 5000 },
    message: { type: [String, null], required: false, default: "Notification" },
    open: { type: [Boolean, null], required: false, default: false }
  },
  emits: ["close", "dismiss"],
  setup(__props: any, { expose: __expose, emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valueauto = props.auto;
  const valueduration = props.duration;
  const valuemessage = props.message;
  const valueopen = props.open;
  return { "auto": passed("auto", "auto") ? valueauto : undefined, "duration": passed("duration", "duration") ? valueduration : undefined, "message": passed("message", "message") ? valuemessage : undefined, "open": passed("open", "open") ? valueopen : undefined };
};
const definition = {...{"contract":{"tag":"ui-toast-region","props":{"auto":{"type":"boolean","required":false,"target":{"attribute":"auto"},"default":false},"duration":{"type":"number","required":false,"target":{"attribute":"duration"},"default":5000},"message":{"type":"string","required":false,"target":{"attribute":"message"},"default":"Notification"},"open":{"type":"boolean","required":false,"target":{"attribute":"open"},"default":false}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"role","value":"region"},{"kind":"literal","name":"aria-label","value":"Notifications"},{"kind":"literal","name":"aria-live","value":"polite"},{"kind":"attribute","name":"data-state-open","expression":"internalOpen","expressionPlan":{"source":"internalOpen","ast":{"kind":"id","name":"internalOpen"},"dependencies":["internalOpen"]}}],"children":[{"kind":"slot"}]},"declarations":[{"kind":"state","name":"internalOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"event","name":"close","type":"object({ open: boolean, reason: action | timeout | programmatic | light-dismiss | escape, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"dismiss","type":"object({ id: string, reason: action | timeout, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"method","name":"show","exportName":"show","returns":"promise(string)"}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("close", (event as CustomEvent<{ readonly open: boolean; readonly reason: "action" | "timeout" | "programmatic" | "light-dismiss" | "escape"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("dismiss", (event as CustomEvent<{ readonly id: string; readonly reason: "action" | "timeout"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-toast-region", explicitProps());
  root.value.addEventListener("close", eventListener0);
  root.value.addEventListener("dismiss", eventListener1);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
});
__expose({
  show: (): Promise<string> => (root.value as unknown as Record<string, () => Promise<string>>)["show"]!(),
});
onUnmounted(() => {
  root.value?.removeEventListener("close", eventListener0);
  root.value?.removeEventListener("dismiss", eventListener1);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-toast-region",
    "data-component-root": "ui-toast-region",
    "data-looma-managed": "framework",
    role: "region",
    "aria-label": "Notifications",
    "aria-live": "polite",
    "data-state-open": undefined,
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
