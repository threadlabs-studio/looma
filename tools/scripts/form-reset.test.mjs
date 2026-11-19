import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as wait } from "node:timers/promises";
import { afterFormReset } from "../../packages/looma/src/components/shared/form-reset.js";

test("form reset reconciles accepted events after dispatch and cancels pending work on disconnect", async () => {
  const document = new EventTarget();
  const control = { ownerDocument: document, getRootNode: () => document, form: document };
  let calls = 0;
  const stop = afterFormReset(control, () => { calls += 1; });
  document.dispatchEvent(new Event("reset"));
  document.addEventListener("reset", event => event.preventDefault(), { once: true });
  document.dispatchEvent(new Event("reset", { cancelable: true }));
  assert.equal(calls, 0);
  await wait(0);
  assert.equal(calls, 1);

  document.dispatchEvent(new Event("reset"));
  document.dispatchEvent(new Event("reset"));
  stop();
  document.dispatchEvent(new Event("reset"));
  await wait(0);
  assert.equal(calls, 1);
});

test("listens inside the control's tree rather than its owner document", async () => {
  const ownerDocument = new EventTarget();
  const shadowRoot = Object.assign(new EventTarget(), { host: {} });
  const control = { ownerDocument, getRootNode: () => shadowRoot, form: shadowRoot };
  let calls = 0;
  const stop = afterFormReset(control, () => { calls += 1; });
  try {
    shadowRoot.dispatchEvent(new Event("reset"));
    await wait(0);
    assert.equal(calls, 1);
  } finally {
    stop();
  }
});
