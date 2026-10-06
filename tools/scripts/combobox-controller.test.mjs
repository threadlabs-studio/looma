import assert from "node:assert/strict";
import test from "node:test";

import * as comboboxController from "../../packages/looma/src/components/ui-combobox/ui-combobox.js";

test("combobox controller exposes only its instance initializer", () => {
  assert.deepEqual(Object.keys(comboboxController), ["default"]);
});

test("validation command keeps existing results and reconnect cleanup", () => {
  const observer = globalThis.MutationObserver;
  globalThis.MutationObserver = class { observe() {} disconnect() {} };
  try {
    const document = new EventTarget();
    document.defaultView = new EventTarget();
    const element = new EventTarget();
    element.ownerDocument = document;
    const input = { ownerDocument: document, value: "", removeAttribute() {}, setAttribute() {} };
    const popup = { ownerDocument: document, style: {}, setAttribute() {}, matches: () => false };
    const hooks = [];
    const reports = [];
    const values = { required: true, value: null, query: null, filter: "label" };
    const host = {
      element, refs: { input, popup, field: {}, options: { querySelectorAll: () => [] } },
      props: new Proxy({}, { get: (_, name) => ({ value: values[name] }) }),
      state: { rows: [], expanded: false, raw: "", display: "", internalItems: [] },
      dispatch: (name, detail) => reports.push({ name, detail }),
      effect: (fn) => { fn(); return () => {}; },
      on: (name, callback) => { assert.equal(name, "connect"); hooks.push(callback); return () => {}; },
    };
    assert.equal(comboboxController.default(host), undefined);
    const request = new Event("command");
    Object.assign(request, { command: "--validate" });
    const check = () => {
      reports.length = 0;
      for (const event of [request, new Event("validate")]) {
        reports.length = 0;
        element.dispatchEvent(event);
        assert.deepEqual(reports.map(({ detail }) => detail.status), ["pending", "error"]);
        assert.deepEqual(reports[1].detail.issues, [{ message: "A value is required." }]);
        assert.equal(reports[1].detail.output, undefined);
      }
    };
    const stop = hooks[0]();
    try { check(); } finally { stop(); }
    reports.length = 0;
    element.dispatchEvent(request);
    element.dispatchEvent(new Event("validate"));
    assert.equal(reports.length, 0, "disconnect removes the validation listener");
    const reconnectStop = hooks[0]();
    try {
      check();
      values.allowFreeText = true;
      host.state.raw = "Allowed text";
      reports.length = 0;
      element.dispatchEvent(request);
      assert.deepEqual(reports.map(({ detail }) => detail.status), ["pending", "valid"]);
      assert.equal(reports[1].detail.output, "Allowed text");
    } finally { reconnectStop(); }
  } finally { globalThis.MutationObserver = observer; }
});
