import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Every committed reference image stays in git history forever, so every clone pays for each revision.
// Layout references and compact state sheets share this limit. Full state coverage replaces
// the old gallery; tighter crops and packing avoid capturing a page shell for every state.
const budgetMB = 100;

function megabytes(directory) {
  return readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(".png"))
    .reduce((total, file) => total + statSync(path.join(directory, file)).size, 0) / 1e6;
}

test("visual reference images stay within their size budget", () => {
  const total = megabytes(path.join(root, "apps/docs/tests/baselines")) + megabytes(path.join(root, "apps/storybook/tests/baselines"));
  assert.ok(total <= budgetMB, `Visual references total ${total.toFixed(1)} MB, over the ${budgetMB} MB budget`);
});
