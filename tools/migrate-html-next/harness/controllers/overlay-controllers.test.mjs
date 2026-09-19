import assert from "node:assert/strict";
import { test } from "node:test";

import contextMenuController from "./ui-context-menu.js";
import dialogController from "./ui-dialog.js";
import menuController from "./ui-menu.js";
import tooltipController from "./ui-tooltip.js";

function overlayElement() {
  let open = false;
  const attributes = new Map();
  return {
    attributes,
    setAttribute(name, value) { attributes.set(name, value); },
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

test("menu and tooltip controllers open their initial popover state", () => {
  for (const controller of [menuController, tooltipController]) {
    const element = overlayElement();
    controller(host(element, { open: true, defaultOpen: false, internalOpen: false }));
    assert.equal(element.open, true);
    assert.equal(element.attributes.get("popover"), "manual");
  }
});

test("context menu opens its generated surface", () => {
  const surface = overlayElement();
  const nested = {
    open: false,
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; },
  };
  surface.querySelector = () => nested;
  const element = { querySelector() { return surface; } };
  const state = { open: true, defaultOpen: false, internalOpen: false };
  contextMenuController(host(element, state));
  assert.equal(state.internalOpen, true);
  assert.equal(surface.open, true);
  assert.equal(nested.open, true);
  assert.equal(nested["data-open"], "true");
});

test("dialog controller infers its label and opens the native dialog", () => {
  let listener;
  const dialog = {
    open: false,
    showModal() { this.open = true; },
    close() { this.open = false; },
    addEventListener(_name, next) { listener = next; },
    removeEventListener() { listener = undefined; },
  };
  const heading = { textContent: "Delete page" };
  const element = { querySelector(selector) { return selector === "dialog" ? dialog : heading; } };
  const state = { open: true, defaultOpen: false, internalOpen: false, accessibleLabel: "" };
  const cleanup = dialogController(host(element, state));
  assert.equal(state.accessibleLabel, "Delete page");
  assert.equal(dialog.open, true);
  assert.equal(typeof listener, "function");
  cleanup();
});
