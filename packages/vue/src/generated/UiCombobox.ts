import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, renderSlot as _renderSlot, unref as _unref, withCtx as _withCtx, createVNode as _createVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-size"]
const _hoisted_2 = {
  class: "field",
  part: "field",
  "data-component": "ui-combobox"
}
const _hoisted_3 = ["placeholder", "name", "disabled", "readonly", "required"]
const _hoisted_4 = ["disabled"]
const _hoisted_5 = {
  class: "popup",
  part: "popup",
  hidden: undefined,
  "data-component": "ui-combobox"
}

import UiTooltip from "./UiTooltip";
import { onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCombobox',
  props: {
    clearable: { type: [Boolean, null], required: false, default: false },
    config: { type: null, required: false },
    defaultQuery: { type: [String, null], required: false, default: "" },
    defaultValue: { type: [String, null], required: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    disclosure: { type: [Boolean, null], required: false, default: false },
    help: { type: [String, null], required: false, default: "" },
    label: { type: [String, null], required: false, default: "" },
    labelVisibility: { type: [String, null], required: false, default: "visible" },
    multiple: { type: [Boolean, null], required: false, default: false },
    name: { type: [String, null], required: false, default: "" },
    placeholder: { type: [String, null], required: false, default: "" },
    query: { type: [String, null], required: false },
    readOnly: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false },
    size: { type: [String, null], required: false, default: "md" },
    tokenSeparators: { type: [Array, null], required: false },
    value: { type: [String, null, Array], required: false }
  },
  emits: ["query-change", "value-change", "free-entry", "create-entry", "dependency-invalidate", "validation-change", "options-change", "add-item", "remove-item", "create-item"],
  setup(__props: any, { expose: __expose, emit: __emit }) {



const props = __props;
const emit = __emit;
const definition = {...{"contract":{"tag":"ui-combobox","props":{"clearable":{"type":"boolean","required":false,"target":{"attribute":"clearable"},"default":false},"config":{"type":{"kind":"terminal","name":"unknown"},"required":false,"target":{"property":"config"}},"defaultQuery":{"type":"string","required":false,"target":{"attribute":"defaultquery"},"default":""},"defaultValue":{"type":"string","required":false,"target":{"attribute":"defaultvalue"}},"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"disclosure":{"type":"boolean","required":false,"target":{"attribute":"disclosure"},"default":false},"help":{"type":"string","required":false,"target":{"attribute":"help"},"default":""},"label":{"type":"string","required":false,"target":{"attribute":"label"},"default":""},"labelVisibility":{"type":{"enum":["visible","sr-only"]},"required":false,"target":{"attribute":"labelvisibility"},"default":"visible"},"multiple":{"type":"boolean","required":false,"target":{"attribute":"multiple"},"default":false},"name":{"type":"string","required":false,"target":{"attribute":"name"},"default":""},"placeholder":{"type":"string","required":false,"target":{"attribute":"placeholder"},"default":""},"query":{"type":"string","required":false,"target":{"attribute":"query"}},"readOnly":{"type":"boolean","required":false,"target":{"attribute":"readonly"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"size":{"type":{"enum":["sm","md"]},"required":false,"target":{"attribute":"data-size"},"default":"md"},"tokenSeparators":{"type":{"kind":"list","item":{"kind":"terminal","name":"string"}},"required":false,"target":{"property":"tokenSeparators"}},"value":{"type":{"kind":"union","members":[{"kind":"terminal","name":"string"},{"kind":"terminal","name":"null"},{"kind":"list","item":{"kind":"object","fields":[{"name":"id","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"value","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"label","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"description","type":{"kind":"terminal","name":"string"},"optional":true},{"name":"metadata","type":{"kind":"terminal","name":"unknown"},"optional":true},{"name":"group","type":{"kind":"terminal","name":"string"},"optional":true},{"name":"disabled","type":{"kind":"terminal","name":"boolean"},"optional":true}],"open":false}}]},"required":false,"target":{"property":"value"}}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"property","key":"value","name":"value","expression":"value","expressionPlan":{"source":"value","ast":{"kind":"id","name":"value"},"dependencies":["value"]}},{"kind":"property","key":"tokenseparators","name":"tokenSeparators","expression":"tokenSeparators","expressionPlan":{"source":"tokenSeparators","ast":{"kind":"id","name":"tokenSeparators"},"dependencies":["tokenSeparators"]}},{"kind":"property","key":"config","name":"config","expression":"config","expressionPlan":{"source":"config","ast":{"kind":"id","name":"config"},"dependencies":["config"]}},{"kind":"attribute","name":"data-size","expression":"size","expressionPlan":{"source":"size","ast":{"kind":"id","name":"size"},"dependencies":["size"]}}],"children":[{"kind":"element","name":"label","attributes":[{"kind":"literal","name":"for","value":"input"},{"kind":"literal","name":"part","value":"label"}],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[]}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"field"},{"kind":"literal","name":"part","value":"field"}],"children":[{"kind":"slot","fallback":[],"name":"start"},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"items"},{"kind":"literal","name":"role","value":"group"}],"children":[],"flow":{"kind":"if","test":"multiple","testPlan":{"source":"multiple","ast":{"kind":"id","name":"multiple"},"dependencies":["multiple"]}}},{"kind":"element","name":"input","attributes":[{"kind":"literal","name":"id","value":"input"},{"kind":"literal","name":"role","value":"combobox"},{"kind":"literal","name":"aria-autocomplete","value":"list"},{"kind":"literal","name":"aria-controls","value":"listbox"},{"kind":"attribute","name":"value","expression":"display","expressionPlan":{"source":"display","ast":{"kind":"id","name":"display"},"dependencies":["display"]}},{"kind":"attribute","name":"placeholder","expression":"placeholder","expressionPlan":{"source":"placeholder","ast":{"kind":"id","name":"placeholder"},"dependencies":["placeholder"]}},{"kind":"attribute","name":"name","expression":"name","expressionPlan":{"source":"name","ast":{"kind":"id","name":"name"},"dependencies":["name"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"readonly","expression":"readOnly","expressionPlan":{"source":"readOnly","ast":{"kind":"id","name":"readOnly"},"dependencies":["readOnly"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}},{"kind":"literal","name":"autocomplete","value":"off"},{"kind":"literal","name":"part","value":"input"}],"children":[]},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"part","value":"affordance"}],"children":[{"kind":"text","value":"×"}],"flow":{"kind":"if","test":"clearable","testPlan":{"source":"clearable","ast":{"kind":"id","name":"clearable"},"dependencies":["clearable"]}}},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"id","value":"help"},{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"part","value":"affordance"},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[{"kind":"text","value":"?"}]}],"flow":{"kind":"if","test":"help","testPlan":{"source":"help","ast":{"kind":"id","name":"help"},"dependencies":["help"]}}},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"part","value":"affordance"},{"kind":"literal","name":"aria-controls","value":"listbox"}],"children":[{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[{"kind":"text","value":"⌄"}]}],"flow":{"kind":"if","test":"disclosure","testPlan":{"source":"disclosure","ast":{"kind":"id","name":"disclosure"},"dependencies":["disclosure"]}}}]},{"kind":"element","name":"ui-tooltip","attributes":[{"kind":"literal","name":"id","value":"help-text"},{"kind":"literal","name":"for","value":"help"}],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"help","expressionPlan":{"source":"help","ast":{"kind":"id","name":"help"},"dependencies":["help"]}}],"children":[]}],"flow":{"kind":"if","test":"help","testPlan":{"source":"help","ast":{"kind":"id","name":"help"},"dependencies":["help"]}}},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"popup"},{"kind":"literal","name":"part","value":"popup"},{"kind":"attribute","name":"hidden","expression":"not expanded","expressionPlan":{"source":"not expanded","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"expanded"}},"dependencies":["expanded"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"id","value":"listbox"},{"kind":"literal","name":"role","value":"listbox"}],"children":[]},{"kind":"slot","fallback":[],"name":"footer"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"id","value":"validation"},{"kind":"literal","name":"class","value":"message"},{"kind":"literal","name":"part","value":"validation"},{"kind":"attribute","name":"hidden","expression":"not validation.issues.length","expressionPlan":{"source":"not validation.issues.length","ast":{"kind":"unary","op":"not","operand":{"kind":"member","object":{"kind":"member","object":{"kind":"id","name":"validation"},"key":"issues"},"key":"length"}},"dependencies":["validation.issues.length"]}}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"sr-only"},{"kind":"literal","name":"role","value":"status"},{"kind":"literal","name":"aria-live","value":"polite"},{"kind":"literal","name":"aria-atomic","value":"true"}],"children":[]}]},"declarations":[{"kind":"state","name":"raw","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"display","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"selected","expression":{"source":"null","ast":{"kind":"literal","value":null},"dependencies":[]}},{"kind":"state","name":"expanded","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"rows","expression":{"source":"[]","ast":{"kind":"array","items":[]},"dependencies":[]}},{"kind":"state","name":"active","expression":{"source":"-1","ast":{"kind":"unary","op":"-","operand":{"kind":"literal","value":1}},"dependencies":[]}},{"kind":"state","name":"loading","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"helpOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"lookupError","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"validation","expression":{"source":"{ status: 'pristine', touched: false, dirty: false, issues: [] }","ast":{"kind":"object","pairs":[{"key":"status","value":{"kind":"literal","value":"pristine"}},{"key":"touched","value":{"kind":"literal","value":false}},{"key":"dirty","value":{"kind":"literal","value":false}},{"key":"issues","value":{"kind":"array","items":[]}}]},"dependencies":[]}},{"kind":"event","name":"query-change","type":"object({ query: string, display: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"value-change","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create | invalidation, trigger: keyboard | pointer | programmatic }) | list(object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }))","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"free-entry","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create | invalidation, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"create-entry","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create | invalidation, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"dependency-invalidate","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create | invalidation, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"validation-change","type":"object({ status: pristine | pending | valid | warning | error, touched: boolean, dirty: boolean, issues: list(object({ message: string, path?: list(unknown), severity?: error | warning })), output?: unknown })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"options-change","type":"list(object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }))","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"add-item","type":"object({ item: object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }), index: integer, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"remove-item","type":"object({ item: object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean }), index: integer, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"create-item","type":"object({ query: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"method","name":"validate","exportName":"validate","returns":"promise(unknown)"},{"kind":"method","name":"focusInput","exportName":"focusInput","returns":"promise(undefined)"}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("query-change", (event as CustomEvent<{ readonly query: string; readonly display: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("value-change", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create" | "invalidation"; readonly trigger: "keyboard" | "pointer" | "programmatic" } | readonly ({ readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean })[]>).detail);
const eventListener2 = (event: Event) => emit("free-entry", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create" | "invalidation"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener3 = (event: Event) => emit("create-entry", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create" | "invalidation"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener4 = (event: Event) => emit("dependency-invalidate", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create" | "invalidation"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener5 = (event: Event) => emit("validation-change", (event as CustomEvent<{ readonly status: "pristine" | "pending" | "valid" | "warning" | "error"; readonly touched: boolean; readonly dirty: boolean; readonly issues: readonly ({ readonly message: string; readonly path?: readonly (unknown)[]; readonly severity?: "error" | "warning" })[]; readonly output?: unknown }>).detail);
const eventListener6 = (event: Event) => emit("options-change", (event as CustomEvent<readonly ({ readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean })[]>).detail);
const eventListener7 = (event: Event) => emit("add-item", (event as CustomEvent<{ readonly item: { readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean }; readonly index: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener8 = (event: Event) => emit("remove-item", (event as CustomEvent<{ readonly item: { readonly id: string; readonly value: string; readonly label: string; readonly description?: string; readonly metadata?: unknown; readonly group?: string; readonly disabled?: boolean }; readonly index: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener9 = (event: Event) => emit("create-item", (event as CustomEvent<{ readonly query: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-combobox", props);
  root.value.addEventListener("query-change", eventListener0);
  root.value.addEventListener("value-change", eventListener1);
  root.value.addEventListener("free-entry", eventListener2);
  root.value.addEventListener("create-entry", eventListener3);
  root.value.addEventListener("dependency-invalidate", eventListener4);
  root.value.addEventListener("validation-change", eventListener5);
  root.value.addEventListener("options-change", eventListener6);
  root.value.addEventListener("add-item", eventListener7);
  root.value.addEventListener("remove-item", eventListener8);
  root.value.addEventListener("create-item", eventListener9);
});
watchEffect(() => {
  if (root.value == null) return;
  for (const name of ["clearable","config","defaultQuery","defaultValue","disabled","disclosure","help","label","labelVisibility","multiple","name","placeholder","query","readOnly","required","size","tokenSeparators","value"]) (root.value as unknown as Record<string, unknown>)[name] = props[name as keyof typeof props];
});
__expose({
  validate: (): Promise<unknown> => (root.value as unknown as Record<string, () => Promise<unknown>>)["validate"]!(),
  focusInput: (): Promise<void> => (root.value as unknown as Record<string, () => Promise<void>>)["focusInput"]!(),
});
onUnmounted(() => {
  root.value?.removeEventListener("query-change", eventListener0);
  root.value?.removeEventListener("value-change", eventListener1);
  root.value?.removeEventListener("free-entry", eventListener2);
  root.value?.removeEventListener("create-entry", eventListener3);
  root.value?.removeEventListener("dependency-invalidate", eventListener4);
  root.value?.removeEventListener("validation-change", eventListener5);
  root.value?.removeEventListener("options-change", eventListener6);
  root.value?.removeEventListener("add-item", eventListener7);
  root.value?.removeEventListener("remove-item", eventListener8);
  root.value?.removeEventListener("create-item", eventListener9);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-combobox",
    "data-component-root": "ui-combobox",
    "data-looma-managed": "framework",
    "data-size": props.size,
    ref_key: "root",
    ref: root
  }), [
    _cache[6] || (_cache[6] = _createElementVNode("label", {
      for: "input",
      part: "label",
      "data-component": "ui-combobox"
    }, [
      _createElementVNode("template", { "data-component": "ui-combobox" }, [
        _createTextVNode(_toDisplayString(undefined))
      ])
    ], -1 /* CACHED */)),
    _createElementVNode("div", _hoisted_2, [
      _renderSlot(_ctx.$slots, "start"),
      _cache[1] || (_cache[1] = _createElementVNode("div", {
        class: "items",
        role: "group",
        "data-component": "ui-combobox"
      }, null, -1 /* CACHED */)),
      _createElementVNode("input", {
        id: "input",
        role: "combobox",
        "aria-autocomplete": "list",
        "aria-controls": "listbox",
        value: undefined,
        placeholder: props.placeholder,
        name: props.name,
        disabled: props.disabled,
        readonly: props.readOnly,
        required: props.required,
        autocomplete: "off",
        part: "input",
        "data-component": "ui-combobox"
      }, null, 8 /* PROPS */, _hoisted_3),
      _cache[2] || (_cache[2] = _createElementVNode("button", {
        type: "button",
        part: "affordance",
        "data-component": "ui-combobox"
      }, " × ", -1 /* CACHED */)),
      _createElementVNode("button", {
        id: "help",
        type: "button",
        part: "affordance",
        disabled: props.disabled,
        "data-component": "ui-combobox"
      }, [...(_cache[0] || (_cache[0] = [
        _createElementVNode("span", {
          "aria-hidden": "true",
          "data-component": "ui-combobox"
        }, " ? ", -1 /* CACHED */)
      ]))], 8 /* PROPS */, _hoisted_4),
      _cache[3] || (_cache[3] = _createElementVNode("button", {
        type: "button",
        part: "affordance",
        "aria-controls": "listbox",
        "data-component": "ui-combobox"
      }, [
        _createElementVNode("span", {
          "aria-hidden": "true",
          "data-component": "ui-combobox"
        }, " ⌄ ")
      ], -1 /* CACHED */))
    ]),
    _createVNode(_unref(UiTooltip), {
      id: "help-text",
      for: "help",
      "data-component": "ui-combobox"
    }, {
      default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
        _createElementVNode("template", { "data-component": "ui-combobox" }, [
          _createTextVNode(_toDisplayString(undefined))
        ], -1 /* CACHED */)
      ]))]),
      _: 1 /* STABLE */
    }),
    _createElementVNode("div", _hoisted_5, [
      _cache[5] || (_cache[5] = _createElementVNode("div", {
        id: "listbox",
        role: "listbox",
        "data-component": "ui-combobox"
      }, null, -1 /* CACHED */)),
      _renderSlot(_ctx.$slots, "footer")
    ]),
    _cache[7] || (_cache[7] = _createElementVNode("div", {
      id: "validation",
      class: "message",
      part: "validation",
      hidden: undefined,
      "data-component": "ui-combobox"
    }, null, -1 /* CACHED */)),
    _cache[8] || (_cache[8] = _createElementVNode("div", {
      class: "sr-only",
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      "data-component": "ui-combobox"
    }, null, -1 /* CACHED */))
  ], 16 /* FULL_PROPS */, _hoisted_1))
}
}

})
