/**
 * Framework-neutral public contracts for Looma core components.
 *
 * This file is the design boundary for the migrated package. A contract should
 * describe what an HTML author or framework consumer can observe: native root
 * semantics, values, state ownership, events, methods, slots, and dependency
 * edges. It must not encode how the legacy Stencil class happened to implement
 * those behaviors. The Stencil reader is an ingest adapter used to recover
 * render structure and detect drift while that source still exists; decorators,
 * class fields, and component instance methods are evidence, not authority.
 *
 * That distinction matters when extending this table. A Stencil `@Prop()` may
 * become an HTML attribute, a property-only structured value, or no public API
 * at all. Conversely, a stable declarative capability may need an explicit
 * contract even when the old implementation only exposed it accidentally.
 */

/**
 * Freezes a complete component contract so converter passes cannot mutate API
 * decisions while deriving templates. `root` is required because choosing the
 * semantic native owner is part of the API, not a rendering optimization.
 */
const component = ({ root, props = {}, slots = [], methods = [], events = [], dependencies = [], stateAttributes = {} } = {}) => {
  if (root === undefined) throw new Error("Every component contract must choose its native root");
  return (
  Object.freeze({
    root,
    props: Object.freeze(props),
    slots: Object.freeze(slots),
    methods: Object.freeze(methods),
    events: Object.freeze(events),
    dependencies: Object.freeze(dependencies),
    stateAttributes: Object.freeze(stateAttributes),
  }));
};

/**
 * Declares one consumer-facing value.
 *
 * `attribute` records the serialized spelling when it differs from the
 * property name. `channel: "property"` is a semantic constraint for values
 * that cannot round-trip through HTML (functions, rich objects, trusted
 * values), not a workaround for a framework. Scalar defaults belong here so
 * every native/framework adapter starts from the same contract.
 */
const prop = (type, options = {}) => Object.freeze({ type, ...options });

/**
 * Declares an observable interaction. Event detail is modeled in the same
 * portable type language as props so generated adapters do not inherit a
 * Stencil event class or a Looma-internal TypeScript shape.
 */
const event = (name, type, options = {}) => Object.freeze({ name, type, ...options });

const inputTrigger = "keyboard | pointer | programmatic";
const overlayChange = `object({ open: boolean, reason: action | programmatic | light-dismiss | escape, trigger: ${inputTrigger} })`;
const checkedChange = `object({ checked: boolean, value: string, trigger: ${inputTrigger} })`;
const valueChange = `object({ value: string, trigger: ${inputTrigger} })`;
const option = "object({ id: string, value: string, label: string, description?: string, metadata?: unknown, group?: string, disabled?: boolean })";
const comboboxChange = `object({ value: string | null, query: string, option: ${option} | null, kind: selection | clear | free-entry | create | invalidation, trigger: ${inputTrigger} })`;
const validationState = "object({ status: pristine | pending | valid | warning | error, touched: boolean, dirty: boolean, issues: list(object({ message: string, path?: list(unknown), severity?: error | warning })), output?: unknown })";

