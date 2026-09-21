import { defineComponent as _defineComponent } from 'vue'
import { renderSlot as _renderSlot, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiReel',
  props: {
    gap: { type: [String, null], required: false },
    itemWidth: { type: [String, null], required: false },
    snap: { type: [String, null], required: false }
  },
  setup(__props: any) {



const props = __props;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valuegap = props.gap;
  const valueitemWidth = props.itemWidth;
  const valuesnap = props.snap;
  return { "gap": passed("gap", "gap") ? valuegap : undefined, "itemWidth": passed("itemWidth", "item-width") ? valueitemWidth : undefined, "snap": passed("snap", "snap") ? valuesnap : undefined };
};
const definition = {...{"contract":{"tag":"ui-reel","props":{"gap":{"type":{"enum":["xs","s","m","l","xl"]},"required":false,"target":{"attribute":"gap"}},"itemWidth":{"type":{"enum":["sm","md","lg"]},"required":false,"target":{"attribute":"itemwidth"}},"snap":{"type":{"enum":["start","center"]},"required":false,"target":{"attribute":"snap"}}}},"template":{"kind":"element","name":"div","attributes":[],"children":[{"kind":"slot"}]},"declarations":[],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-reel", explicitProps());
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
    "data-component": "ui-reel",
    "data-component-root": "ui-reel",
    ref_key: "root",
    ref: root
  }), [
    _renderSlot(_ctx.$slots, "default")
  ], 16 /* FULL_PROPS */))
}
}

})
