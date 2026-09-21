import { defineComponent as _defineComponent } from 'vue'
import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createElementVNode as _createElementVNode, renderSlot as _renderSlot, unref as _unref, withCtx as _withCtx, createVNode as _createVNode, mergeProps as _mergeProps, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["data-size"]
const _hoisted_2 = {
  class: "field",
  part: "field",
  "data-component": "ui-combobox"
}
const _hoisted_3 = {
  slot: "start",
  style: {"display":"contents"}
}
const _hoisted_4 = ["placeholder", "name", "disabled", "readonly", "required"]
const _hoisted_5 = ["disabled"]
const _hoisted_6 = {
  class: "popup",
  part: "popup",
  hidden: undefined,
  "data-component": "ui-combobox"
}
const _hoisted_7 = {
  slot: "footer",
  style: {"display":"contents"}
}
const _hoisted_8 = {
  class: "authored-options",
  hidden: "",
  "aria-hidden": "true",
  "data-component": "ui-combobox"
}
const _hoisted_9 = {
  slot: "",
  style: {"display":"contents"}
}

import UiTooltip from "./UiTooltip";
import { getCurrentInstance, onMounted, onUnmounted, ref, watchEffect } from "vue";
import { attachLoomaComponent, updateComponentProps } from "@threadlabs/looma-core/declarative";
import type { ComponentDefinition } from "@threadlabs/looma-core/declarative";


