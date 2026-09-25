import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentRoots = [path.join(repoRoot, "packages/looma/src/components")];
// State a component publishes to its descendants, not a consumer setting.
const publishedState = new Set(["--ui-affordance-scope-engaged", "--ui-affordance-scope-guide"]);

test("components never redeclare public --ui-* tokens", async () => {
  const violations = [];
  for (const root of componentRoots) {
    const tags = (await readdir(root)).filter((name) => name.startsWith("ui-"));
    for (const tag of tags) {
      const file = `${tag}.html`;
      const source = await readFile(path.join(root, tag, file), "utf8");
      const css = source.slice(source.indexOf("<style>"));
      for (const [, token] of css.matchAll(/(--ui-[\w-]+)\s*:/g)) {
        if (!publishedState.has(token)) violations.push(`${file}: ${token}`);
      }
    }
  }
  // A declaration on a component shadows the value a consumer sets on it. Keep defaults in private
  // --_* variables and read tokens as var(--ui-x, var(--_x)). Hooks do not inherit, so setting
  // another component's hook reaches nothing: a parent that configures the children it renders sets
  // their --_ui-default-* variables, which the child reads below its own hooks.
  assert.deepEqual(violations, []);
});
