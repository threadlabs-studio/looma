import assert from "node:assert/strict";
import test from "node:test";

import { layoutContracts } from "./layout-contracts.mjs";

test("layout contracts own all nine public primitives", () => {
  assert.deepEqual(Object.keys(layoutContracts), [
    "ui-stack", "ui-inline", "ui-cluster", "ui-grid", "ui-center", "ui-switcher",
    "ui-sidebar", "ui-reel", "ui-separator",
  ]);
  for (const contract of Object.values(layoutContracts)) {
    assert.equal(contract.root, "div");
    assert.deepEqual(contract.slots, ["default"]);
  }
});

test("layout contracts express behavior without custom-element vocabulary", () => {
  const serialized = JSON.stringify(layoutContracts);
  assert.doesNotMatch(serialized, /customElements|HTMLElement|observedAttributes/);
  assert.equal(layoutContracts["ui-sidebar"].props.storageKey.attribute, "storage-key");
  assert.equal(layoutContracts["ui-sidebar"].events[0].name, "resize");
});
