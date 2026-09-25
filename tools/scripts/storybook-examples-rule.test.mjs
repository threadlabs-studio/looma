import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");
const storiesRoot = path.join(repoRoot, "apps/storybook/stories");

async function storyFiles(directory = storiesRoot) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await storyFiles(file));
    else if (entry.name.endsWith(".stories.ts")) files.push(file);
  }
  return files;
}

/**
 * Every component is in Storybook, and every story renders the component's own examples, the files
 * the docs site renders and tests. A story that wrote markup by hand drifted: it slotted a native
 * <input> into a Checkbox that draws its own, a <button> into a Button, and showed two of each.
 */
test("every component has a story, and every story renders its component's examples", async () => {
  const stories = await storyFiles();
  const byTag = new Map(stories.map((file) => [path.basename(file, ".stories.ts"), file]));
  const missing = [];
  for (const tag of (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort()) {
    const examples = await readdir(path.join(componentsRoot, tag, "examples")).catch(() => []);
    if (examples.some((name) => name.endsWith(".html")) && !byTag.has(tag)) missing.push(tag);
  }
  assert.deepEqual(missing, [], "components without a story");

  const handWritten = [];
  for (const file of stories) {
    const source = await readFile(file, "utf8");
    if (!/renderExample\(/.test(source) || /<ui-[a-z-]+[\s>]/.test(source)) handWritten.push(path.relative(storiesRoot, file));
  }
  assert.deepEqual(handWritten, [], "stories that write component markup instead of rendering examples");
});