export default /*@__PURE__*/_defineComponent({
  ...{ inheritAttrs: false },
  __name: 'UiCombobox',
  props: {
    allowCreate: { type: [Boolean, null], required: false, default: false },
    allowFreeText: { type: [Boolean, null], required: false, default: false },
    clearable: { type: [Boolean, null], required: false, default: false },
    disabled: { type: [Boolean, null], required: false, default: false },
    disclosure: { type: [Boolean, null], required: false, default: false },
    help: { type: [String, null], required: false, default: "" },
    items: { type: [Array, null], required: false },
    label: { type: [String, null], required: false, default: "" },
    labelVisibility: { type: [String, null], required: false, default: "visible" },
    multiple: { type: [Boolean, null], required: false, default: false },
    name: { type: [String, null], required: false, default: "" },
    placeholder: { type: [String, null], required: false, default: "" },
    query: { type: [String, null], required: false },
    readonly: { type: [Boolean, null], required: false, default: false },
    required: { type: [Boolean, null], required: false, default: false },
    size: { type: [String, null], required: false, default: "md" },
    tokenSeparators: { type: [Array, null], required: false },
    value: { type: [String, null], required: false }
  },
  emits: ["query-change", "value-change", "free-entry", "create-entry", "validation-change", "options-change", "add-item", "remove-item", "create-item"],
  setup(__props: any, { expose: __expose, emit: __emit }) {



const props = __props;
const emit = __emit;
const instance = getCurrentInstance();
const passed = (name: string, attribute: string): boolean => {
  const raw = instance?.vnode.props ?? {};
  return Object.hasOwn(raw, name) || Object.hasOwn(raw, attribute);
};
const explicitProps = (): Record<string, unknown> => {
  const valueallowCreate = props.allowCreate;
  const valueallowFreeText = props.allowFreeText;
  const valueclearable = props.clearable;
  const valuedisabled = props.disabled;
  const valuedisclosure = props.disclosure;
  const valuehelp = props.help;
  const valueitems = props.items;
  const valuelabel = props.label;
  const valuelabelVisibility = props.labelVisibility;
  const valuemultiple = props.multiple;
  const valuename = props.name;
  const valueplaceholder = props.placeholder;
  const valuequery = props.query;
  const valuereadonly = props.readonly;
  const valuerequired = props.required;
  const valuesize = props.size;
  const valuetokenSeparators = props.tokenSeparators;
  const valuevalue = props.value;
  return { "allowCreate": passed("allowCreate", "allow-create") ? valueallowCreate : undefined, "allowFreeText": passed("allowFreeText", "allow-free-text") ? valueallowFreeText : undefined, "clearable": passed("clearable", "clearable") ? valueclearable : undefined, "disabled": passed("disabled", "disabled") ? valuedisabled : undefined, "disclosure": passed("disclosure", "disclosure") ? valuedisclosure : undefined, "help": passed("help", "help") ? valuehelp : undefined, "items": passed("items", "items") ? valueitems : undefined, "label": passed("label", "label") ? valuelabel : undefined, "labelVisibility": passed("labelVisibility", "label-visibility") ? valuelabelVisibility : undefined, "multiple": passed("multiple", "multiple") ? valuemultiple : undefined, "name": passed("name", "name") ? valuename : undefined, "placeholder": passed("placeholder", "placeholder") ? valueplaceholder : undefined, "query": passed("query", "query") ? valuequery : undefined, "readonly": passed("readonly", "readonly") ? valuereadonly : undefined, "required": passed("required", "required") ? valuerequired : undefined, "size": passed("size", "size") ? valuesize : undefined, "tokenSeparators": passed("tokenSeparators", "token-separators") ? valuetokenSeparators : undefined, "value": passed("value", "value") ? valuevalue : undefined };
};
const definition = {...{"contract":{"tag":"ui-combobox","props":{"allowCreate":{"type":"boolean","required":false,"target":{"attribute":"allowcreate"},"default":false},"allowFreeText":{"type":"boolean","required":false,"target":{"attribute":"allowfreetext"},"default":false},"clearable":{"type":"boolean","required":false,"target":{"attribute":"clearable"},"default":false},"disabled":{"type":"boolean","required":false,"target":{"attribute":"disabled"},"default":false},"disclosure":{"type":"boolean","required":false,"target":{"attribute":"disclosure"},"default":false},"help":{"type":"string","required":false,"target":{"attribute":"help"},"default":""},"items":{"type":{"kind":"list","item":{"kind":"object","fields":[{"name":"id","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"value","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"label","type":{"kind":"terminal","name":"string"},"optional":false},{"name":"group","type":{"kind":"terminal","name":"string"},"optional":true},{"name":"disabled","type":{"kind":"terminal","name":"boolean"},"optional":true}],"open":false}},"required":false,"target":{"attribute":"items"}},"label":{"type":"string","required":false,"target":{"attribute":"label"},"default":""},"labelVisibility":{"type":{"enum":["visible","sr-only"]},"required":false,"target":{"attribute":"labelvisibility"},"default":"visible"},"multiple":{"type":"boolean","required":false,"target":{"attribute":"multiple"},"default":false},"name":{"type":"string","required":false,"target":{"attribute":"name"},"default":""},"placeholder":{"type":"string","required":false,"target":{"attribute":"placeholder"},"default":""},"query":{"type":"string","required":false,"target":{"attribute":"query"}},"readonly":{"type":"boolean","required":false,"target":{"attribute":"readonly"},"default":false},"required":{"type":"boolean","required":false,"target":{"attribute":"required"},"default":false},"size":{"type":{"enum":["sm","md"]},"required":false,"target":{"attribute":"data-size"},"default":"md"},"tokenSeparators":{"type":{"kind":"list","item":{"kind":"terminal","name":"string"}},"required":false,"target":{"attribute":"tokenseparators"}},"value":{"type":{"kind":"union","members":[{"kind":"terminal","name":"string"},{"kind":"terminal","name":"null"}]},"required":false,"target":{"attribute":"value"}}}},"template":{"kind":"element","name":"div","attributes":[{"kind":"attribute","name":"data-size","expression":"size","expressionPlan":{"source":"size","ast":{"kind":"id","name":"size"},"dependencies":["size"]}}],"children":[{"kind":"element","name":"label","attributes":[{"kind":"literal","name":"for","value":"input"},{"kind":"literal","name":"part","value":"label"}],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"label","expressionPlan":{"source":"label","ast":{"kind":"id","name":"label"},"dependencies":["label"]}}],"children":[]}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"field"},{"kind":"literal","name":"part","value":"field"}],"children":[{"kind":"slot","fallback":[],"name":"start"},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"items"},{"kind":"literal","name":"role","value":"group"}],"children":[],"flow":{"kind":"if","test":"multiple","testPlan":{"source":"multiple","ast":{"kind":"id","name":"multiple"},"dependencies":["multiple"]}}},{"kind":"element","name":"input","attributes":[{"kind":"literal","name":"id","value":"input"},{"kind":"literal","name":"role","value":"combobox"},{"kind":"literal","name":"aria-autocomplete","value":"list"},{"kind":"literal","name":"aria-controls","value":"listbox"},{"kind":"attribute","name":"value","expression":"display","expressionPlan":{"source":"display","ast":{"kind":"id","name":"display"},"dependencies":["display"]}},{"kind":"attribute","name":"placeholder","expression":"placeholder","expressionPlan":{"source":"placeholder","ast":{"kind":"id","name":"placeholder"},"dependencies":["placeholder"]}},{"kind":"attribute","name":"name","expression":"name","expressionPlan":{"source":"name","ast":{"kind":"id","name":"name"},"dependencies":["name"]}},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}},{"kind":"attribute","name":"readonly","expression":"readonly","expressionPlan":{"source":"readonly","ast":{"kind":"id","name":"readonly"},"dependencies":["readonly"]}},{"kind":"attribute","name":"required","expression":"required","expressionPlan":{"source":"required","ast":{"kind":"id","name":"required"},"dependencies":["required"]}},{"kind":"literal","name":"autocomplete","value":"off"},{"kind":"literal","name":"part","value":"input"}],"children":[]},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"part","value":"affordance"}],"children":[{"kind":"element","name":"svg","attributes":[{"kind":"literal","name":"class","value":"affordance-icon"},{"kind":"literal","name":"aria-hidden","value":"true"},{"kind":"literal","name":"viewBox","value":"0 0 24 24"},{"kind":"literal","name":"fill","value":"none"},{"kind":"literal","name":"stroke","value":"currentColor"},{"kind":"literal","name":"stroke-width","value":"2"},{"kind":"literal","name":"stroke-linecap","value":"round"}],"children":[{"kind":"element","name":"path","attributes":[{"kind":"literal","name":"d","value":"M7 7l10 10M17 7 7 17"}],"children":[]}]}],"flow":{"kind":"if","test":"clearable","testPlan":{"source":"clearable","ast":{"kind":"id","name":"clearable"},"dependencies":["clearable"]}}},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"id","value":"help"},{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"part","value":"affordance"},{"kind":"attribute","name":"disabled","expression":"disabled","expressionPlan":{"source":"disabled","ast":{"kind":"id","name":"disabled"},"dependencies":["disabled"]}}],"children":[{"kind":"element","name":"span","attributes":[{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[{"kind":"text","value":"?"}]}],"flow":{"kind":"if","test":"help","testPlan":{"source":"help","ast":{"kind":"id","name":"help"},"dependencies":["help"]}}},{"kind":"element","name":"button","attributes":[{"kind":"literal","name":"type","value":"button"},{"kind":"literal","name":"part","value":"affordance"},{"kind":"literal","name":"aria-controls","value":"listbox"}],"children":[{"kind":"element","name":"svg","attributes":[{"kind":"literal","name":"class","value":"affordance-icon"},{"kind":"literal","name":"aria-hidden","value":"true"},{"kind":"literal","name":"viewBox","value":"0 0 24 24"},{"kind":"literal","name":"fill","value":"none"},{"kind":"literal","name":"stroke","value":"currentColor"},{"kind":"literal","name":"stroke-width","value":"2.25"},{"kind":"literal","name":"stroke-linecap","value":"round"},{"kind":"literal","name":"stroke-linejoin","value":"round"}],"children":[{"kind":"element","name":"path","attributes":[{"kind":"literal","name":"d","value":"m6 9 6 6 6-6"}],"children":[]}]}],"flow":{"kind":"if","test":"disclosure","testPlan":{"source":"disclosure","ast":{"kind":"id","name":"disclosure"},"dependencies":["disclosure"]}}}]},{"kind":"element","name":"ui-tooltip","attributes":[{"kind":"literal","name":"id","value":"help-text"},{"kind":"literal","name":"for","value":"help"}],"children":[{"kind":"element","name":"template","attributes":[{"kind":"directive","name":"value","expression":"help","expressionPlan":{"source":"help","ast":{"kind":"id","name":"help"},"dependencies":["help"]}}],"children":[]}],"flow":{"kind":"if","test":"help","testPlan":{"source":"help","ast":{"kind":"id","name":"help"},"dependencies":["help"]}}},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"popup"},{"kind":"literal","name":"part","value":"popup"},{"kind":"attribute","name":"hidden","expression":"not expanded","expressionPlan":{"source":"not expanded","ast":{"kind":"unary","op":"not","operand":{"kind":"id","name":"expanded"}},"dependencies":["expanded"]}}],"children":[{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"id","value":"listbox"},{"kind":"literal","name":"role","value":"listbox"}],"children":[]},{"kind":"slot","fallback":[],"name":"footer"}]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"id","value":"validation"},{"kind":"literal","name":"class","value":"message"},{"kind":"literal","name":"part","value":"validation"},{"kind":"attribute","name":"hidden","expression":"not validation.issues.length","expressionPlan":{"source":"not validation.issues.length","ast":{"kind":"unary","op":"not","operand":{"kind":"member","object":{"kind":"member","object":{"kind":"id","name":"validation"},"key":"issues"},"key":"length"}},"dependencies":["validation.issues.length"]}}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"sr-only"},{"kind":"literal","name":"role","value":"status"},{"kind":"literal","name":"aria-live","value":"polite"},{"kind":"literal","name":"aria-atomic","value":"true"}],"children":[]},{"kind":"element","name":"div","attributes":[{"kind":"literal","name":"class","value":"authored-options"},{"kind":"literal","name":"hidden","value":""},{"kind":"literal","name":"aria-hidden","value":"true"}],"children":[{"kind":"slot"}]}]},"declarations":[{"kind":"state","name":"raw","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"display","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"selected","expression":{"source":"null","ast":{"kind":"literal","value":null},"dependencies":[]}},{"kind":"state","name":"expanded","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"rows","expression":{"source":"[]","ast":{"kind":"array","items":[]},"dependencies":[]}},{"kind":"state","name":"active","expression":{"source":"-1","ast":{"kind":"unary","op":"-","operand":{"kind":"literal","value":1}},"dependencies":[]}},{"kind":"state","name":"loading","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"helpOpen","expression":{"source":"false","ast":{"kind":"literal","value":false},"dependencies":[]}},{"kind":"state","name":"lookupError","expression":{"source":"''","ast":{"kind":"literal","value":""},"dependencies":[]}},{"kind":"state","name":"validation","expression":{"source":"{ status: 'pristine', touched: false, dirty: false, issues: [] }","ast":{"kind":"object","pairs":[{"key":"status","value":{"kind":"literal","value":"pristine"}},{"key":"touched","value":{"kind":"literal","value":false}},{"key":"dirty","value":{"kind":"literal","value":false}},{"key":"issues","value":{"kind":"array","items":[]}}]},"dependencies":[]}},{"kind":"event","name":"query-change","type":"object({ query: string, display: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"value-change","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create, trigger: keyboard | pointer | programmatic }) | list(object({ id: string, value: string, label: string, group?: string, disabled?: boolean }))","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"free-entry","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"create-entry","type":"object({ value: string | null, query: string, option: object({ id: string, value: string, label: string, group?: string, disabled?: boolean }) | null, kind: selection | clear | free-entry | create, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"validation-change","type":"object({ status: pristine | pending | valid | warning | error, touched: boolean, dirty: boolean, issues: list(object({ message: string, path?: list(unknown), severity?: error | warning })), output?: unknown })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"options-change","type":"list(object({ id: string, value: string, label: string, group?: string, disabled?: boolean }))","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"add-item","type":"object({ item: object({ id: string, value: string, label: string, group?: string, disabled?: boolean }), index: integer, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"remove-item","type":"object({ item: object({ id: string, value: string, label: string, group?: string, disabled?: boolean }), index: integer, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"event","name":"create-item","type":"object({ query: string, trigger: keyboard | pointer | programmatic })","bubbles":true,"composed":true,"cancelable":false},{"kind":"method","name":"validate","exportName":"validate","returns":"promise(unknown)"},{"kind":"method","name":"focusInput","exportName":"focusInput","returns":"promise(undefined)"}],"root":{"kind":"native","element":"div","choices":["div"]}},source:{file:import.meta.url},css:""} as unknown as ComponentDefinition;
const root = ref<Element>();
const eventListener0 = (event: Event) => emit("query-change", (event as CustomEvent<{ readonly query: string; readonly display: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener1 = (event: Event) => emit("value-change", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create"; readonly trigger: "keyboard" | "pointer" | "programmatic" } | readonly ({ readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean })[]>).detail);
const eventListener2 = (event: Event) => emit("free-entry", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener3 = (event: Event) => emit("create-entry", (event as CustomEvent<{ readonly value: string | null; readonly query: string; readonly option: { readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean } | null; readonly kind: "selection" | "clear" | "free-entry" | "create"; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener4 = (event: Event) => emit("validation-change", (event as CustomEvent<{ readonly status: "pristine" | "pending" | "valid" | "warning" | "error"; readonly touched: boolean; readonly dirty: boolean; readonly issues: readonly ({ readonly message: string; readonly path?: readonly (unknown)[]; readonly severity?: "error" | "warning" })[]; readonly output?: unknown }>).detail);
const eventListener5 = (event: Event) => emit("options-change", (event as CustomEvent<readonly ({ readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean })[]>).detail);
const eventListener6 = (event: Event) => emit("add-item", (event as CustomEvent<{ readonly item: { readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean }; readonly index: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener7 = (event: Event) => emit("remove-item", (event as CustomEvent<{ readonly item: { readonly id: string; readonly value: string; readonly label: string; readonly group?: string; readonly disabled?: boolean }; readonly index: number; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
const eventListener8 = (event: Event) => emit("create-item", (event as CustomEvent<{ readonly query: string; readonly trigger: "keyboard" | "pointer" | "programmatic" }>).detail);
let detach: undefined | (() => void);
onMounted(() => {
  if (root.value == null) return;
  detach = attachLoomaComponent(root.value, definition, "ui-combobox", explicitProps());
  root.value.addEventListener("query-change", eventListener0);
  root.value.addEventListener("value-change", eventListener1);
  root.value.addEventListener("free-entry", eventListener2);
  root.value.addEventListener("create-entry", eventListener3);
  root.value.addEventListener("validation-change", eventListener4);
  root.value.addEventListener("options-change", eventListener5);
  root.value.addEventListener("add-item", eventListener6);
  root.value.addEventListener("remove-item", eventListener7);
  root.value.addEventListener("create-item", eventListener8);
});
watchEffect(() => {
  const next = explicitProps();
  if (root.value == null) return;
  updateComponentProps(root.value, next);
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
  root.value?.removeEventListener("validation-change", eventListener4);
  root.value?.removeEventListener("options-change", eventListener5);
  root.value?.removeEventListener("add-item", eventListener6);
  root.value?.removeEventListener("remove-item", eventListener7);
  root.value?.removeEventListener("create-item", eventListener8);
  detach?.();
});

return (_ctx: any,_cache: any) => {
  return (_openBlock(), _createElementBlock("div", _mergeProps(_ctx.$attrs, {
    "data-component": "ui-combobox",
    "data-component-root": "ui-combobox",
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
      _createElementVNode("span", _hoisted_3, [
        _renderSlot(_ctx.$slots, "start")
      ]),
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
        readonly: props.readonly,
        required: props.required,
        autocomplete: "off",
        part: "input",
        "data-component": "ui-combobox"
      }, null, 8 /* PROPS */, _hoisted_4),
      _cache[2] || (_cache[2] = _createElementVNode("button", {
        type: "button",
        part: "affordance",
        "data-component": "ui-combobox"
      }, [
        _createElementVNode("svg", {
          class: "affordance-icon",
          "aria-hidden": "true",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "data-component": "ui-combobox"
        }, [
          _createElementVNode("path", {
            d: "M7 7l10 10M17 7 7 17",
            "data-component": "ui-combobox"
          })
        ])
      ], -1 /* CACHED */)),
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
      ]))], 8 /* PROPS */, _hoisted_5),
      _cache[3] || (_cache[3] = _createElementVNode("button", {
        type: "button",
        part: "affordance",
        "aria-controls": "listbox",
        "data-component": "ui-combobox"
      }, [
        _createElementVNode("svg", {
          class: "affordance-icon",
          "aria-hidden": "true",
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2.25",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          "data-component": "ui-combobox"
        }, [
          _createElementVNode("path", {
            d: "m6 9 6 6 6-6",
            "data-component": "ui-combobox"
          })
        ])
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
    _createElementVNode("div", _hoisted_6, [
      _cache[5] || (_cache[5] = _createElementVNode("div", {
        id: "listbox",
        role: "listbox",
        "data-component": "ui-combobox"
      }, null, -1 /* CACHED */)),
      _createElementVNode("span", _hoisted_7, [
        _renderSlot(_ctx.$slots, "footer")
      ])
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
    }, null, -1 /* CACHED */)),
    _createElementVNode("div", _hoisted_8, [
      _createElementVNode("span", _hoisted_9, [
        _renderSlot(_ctx.$slots, "default")
      ])
    ])
  ], -2 /* BAIL */, _hoisted_1))
}
}

})
