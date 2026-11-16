import assert from "node:assert/strict";
import test from "node:test";
import { enabledOptionIndices, nextActiveIndex } from "../../packages/looma/src/components/shared/collection-navigation.js";

test("option navigation skips disabled rows and handles an empty collection", () => {
  const indices = enabledOptionIndices([{ disabled: true }, {}, { disabled: true }, {}]);
  assert.deepEqual(indices, [1, 3]);
  assert.equal(nextActiveIndex(indices, -1, "ArrowDown"), 1);
  assert.equal(nextActiveIndex(indices, -1, "ArrowUp"), 3);
  assert.equal(nextActiveIndex(indices, 1, "ArrowDown"), 3);
  assert.equal(nextActiveIndex(indices, 3, "Home"), 1);
  assert.equal(nextActiveIndex(indices, 1, "End"), 3);
  assert.equal(nextActiveIndex([], -1, "ArrowDown"), -1);
});

test("listbox wraps while combobox clamps to the collection edges", () => {
  const indices = [1, 3, 4];
  assert.equal(nextActiveIndex(indices, 4, "ArrowDown", { wrap: true }), 1);
  assert.equal(nextActiveIndex(indices, 1, "ArrowUp", { wrap: true }), 4);
  assert.equal(nextActiveIndex(indices, 4, "ArrowDown"), 4);
  assert.equal(nextActiveIndex(indices, 1, "ArrowUp"), 1);
});
