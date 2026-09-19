// Framework-neutral public contracts for Looma core components.
//
// These declarations are authoritative for the migrated package. The Stencil reader is only a
// source adapter used to recover render structure and to detect drift while the old implementation
// still exists; decorators and Stencil-specific types do not define this model.

const component = ({ props = {}, methods = [], events = [], dependencies = [] } = {}) =>
  Object.freeze({
    props: Object.freeze(props),
    methods: Object.freeze(methods),
    events: Object.freeze(events),
    dependencies: Object.freeze(dependencies),
  });

const prop = (type, options = {}) => Object.freeze({ type, ...options });

export const coreContracts = Object.freeze({
  "ui-affordance-scope": component({
    props: { nearRadius: prop("number", { attribute: "near-radius", default: 16 }) },
  }),
  "ui-avatar": component({
    props: {
      src: prop("string", { default: "" }), alt: prop("string", { default: "" }),
      name: prop("string", { default: "" }), fallback: prop("string", { default: "" }),
    },
  }),
  "ui-avatar-group": component({
    props: { max: prop("number", { default: 5 }), label: prop("string", { default: "People" }) },
  }),
  "ui-badge": component({ props: { variant: prop("string"), tone: prop("string") } }),
  "ui-button": component({
    props: {
      variant: prop("string", { default: "outline" }), size: prop("string"),
      disabled: prop("boolean", { default: false }),
    },
  }),
  "ui-callout": component({ props: { tone: prop("string", { default: "info" }) } }),
  "ui-checkbox": component({
    props: {
      checked: prop("boolean"), defaultChecked: prop("boolean", { attribute: "default-checked", default: false }),
      disabled: prop("boolean", { default: false }), indeterminate: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }), value: prop("string", { default: "on" }),
    },
    events: ["change"],
  }),
  "ui-chip": component({
    props: {
      appearance: prop("string", { default: "tag" }), size: prop("string", { default: "xs" }),
    },
  }),
  "ui-combobox": component({
    props: {
      label: prop("string", { default: "" }), placeholder: prop("string", { default: "" }),
      name: prop("string", { default: "" }), value: prop("string | null | list(unknown)"),
      defaultValue: prop("string", { attribute: "default-value" }),
      multiple: prop("boolean", { default: false }), tokenSeparators: prop("list(string)", { attribute: "token-separators" }),
      query: prop("string"), defaultQuery: prop("string", { attribute: "default-query", default: "" }),
      config: prop("unknown"), disabled: prop("boolean", { default: false }),
      readOnly: prop("boolean", { attribute: "readonly", default: false }), required: prop("boolean", { default: false }),
      size: prop("string", { default: "md" }),
      labelVisibility: prop("string", { attribute: "label-visibility", default: "visible" }),
      disclosure: prop("boolean", { default: false }), clearable: prop("boolean", { default: false }),
      help: prop("string", { default: "" }),
    },
    methods: [
      { name: "validate", returns: "promise(unknown)" },
      { name: "focusInput", returns: "promise(undefined)" },
    ],
    events: [
      "query-change", "value-change", "free-entry", "create-entry", "dependency-invalidate",
      "validation-change", "options-change", "add-item", "remove-item", "create-item",
    ],
    dependencies: ["ui-chip", "ui-tooltip"],
  }),
  "ui-context-menu": component({
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      for: prop("string"),
    },
    events: ["open", "close", "select"],
    dependencies: ["ui-menu"],
  }),
  "ui-dialog": component({
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      modal: prop("boolean", { default: true }), dismissible: prop("boolean", { default: true }),
      label: prop("string"),
    },
    events: ["close"],
  }),
  "ui-disclosure": component({
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      disabled: prop("boolean", { default: false }),
    },
    events: ["open", "close"],
  }),
  "ui-editable": component({
    props: {
      edit: prop("boolean"), defaultEdit: prop("boolean", { attribute: "default-edit", default: false }),
      disabled: prop("boolean", { default: false }),
    },
    events: ["edit-change"],
  }),
  "ui-floating-action-button": component({
    props: {
      disabled: prop("boolean", { default: false }),
      mobileOnly: prop("boolean", { attribute: "mobile-only", default: false }),
      label: prop("string", { default: "" }),
    },
  }),
  "ui-form-field": component({
    props: {
      invalid: prop("boolean", { default: false }), disabled: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }),
    },
  }),
  "ui-icon-button": component({
    props: {
      disabled: prop("boolean", { default: false }), label: prop("string", { default: "" }),
      size: prop("string", { default: "md" }), variant: prop("string", { default: "ghost" }),
      anticipatory: prop("boolean", { default: false }),
    },
  }),
  "ui-input": component({
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value", default: "" }),
      disabled: prop("boolean", { default: false }), invalid: prop("boolean", { default: false }),
      readOnly: prop("boolean", { attribute: "readonly", default: false }),
    },
    events: ["input", "change"],
  }),
  "ui-menu": component({
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      for: prop("string"), placement: prop("string", { default: "bottom-start" }),
    },
    events: ["select", "close"],
  }),
  "ui-menu-item": component({
    props: { disabled: prop("boolean", { default: false }), value: prop("string", { default: "" }) },
  }),
  "ui-popover": component({
    props: {
      open: prop("boolean"), defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      for: prop("string"), placement: prop("string", { default: "bottom-start" }),
    },
    events: ["open", "close"],
  }),
  "ui-radio": component({
    props: {
      checked: prop("boolean"), defaultChecked: prop("boolean", { attribute: "default-checked", default: false }),
      disabled: prop("boolean", { default: false }), name: prop("string", { default: "" }),
      required: prop("boolean", { default: false }), value: prop("string", { default: "on" }),
    },
    events: ["change"],
  }),
  "ui-radio-group": component({
    props: {
      value: prop("string", { default: "" }), name: prop("string", { default: "" }),
      orientation: prop("string", { default: "horizontal" }), disabled: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }),
    },
    events: ["select", "change"],
  }),
  "ui-search-result-row": component({
    props: { disabled: prop("boolean", { default: false }), selected: prop("boolean", { default: false }) },
  }),
  "ui-search-shell": component(),
  "ui-select": component({
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value" }),
      disabled: prop("boolean", { default: false }), invalid: prop("boolean", { default: false }),
      required: prop("boolean", { default: false }),
    },
    events: ["input", "change"],
  }),
  "ui-switch": component({
    props: {
      checked: prop("boolean"), defaultChecked: prop("boolean", { attribute: "default-checked", default: false }),
      disabled: prop("boolean", { default: false }), required: prop("boolean", { default: false }),
      value: prop("string", { default: "on" }),
    },
    events: ["change"],
  }),
  "ui-tabs": component({
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value", default: "" }),
      orientation: prop("string", { default: "horizontal" }),
    },
    events: ["select"],
  }),
  "ui-textarea": component({
    props: {
      value: prop("string"), defaultValue: prop("string", { attribute: "default-value", default: "" }),
      disabled: prop("boolean", { default: false }), invalid: prop("boolean", { default: false }),
      readOnly: prop("boolean", { attribute: "readonly", default: false }), rows: prop("number", { default: 4 }),
    },
    events: ["input", "change"],
  }),
  "ui-toast-region": component({
    props: { open: prop("boolean", { default: true }) },
    events: ["close", "dismiss"],
  }),
  "ui-tooltip": component({
    props: {
      for: prop("string", { default: "" }), open: prop("boolean"),
      defaultOpen: prop("boolean", { attribute: "default-open", default: false }),
      placement: prop("string", { default: "top-start" }),
      showDelay: prop("number", { attribute: "show-delay", default: 500 }),
      hideDelay: prop("number", { attribute: "hide-delay", default: 100 }),
      toggleOnClick: prop("boolean", { attribute: "toggle-on-click", default: false }),
    },
    events: ["open", "close"],
  }),
  "ui-top-bar": component(),
  "ui-tree": component({
    props: {
      label: prop("string", { default: "Tree" }),
      hoverExpandDelay: prop("number", { attribute: "hover-expand-delay", default: 700 }),
      maxDepth: prop("number", { attribute: "max-depth", default: 0 }),
    },
    events: ["reorder", "reorder-rejected"],
    dependencies: ["ui-tree-item"],
  }),
  "ui-tree-item": component({
    props: {
      itemId: prop("string", { attribute: "item-id", default: "" }), label: prop("string", { default: "" }),
      dropDepth: prop("number", { attribute: "drop-depth" }), subtreeDepth: prop("number", { attribute: "subtree-depth" }),
      container: prop("boolean", { default: false }), sortable: prop("boolean", { default: false }),
      dragType: prop("string", { attribute: "drag-type", default: "item" }),
      dropScope: prop("string", { attribute: "drop-scope", default: "" }), accepts: prop("string", { default: "" }),
      expanded: prop("boolean"), defaultExpanded: prop("boolean", { attribute: "default-expanded", default: false }),
      selected: prop("boolean", { default: false }), disabled: prop("boolean", { default: false }),
    },
    events: ["expand"],
  }),
});

export function coreContractFor(tag) {
  const contract = coreContracts[tag];
  if (contract === undefined) throw new Error(`${tag}: missing Looma public contract`);
  return contract;
}
