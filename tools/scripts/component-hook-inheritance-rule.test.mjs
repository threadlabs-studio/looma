import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");
const tokensRoot = path.join(repoRoot, "packages/looma/src/tokens");

async function sources() {
  const tags = (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort();
  const files = await Promise.all(tags.map(async (tag) => {
    const source = await readFile(path.join(componentsRoot, tag, `${tag}.html`), "utf8");
    return { tag, name: `${tag}.html`, css: source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "" };
  }));
  files.push({ name: "looma-editor.css", css: await readFile(path.join(repoRoot, "packages/looma/src/vue/editor/looma-editor.css"), "utf8") });
  const tokens = new Set();
  for (const file of await readdir(tokensRoot)) {
    const css = await readFile(path.join(tokensRoot, file), "utf8");
    files.push({ name: file, css });
    for (const [, token] of css.matchAll(/(--ui-[\w-]+)\s*:/g)) tokens.add(token);
  }
  // Longest prefix wins: Icon Button's hooks do not belong to Icon. Editor hooks are shared
  // across the editor surface, rather than owned by one of its composed controls.
  const byLength = [...tags].sort((a, b) => b.length - a.length);
  const owner = (hook) => tokens.has(hook) || hook.startsWith("--ui-editor-")
    ? undefined : byLength.find((tag) => hook.startsWith(`--${tag}-`));
  return { files, owner };
}

test("public styling properties support root and ancestor inheritance", async () => {
  const { files } = await sources();
  const violations = [];
  for (const { name, css } of files) {
    for (const [, hook, registration] of css.matchAll(/@property\s+(--ui-[\w-]+)\s*\{([^}]+)\}/g)) {
      if (!/inherits:\s*true\s*;/.test(registration)) violations.push(`${name}: ${hook}`);
    }
  }
  assert.deepEqual(violations, [], "only private implementation values may block inheritance");
});

test("a component reads its own hooks, shared tokens and editor roles", async () => {
  const { files, owner } = await sources();
  const violations = [];
  for (const { tag, name, css } of files.filter((file) => file.tag)) {
    for (const [, hook] of css.matchAll(/var\(\s*(--ui-[\w-]+)/g)) {
      const hookOwner = owner(hook);
      if (hookOwner && hookOwner !== tag) violations.push(`${name}: reads ${hook}, a hook of ${hookOwner}`);
    }
  }
  assert.deepEqual([...new Set(violations)], []);
});
