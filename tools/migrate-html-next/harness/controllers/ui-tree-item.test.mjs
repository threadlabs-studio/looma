import assert from "node:assert/strict";
import { test } from "node:test";

import controller from "./ui-tree-item.js";

test("controller applies initial container and expansion state", () => {
  const children = { hidden: false };
  const listeners = new Map();
  const disclosure = {
    disabled: false,
    setAttribute() {},
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const attributes = new Map();
  const element = {
    querySelector(selector) {
      return selector === ".children" ? children : disclosure;
    },
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
  assert.equal(attributes.get("data-container"), "");
  assert.equal(attributes.get("aria-expanded"), "false");
  assert.equal(attributes.get("data-selected"), "");

  listeners.get("click")({ stopPropagation() {} });
  assert.equal(children.hidden, false);
  assert.equal(attributes.get("aria-expanded"), "true");
  assert.deepEqual(host.dispatched, {
    name: "expand",
    detail: { id: "", expanded: true, trigger: "pointer" },
  });

  disconnect();
  assert.equal(listeners.has("click"), false);
});
