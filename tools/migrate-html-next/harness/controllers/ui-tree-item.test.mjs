import assert from "node:assert/strict";
import { test } from "node:test";

import controller from "./ui-tree-item.js";

test("controller applies initial container and expansion state", () => {
  const children = { hidden: false };
  const listeners = new Map();
  const rowListeners = new Map();
  const disclosure = {
    disabled: false,
    title: "",
    setAttribute() {},
    querySelector() { return null; },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const row = {
    addEventListener(name, listener) { rowListeners.set(name, listener); },
    removeEventListener(name) { rowListeners.delete(name); },
  };
  const attributes = new Map();
  const element = {
    dataset: {},
    style: { marginInlineStart: "", setProperty() {} },
    parentElement: null,
    querySelector(selector) {
      if (selector === '[part="children"]') return children;
      if (selector === '[part="disclosure"]') return disclosure;
      if (selector === '[part="row"]') return row;
      return null;
    },
    closest() { return null; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    toggleAttribute(name, force) { if (force) attributes.set(name, ""); else attributes.delete(name); },
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
  };
  const state = {
    container: true,
    expanded: undefined,
    defaultExpanded: false,
    selected: true,
    disabled: false,
  };
  const host = {
    element,
    state,
    effect(run) { run(); return () => {}; },
    dispatch(name, detail) { this.dispatched = { name, detail }; },
  };

  const disconnect = controller(host);
  assert.equal(children.hidden, true);
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.equal(state.container, true);
  assert.equal(state.selected, true);

  listeners.get("click")({ type: "click", stopPropagation() {} });
  assert.equal(children.hidden, false);
  assert.equal(attributes.get("aria-expanded"), "true");
  assert.deepEqual(host.dispatched, {
    name: "expand",
    detail: { id: "", expanded: true, trigger: "pointer" },
  });

  disconnect();
  assert.equal(listeners.has("click"), false);
});
