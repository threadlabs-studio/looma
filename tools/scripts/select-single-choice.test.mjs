import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * ui-select stays the compact single-choice control. Combobox and Listbox show checkmarks for
 * multiple choices without relying on a native <select multiple> and its modifier-key behavior.
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
  const listbox = await readFile(path.join(repoRoot, "packages/looma/src/components/ui-listbox/ui-listbox.html"), "utf8");
  const tokens = await readFile(path.join(repoRoot, "packages/looma/src/tokens/tokens.css"), "utf8");
  assert.match(combobox, /data-ui-choice-option/);
  assert.match(listbox, /data-ui-choice-option/);
  assert.match(tokens, /\[data-ui-choice-option\]\[data-multiple\]::before/);
});
