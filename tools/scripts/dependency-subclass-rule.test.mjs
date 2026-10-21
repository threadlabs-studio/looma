import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sources = ["packages/looma/src/editor", "packages/looma/src/vue"].map((directory) => path.join(repoRoot, directory));

async function files(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await files(file));
    else if (/\.[cm]?[jt]s$/.test(entry.name)) found.push(file);
  }
  return found;
}

/** Names each `class … extends Base` whose base is imported from a package rather than a local module. */
export function dependencySubclasses(source) {
  const imported = new Set();
  for (const [, names, specifier] of source.matchAll(/import\s+(?!type\b)([^;]+?)\s+from\s+["']([^"']+)["']/g)) {
    if (specifier.startsWith(".")) continue;
    for (const name of names.replace(/[{}]/g, ",").split(",")) {
      const local = name.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop();
      if (local) imported.add(local);
    }
  }
  return [...source.matchAll(/\bclass\s+(\w+)\s+extends\s+(\w+)/g)].filter(([, , base]) => imported.has(base)).map(([, name, base]) => `${name} extends ${base}`);
}

// Docusaurus, and any consumer whose bundler targets older browsers, lowers our classes to functions
// that call their base as `Base.apply(this, arguments)`. A dependency's class stays a native class, which
// throws "Class constructor cannot be invoked without 'new'". Compose a dependency's class instead.
test("editor code subclasses no class from a dependency", async () => {
  const problems = [];
  for (const directory of sources) {
    for (const file of await files(directory)) {
      for (const subclass of dependencySubclasses(await readFile(file, "utf8"))) problems.push(`${path.relative(repoRoot, file)}: ${subclass}`);
    }
  }
  assert.deepEqual(problems, []);
});

test("the subclass rule finds a dependency base and allows local and built-in ones", () => {
  assert.deepEqual(dependencySubclasses('import { DOMSerializer, type Schema } from "@tiptap/pm/model";\nclass A extends DOMSerializer {}'), ["A extends DOMSerializer"]);
  assert.deepEqual(dependencySubclasses('import TableBase, { TableView as View } from "@tiptap/extension-table";\nclass B extends View {}'), ["B extends View"]);
  assert.deepEqual(dependencySubclasses('import { Base } from "./base";\nclass C extends Base {}\nclass D extends Error {}'), []);
});