export const coreContracts = Object.freeze({
  "ui-affordance-scope": component({ root: "span", slots: ["default"],
    props: { nearRadius: prop("number", { attribute: "near-radius", default: 16 }) },
  }),
  "ui-avatar": component({ root: "span",
    props: {
      src: prop("string", { default: "" }), alt: prop("string", { default: "" }),
      name: prop("string", { default: "" }), fallback: prop("string", { default: "" }),
    },
  }),
  "ui-avatar-group": component({ root: "div", slots: ["default"],
    props: { max: prop("number", { default: 5 }), label: prop("string", { default: "People" }) },
  }),
  "ui-badge": component({ root: "span", slots: ["default"], props: { variant: prop("string"), tone: prop("string") } }),
  "ui-button": component({ root: "span", slots: ["default"],
    props: {
      variant: prop("string", { default: "outline" }), size: prop("string"),
      disabled: prop("boolean", { default: false }),
    },
  }),
  "ui-callout": component({ root: "div", slots: ["default"], props: { tone: prop("info | note | warning | success | error", { default: "info" }) } }),
  "ui-checkbox": component({ root: "span", slots: ["default"],
    props: {
      checked: prop("boolean"), defaultChecked: prop("boolean", { attribute: "default-checked", default: false }),
      disabled: prop("boolean", { default: false }), indeterminate: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }), value: prop("string", { default: "on" }),
    },
    events: [event("change", checkedChange)],
  }),
  "ui-chip": component({ root: "span", slots: ["default"],
    props: {
      appearance: prop("tag | pill", { default: "tag" }), size: prop("xs | sm", { default: "xs" }),
    },
  }),
  "ui-combobox": component({ root: "div", slots: ["start", "item-*", "option-*", "create", "loading", "error", "empty", "footer"],
    props: {
      label: prop("string", { default: "" }), placeholder: prop("string", { default: "" }),
      name: prop("string", { default: "" }), value: prop(`string | null | list(${option})`),
      defaultValue: prop("string", { attribute: "default-value" }),
      multiple: prop("boolean", { default: false }), tokenSeparators: prop("list(string)", { attribute: "token-separators", channel: "property" }),
      query: prop("string"), defaultQuery: prop("string", { attribute: "default-query", default: "" }),
      config: prop("unknown", { channel: "property" }), disabled: prop("boolean", { default: false }),
      readOnly: prop("boolean", { attribute: "read-only", default: false }), required: prop("boolean", { default: false }),
      size: prop("sm | md", { default: "md" }),
      labelVisibility: prop("visible | sr-only", { attribute: "label-visibility", default: "visible" }),
      disclosure: prop("boolean", { default: false }), clearable: prop("boolean", { default: false }),
      help: prop("string", { default: "" }),
    },
    methods: [
      { name: "validate", returns: "promise(unknown)" },
      { name: "focusInput", returns: "promise(undefined)" },
    ],
    events: [
      event("query-change", `object({ query: string, display: string, trigger: ${inputTrigger} })`),
      event("value-change", `${comboboxChange} | list(${option})`),
      event("free-entry", comboboxChange),
      event("create-entry", comboboxChange),
      event("dependency-invalidate", comboboxChange),
      event("validation-change", validationState),
      event("options-change", `list(${option})`),
      event("add-item", `object({ item: ${option}, index: integer, trigger: ${inputTrigger} })`),
      event("remove-item", `object({ item: ${option}, index: integer, trigger: ${inputTrigger} })`),
      event("create-item", `object({ query: string, trigger: ${inputTrigger} })`),
    ],
    dependencies: ["ui-chip", "ui-tooltip"],
  }),
  "ui-context-menu": component({ root: "span", slots: ["trigger", "default"],
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      for: prop("string"),
    },
    events: [
      event("open", overlayChange),
      event("close", overlayChange),
      event("select", `object({ value: string, trigger: ${inputTrigger} })`),
    ],
    dependencies: ["ui-menu"],
    stateAttributes: { "data-open": "data-state-open" },
  }),
  "ui-dialog": component({ root: "div", slots: ["default"],
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      modal: prop("boolean", { default: true }), dismissible: prop("boolean", { default: true }),
      label: prop("string"),
    },
    events: [event("close", overlayChange)],
    stateAttributes: { "data-open": "data-state-open" },
  }),
  "ui-disclosure": component({ root: "div", slots: ["default"],
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      disabled: prop("boolean", { default: false }),
    },
    events: [event("open", overlayChange), event("close", overlayChange)],
  }),
  "ui-editable": component({ root: "div", slots: ["preview", "edit"],
    props: {
      edit: prop("boolean"), defaultEdit: prop("boolean", { attribute: "default-edit", default: false }),
      disabled: prop("boolean", { default: false }),
    },
    events: [event("edit-change", `object({ edit: boolean, reason: activate | light-dismiss | escape | programmatic, trigger: ${inputTrigger} })`)],
    stateAttributes: { "data-edit": "data-state-edit" },
  }),
  "ui-floating-action-button": component({ root: "span", slots: ["default"],
    props: {
      disabled: prop("boolean", { default: false }),
      mobileOnly: prop("boolean", { attribute: "mobile-only", default: false }),
      label: prop("string", { default: "" }),
    },
  }),
  "ui-form-field": component({ root: "div", slots: ["default"],
    props: {
      invalid: prop("boolean", { default: false }), disabled: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }),
    },
  }),
  "ui-icon-button": component({ root: "span", slots: ["default"],
    props: {
      disabled: prop("boolean", { default: false }), label: prop("string", { default: "" }),
      size: prop("sm | md | lg", { default: "md" }), variant: prop("ghost | outline | solid", { default: "ghost" }),
      anticipatory: prop("boolean", { default: false }),
    },
  }),
  "ui-input": component({ root: "span", slots: ["default"],
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value", default: "" }),
      disabled: prop("boolean", { default: false }), invalid: prop("boolean", { default: false }),
      readOnly: prop("boolean", { attribute: "read-only", default: false }),
    },
    events: [event("input", valueChange), event("change", valueChange)],
  }),
  "ui-menu": component({ root: "div", slots: ["default"],
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      for: prop("string"), placement: prop("string", { default: "bottom-start" }),
    },
    events: [
      event("select", `object({ value: string, trigger: ${inputTrigger} })`),
      event("close", overlayChange),
    ],
    stateAttributes: { "data-open": "data-state-open" },
  }),
  "ui-menu-item": component({ root: "div", slots: ["default"],
    props: { disabled: prop("boolean", { default: false }), value: prop("string", { default: "" }) },
  }),
  "ui-popover": component({ root: "span", slots: ["default"],
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      for: prop("string"), placement: prop("string", { default: "bottom-start" }),
    },
    events: [event("open", overlayChange), event("close", overlayChange)],
    stateAttributes: { "data-open": "data-state-open" },
  }),
  "ui-radio": component({ root: "span", slots: ["default"],
    props: {
      checked: prop("boolean"), defaultChecked: prop("boolean", { attribute: "default-checked", default: false }),
      disabled: prop("boolean", { default: false }), name: prop("string", { default: "" }),
      required: prop("boolean", { default: false }), value: prop("string", { default: "on" }),
    },
    events: [event("change", checkedChange)],
  }),
  "ui-radio-group": component({ root: "span", slots: ["default"],
    props: {
      value: prop("string", { default: "" }), name: prop("string", { default: "" }),
      orientation: prop("horizontal | vertical", { default: "horizontal" }), disabled: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }),
    },
    events: [
      event("select", `object({ value: string, previousValue: string, trigger: ${inputTrigger} })`),
      event("change", checkedChange),
    ],
  }),
  "ui-search-result-row": component({ root: "div", slots: ["leading", "title", "meta", "excerpt", "trailing"],
    props: { disabled: prop("boolean", { default: false }), selected: prop("boolean", { default: false }) },
  }),
  "ui-search-shell": component({ root: "div", slots: ["backdrop", "search", "status", "body", "footer"] }),
  "ui-select": component({ root: "span", slots: ["default"],
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value" }),
      disabled: prop("boolean", { default: false }), invalid: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }),
    },
    events: [event("input", valueChange), event("change", valueChange)],
  }),
  "ui-switch": component({ root: "span", slots: ["default"],
    props: {
      checked: prop("boolean"), defaultChecked: prop("boolean", { attribute: "default-checked", default: false }),
      disabled: prop("boolean", { default: false }), required: prop("boolean", { default: false }),
      value: prop("string", { default: "on" }),
    },
    events: [event("change", checkedChange)],
  }),
  "ui-tabs": component({ root: "div", slots: ["default"],
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value", default: "" }),
      orientation: prop("horizontal | vertical", { default: "horizontal" }),
    },
    events: [event("select", `object({ value: string, previousValue: string, trigger: ${inputTrigger} })`)],
  }),
  "ui-textarea": component({ root: "span", slots: ["default"],
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value", default: "" }),
      disabled: prop("boolean", { default: false }), invalid: prop("boolean", { default: false }),
      readOnly: prop("boolean", { attribute: "read-only", default: false }), rows: prop("number", { default: 4 }),
    },
    events: [event("input", valueChange), event("change", valueChange)],
  }),
  "ui-toast-region": component({ root: "div", slots: ["default"],
    props: { open: prop("boolean", { default: true }) },
    events: [
      event("close", overlayChange),
      event("dismiss", `object({ id: string, reason: action, trigger: ${inputTrigger} })`),
    ],
    stateAttributes: { "data-open": "data-state-open" },
  }),
  "ui-tooltip": component({ root: "span", slots: ["default"],
    props: {
      for: prop("string", { default: "" }), open: prop("boolean"),
      defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      placement: prop("string", { default: "top-start" }),
      showDelay: prop("number", { attribute: "show-delay", default: 500 }),
      hideDelay: prop("number", { attribute: "hide-delay", default: 100 }),
      toggleOnClick: prop("boolean", { attribute: "toggle-on-click", default: false }),
    },
    events: [event("open", overlayChange), event("close", overlayChange)],
    stateAttributes: { "data-open": "data-state-open" },
  }),
  "ui-top-bar": component({ root: "div", slots: ["leading", "default", "search", "actions"] }),
  "ui-tree": component({ root: "div", slots: ["default"],
    props: {
      label: prop("string", { default: "Tree" }),
      hoverExpandDelay: prop("number", { attribute: "hover-expand-delay", default: 700 }),
      maxDepth: prop("number", { attribute: "max-depth", default: 0 }),
    },
    events: [
      event("reorder", `object({ sourceId: string, targetId: string, position: before | inside | after, sourceType: string, targetType: string, sourceScope: string, targetScope: string, trigger: ${inputTrigger} })`),
      event("reorder-rejected", `object({ sourceId: string, targetId: string, position: before | inside | after, reason: max-depth, maxDepth: integer, resultingDepth: integer, trigger: ${inputTrigger} })`),
    ],
    dependencies: ["ui-tree-item"],
  }),
  "ui-tree-item": component({ root: "div", slots: ["leading", "default", "actions", "children"],
    props: {
      itemId: prop("string", { attribute: "item-id", default: "" }), label: prop("string", { default: "" }),
      dropDepth: prop("number", { attribute: "drop-depth" }), subtreeDepth: prop("number", { attribute: "subtree-depth" }),
      container: prop("boolean", { default: false }), sortable: prop("boolean", { default: false }),
      dragType: prop("string", { attribute: "drag-type", default: "item" }),
      dropScope: prop("string", { attribute: "drop-scope", default: "" }), accepts: prop("string", { default: "" }),
      expanded: prop("boolean"), defaultExpanded: prop("boolean", { attribute: "default-expanded", default: false }),
      selected: prop("boolean", { default: false }), disabled: prop("boolean", { default: false }),
    },
    events: [event("expand", `object({ id: string, expanded: boolean, trigger: ${inputTrigger} })`)],
  }),
});

export function coreContractFor(tag) {
  const contract = coreContracts[tag];
  if (contract === undefined) throw new Error(`${tag}: missing Looma public contract`);
  return contract;
}
