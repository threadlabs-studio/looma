import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentRoots = [path.join(repoRoot, "packages/looma/src/components")];

test("components never redeclare public --ui-* tokens", async () => {
  const violations = [];
  for (const root of componentRoots) {
    const tags = (await readdir(root)).filter((name) => name.startsWith("ui-"));
    for (const tag of tags) {
      const file = `${tag}.html`;
      const source = await readFile(path.join(root, tag, file), "utf8");
      const css = source.slice(source.indexOf("<style>"));
      for (const [, token] of css.matchAll(/(--ui-[\w-]+)\s*:/g)) {
        violations.push(`${file}: ${token}`);
      }
    }
  }
  // A public declaration on a component would shadow root and ancestor settings. Defaults belong
  // in private variables or var() fallbacks, below the consumer's public hooks.
  assert.deepEqual(violations, []);
});

// Controllers publish measured geometry and interaction state through private properties;
// assigning a public hook here would shadow an application's inherited setting.
test("controllers keep runtime CSS values private", async () => {
  const violations = [];
  for (const root of componentRoots) {
    for (const tag of (await readdir(root)).filter(name => name.startsWith("ui-"))) {
      const file = `${tag}.js`;
      let source;
      try { source = await readFile(path.join(root, tag, file), "utf8"); }
      catch (error) { if (error.code === "ENOENT") continue; throw error; }
      for (const [, token] of source.matchAll(/setProperty\(\s*["'](--ui-[\w-]+)["']/g)) violations.push(`${file}: ${token}`);
    }
  }
  assert.deepEqual(violations, []);
});
