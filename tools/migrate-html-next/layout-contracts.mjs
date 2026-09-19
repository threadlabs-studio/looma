// Framework-neutral public contracts for Looma's layout primitives.
// The former custom-element classes are a legacy implementation, not the API source.

const prop = (type, options = {}) => Object.freeze({ type, ...options });
const component = ({ props = {}, events = [] } = {}) => Object.freeze({
  root: "div",
  slots: Object.freeze(["default"]),
  props: Object.freeze(props),
  events: Object.freeze(events),
  methods: Object.freeze([]),
  dependencies: Object.freeze([]),
  stateAttributes: Object.freeze({}),
});

const gap = prop("xs | s | m | l | xl");
const align = prop("start | center | end | stretch");
const justify = prop("start | center | end | between");

export const layoutContracts = Object.freeze({
  "ui-stack": component({ props: { gap, align, justify } }),
  "ui-inline": component({ props: { gap, align, justify, wrap: prop("wrap | nowrap") } }),
  "ui-cluster": component({ props: { gap, align, justify } }),
  "ui-grid": component({ props: { gap, min: prop("sm | md | lg") } }),
  "ui-center": component({
    props: { measure: prop("narrow | wide"), gutters: prop("s | m | l") },
  }),
  "ui-switcher": component({
    props: { gap, threshold: prop("xs | sm | md | lg"), align },
  }),
  "ui-sidebar": component({
    props: {
      gap,
      side: prop("start | end", { default: "start" }),
      width: prop("narrow | default | wide", { default: "default" }),
      align,
      resizable: prop("boolean", { default: false }),
      storageKey: prop("string", { attribute: "storage-key" }),
      minWidth: prop("number", { attribute: "min-width", default: 176 }),
      maxWidth: prop("number", { attribute: "max-width", default: 480 }),
      resizeStep: prop("number", { attribute: "resize-step", default: 16 }),
      resizeLabel: prop("string", { attribute: "resize-label", default: "Resize sidebar" }),
    },
    events: [Object.freeze({
      name: "resize",
      type: "object({ width: number, trigger: keyboard | pointer | programmatic })",
    })],
  }),
  "ui-reel": component({
    props: { gap, itemWidth: prop("sm | md | lg", { attribute: "item-width" }), snap: prop("start | center") },
  }),
  "ui-separator": component({
    props: { orientation: prop("horizontal | vertical", { default: "horizontal" }) },
  }),
});

export function layoutContractFor(tag) {
  const contract = layoutContracts[tag];
  if (contract === undefined) throw new Error(`${tag}: missing Looma layout contract`);
  return contract;
}
