import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// Every committed reference image stays in git history forever, so every clone pays for each revision.
// Raising this needs a reason; prefer smaller captures (one example, no full pages, no shared shell).
const budgetMB = 75;

function megabytes(directory) {
  return readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(".png"))
    .reduce((total, file) => total + statSync(path.join(directory, file)).size, 0) / 1e6;
}

test("visual reference images stay within their size budget", () => {
  const total = megabytes(path.join(root, "apps/docs/tests/baselines")) + megabytes(path.join(root, "apps/storybook/.storywright/accepted"));
  assert.ok(total <= budgetMB, `Visual references total ${total.toFixed(1)} MB, over the ${budgetMB} MB budget`);
});
