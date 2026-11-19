import assert from "node:assert/strict";
import test from "node:test";
import { deferredFocus } from "../../packages/looma/src/components/shared/deferred-focus.js";

test("only the latest focus request runs and teardown cancels pending work", () => {
  const frames = new Map();
  let next = 0;
  const view = {
    requestAnimationFrame(callback) { frames.set(++next, callback); return next; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const focus = deferredFocus(view);
  const seen = [];
  focus.schedule(() => seen.push("first"));
  focus.schedule(() => seen.push("latest"));
  for (const callback of frames.values()) callback();
  assert.deepEqual(seen, ["latest"]);
  frames.clear();
  focus.schedule(() => seen.push("disconnected"));
  focus.cancel();
  assert.equal(frames.size, 0);
});
