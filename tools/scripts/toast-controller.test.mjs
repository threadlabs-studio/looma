import assert from "node:assert/strict";
import test from "node:test";

import * as toastController from "../../packages/looma/src/components/ui-toast-region/ui-toast-region.js";

test("toast controller exposes named per-connection activation", () => {
  assert.deepEqual(Object.keys(toastController), ["connect"]);
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
    const host = {
      element, props: { duration: { value: 0 } }, state: { toasts: [] },
      dispatch() {}, effect: (fn) => { fn(); return () => {}; },
    };
    const command = new Event("command");
    Object.assign(command, { command: "--show-toast", source: { value: "From a button" } });
    const request = new CustomEvent("show-toast", {
      detail: { message: "Saved", id: "saved", tone: "success", duration: 0 },
    });
    element.dispatchEvent(request);
    assert.equal(host.state.toasts.length, 0, "disconnected requests do not create messages");
    const stop = toastController.connect(host);
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
    const reconnectStop = toastController.connect(host);
    try {
      element.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Again", id: "again", tone: "danger" } }));
      assert.equal(host.state.toasts.length, 3, "reconnect attaches one request listener");
      assert.equal(host.state.toasts[2].role, "alert");
    } finally { reconnectStop(); }
  } finally { globalThis.MutationObserver = observer; }
});
