import assert from "node:assert/strict";
import test from "node:test";

import * as toastController from "../../packages/looma/src/components/ui-toast-region/ui-toast-region.js";

test("toast controller exposes only its instance initializer", () => {
  assert.deepEqual(Object.keys(toastController), ["default"]);
});

test("toast requests preserve message options and clean up across reconnects", () => {
  const observer = globalThis.MutationObserver;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  try {
    const element = new EventTarget();
    Object.assign(element, {
      ownerDocument: new EventTarget(), children: [], matches: () => false,
      showPopover() {}, hidePopover() {},
    });
    element.ownerDocument.getElementById = () => null;
    const hooks = [];
    const host = {
      element, props: { duration: { value: 0 } }, state: { toasts: [] },
      dispatch() {}, effect: (fn) => { fn(); return () => {}; },
      on: (name, callback) => { assert.equal(name, "connect"); hooks.push(callback); return () => {}; },
    };
    assert.equal(toastController.default(host), undefined);
    const command = new Event("command");
    Object.assign(command, { command: "--show-toast", source: { value: "From a button" } });
    const request = new CustomEvent("show-toast", {
      detail: { message: "Saved", id: "saved", tone: "success", duration: 0 },
    });
    element.dispatchEvent(request);
    assert.equal(host.state.toasts.length, 0, "disconnected requests do not create messages");
    const stop = hooks[0]();
    try {
      element.dispatchEvent(command);
      element.dispatchEvent(request);
      assert.equal(host.state.toasts.length, 2);
      assert.equal(host.state.toasts[0].message, "From a button");
      assert.deepEqual(host.state.toasts[1], { id: "saved", message: "Saved", tone: "success", role: "status", closing: false });
    } finally { stop(); }
    element.dispatchEvent(command);
    element.dispatchEvent(request);
    assert.equal(host.state.toasts.length, 2, "disconnect releases both command listeners");
    const reconnectStop = hooks[0]();
    try {
      element.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Again", id: "again", tone: "danger" } }));
      assert.equal(host.state.toasts.length, 3, "reconnect attaches one request listener");
      assert.equal(host.state.toasts[2].role, "alert");
    } finally { reconnectStop(); }
  } finally { globalThis.MutationObserver = observer; }
});
