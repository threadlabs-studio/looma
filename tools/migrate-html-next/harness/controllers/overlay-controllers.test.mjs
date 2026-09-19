import assert from "node:assert/strict";
import { test } from "node:test";

import contextMenuController from "./ui-context-menu.js";
import dialogController from "./ui-dialog.js";
import menuController from "./ui-menu.js";
import tooltipController from "./ui-tooltip.js";

function overlayElement() {
  let open = false;
  const attributes = new Map();
  const documentElement = {
    style: { overflow: "", removeProperty() {} },
    toggleAttribute() {},
  };
  const ownerDocument = {
    documentElement,
    defaultView: {
      innerWidth: 1000,
      innerHeight: 700,
      CSS: { supports: () => false },
      requestAnimationFrame(callback) { callback(); return 1; },
      cancelAnimationFrame() {},
      addEventListener() {},
      removeEventListener() {},
    },
    getElementById() { return null; },
    addEventListener() {},
    removeEventListener() {},
  };
  return {
    attributes,
    dataset: {},
    ownerDocument,
    hidden: false,
    style: { setProperty() {}, removeProperty() {} },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
    toggleAttribute(name, force) { if (force) attributes.set(name, ""); else attributes.delete(name); },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    contains() { return false; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 }; },
    matches(selector) { return selector === ":popover-open" && open; },
    showPopover() { open = true; },
    hidePopover() { open = false; },
    get open() { return open; },
  };
}

function host(element, state) {
  return {
    element,
    state,
    effect(run) { run(); return () => {}; },
    dispatch() {},
  };
}

test("menu and tooltip controllers apply their initial open state", () => {
  const menu = overlayElement();
  const menuState = { open: true, defaultOpen: false, internalOpen: false };
  menuController(host(menu, menuState));
  assert.equal(menuState.internalOpen, true);

  const tooltip = overlayElement();
  tooltipController(host(tooltip, { open: true, defaultOpen: false, internalOpen: false }));
  assert.equal(tooltip.open, true);
  assert.equal(tooltip.attributes.get("popover"), "manual");
});

test("context menu opens its generated surface", () => {
  const previousMutationObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
  const surface = overlayElement();
  const nested = {
    open: false,
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
    toggleAttribute(name, force) { if (force) this[name] = ""; else delete this[name]; },
    matches(selector) { return selector === ":popover-open" && this.open; },
    showPopover() { this.open = true; },
    hidePopover() { this.open = false; },
  };
  surface.querySelector = () => nested;
  const element = {
    ...overlayElement(),
    querySelector(selector) { return selector === ".menu" ? surface : null; },
  };
  try {
    const state = { open: true, defaultOpen: false, internalOpen: false, focusTrigger: "programmatic" };
    contextMenuController(host(element, state));
    assert.equal(state.internalOpen, true);
    assert.equal(surface.open, true);
    assert.equal(nested.open, true);
  } finally {
    globalThis.MutationObserver = previousMutationObserver;
  }
});

test("dialog controller infers its label and opens the native dialog", () => {
  const previousMutationObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
  };
  let listener;
  const dialog = {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
    setAttribute() {},
    addEventListener(_name, next) { listener = next; },
    removeEventListener() { listener = undefined; },
  };
  const heading = { textContent: "Delete page" };
  const surface = overlayElement();
  const element = {
    ...surface,
    querySelector(selector) { return selector === "dialog" ? dialog : heading; },
  };
  try {
    const state = { open: true, defaultOpen: false, internalOpen: false, accessibleLabel: "" };
    const cleanup = dialogController(host(element, state));
    assert.equal(state.accessibleLabel, "Delete page");
    assert.equal(dialog.open, true);
    assert.equal(typeof listener, "function");
    cleanup();
  } finally {
    globalThis.MutationObserver = previousMutationObserver;
  }
});
