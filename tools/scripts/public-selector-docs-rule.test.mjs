import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// What Looma tells people to write must use its API: props, slots, events, and hooks set through a
// class of their own. A runtime marker on a component's root (data-component, its state attributes)
// is how a runtime draws it: an implementation detail that differs by target and can change (the
// html-next spec says so), not API, so a selector on one breaks when it does. Docs, examples,
// READMEs, and the changelog never show one.
const MARKER_SELECTOR = /\[data-component\b|\[data-ui-[a-z-]+-state\b/;

async function files(directory, pattern) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(entryPath, pattern));
    else if (pattern.test(entry.name)) result.push(entryPath);
  }
  return result;
}

test("docs, examples, and the changelog never select a runtime marker", async () => {
  const sources = [
    ...await files(path.join(repoRoot, "apps/docs/docs"), /\.mdx?$/),
    ...await files(path.join(repoRoot, "packages/looma/src/components"), /\.html$/).then((all) => all.filter((file) => file.includes(`${path.sep}examples${path.sep}`))),
    path.join(repoRoot, "CHANGELOG.md"),
    path.join(repoRoot, "README.md"),
    path.join(repoRoot, "packages/looma/README.md"),
  ];
  const violations = [];
  for (const file of sources) {
    const source = await readFile(file, "utf8").catch(() => "");
    source.split("\n").forEach((line, index) => {
      if (MARKER_SELECTOR.test(line)) violations.push(`${path.relative(repoRoot, file)}:${index + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(violations, []);
});

test("flags a marker selector and allows a class", () => {
  assert.equal(MARKER_SELECTOR.test('[data-component~="ui-button"] { }'), true);
  assert.equal(MARKER_SELECTOR.test("[data-ui-section-state~=variant]"), true);
  assert.equal(MARKER_SELECTOR.test(".product-button { --ui-button-surface: red; }"), false);
});
