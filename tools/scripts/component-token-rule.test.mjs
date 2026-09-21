import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentDirectories = ["core", "layout", "editor"].map((name) =>
  path.join(repoRoot, "packages", name, "src/declarative/components"));
// State a component publishes to its descendants, not a consumer setting.
const publishedState = new Set(["--ui-affordance-scope-engaged"]);

test("components never redeclare public --ui-* tokens", async () => {
  const violations = [];
  for (const directory of componentDirectories) {
    for (const file of (await readdir(directory)).filter((name) => name.endsWith(".html"))) {
      const source = await readFile(path.join(directory, file), "utf8");
      const css = source.slice(source.indexOf("<style>"));
      for (const [, token] of css.matchAll(/(--ui-[\w-]+)\s*:/g)) {
        if (!publishedState.has(token)) violations.push(`${file}: ${token}`);
      }
    }
  }
  // A declaration on a component shadows the value a consumer sets on an ancestor. Keep defaults in
  // private --_* variables and read tokens as var(--ui-x, var(--_x)).
  assert.deepEqual(violations, []);
});
