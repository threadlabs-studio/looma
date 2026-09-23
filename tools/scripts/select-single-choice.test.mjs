import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Multi-select is the combobox's job. A native <select multiple> is a scrolling list that hides
 * what is chosen and takes a modifier key to choose it; ui-select stays the single-choice control.
 */
test("ui-select offers no multiple, and steers multi-select to the combobox", async () => {
  const select = await readFile(
    path.join(repoRoot, "packages/looma/src/components/ui-select/ui-select.html"),
    "utf8"
  );
  assert.doesNotMatch(select, /name="multiple"/);
  assert.doesNotMatch(select, /:multiple=/);
  assert.doesNotMatch(select, /\[multiple\]/);

  const combobox = await readFile(
    path.join(repoRoot, "packages/looma/src/components/ui-combobox/ui-combobox.html"),
    "utf8"
  );
  assert.match(combobox, /name="multiple"/);
  // The checkbox on every row is what makes a multiple combobox read as multiple.
  assert.match(combobox, /:host-state\(\[multiple\]\) \.option::before/);
});
