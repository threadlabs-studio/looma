import assert from "node:assert/strict";
import test from "node:test";
import { overlayDismissalTarget } from "../../packages/looma/src/components/shared/overlay-dismissal.js";

test("dismissal never falls through a blocking or nondismissible top overlay", () => {
  const dialog = { dismissible: true };
  const blocking = { dismissible: false };
  assert.equal(overlayDismissalTarget([], "escape"), undefined);
  assert.equal(overlayDismissalTarget([dialog, blocking], "escape"), undefined);
  assert.equal(overlayDismissalTarget([dialog, blocking], "light-dismiss"), undefined);
  assert.equal(overlayDismissalTarget([dialog, blocking], "action"), blocking);
  assert.equal(overlayDismissalTarget([dialog, { canClose: () => false }], "escape"), undefined);
  assert.equal(overlayDismissalTarget([dialog], "escape"), dialog);
});
