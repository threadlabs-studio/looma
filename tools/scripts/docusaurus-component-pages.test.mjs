import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// The Docusaurus site files its component pages to match the component metadata. Component
// metadata does not read this tree; this check keeps the current site consistent with it.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docsRoot = path.join(repoRoot, "apps/docs/docs");
const { readDocumentationClassifications } = await import("./component-api-generator.mjs");
const { groups, tags } = await readDocumentationClassifications();
const published = Object.entries(tags).filter(([, value]) => value.status === "published");

async function componentPages() {
  const entries = await readdir(docsRoot, { recursive: true, withFileTypes: true });
  return new Map(entries
    .filter((entry) => entry.isFile() && /^ui-[a-z0-9-]+\.mdx$/.test(entry.name))
    .map((entry) => [entry.name.replace(/\.mdx$/, ""), path.join(entry.parentPath, entry.name)]));
}

const expectedDirectory = (value) => value.navigationParent
  ? "parts"
  : value.group === "editor" ? "editor" : `components/${value.group}`;

test("files one page per published component in its group's folder, and parts under parts/", async () => {
  const pages = await componentPages();
  assert.deepEqual([...pages.keys()].sort(), published.map(([tag]) => tag).sort());
  for (const [tag, value] of published) {
    assert.equal(path.relative(docsRoot, path.dirname(pages.get(tag))), expectedDirectory(value), tag);
    const source = await readFile(pages.get(tag), "utf8");
    const section = value.group === "editor" && !value.navigationParent ? "editor" : "components";
    assert.ok(source.includes(`slug: /${section}/${tag}\n`), `${tag}: canonical reference route belongs to ${section}`);
  }
});

test("labels and orders each sidebar category as the metadata's groups", async () => {
  const categories = await Promise.all(groups.filter(({ id }) => id !== "editor").map(async ({ id, label }) => ({
    id,
    label,
    category: JSON.parse(await readFile(path.join(docsRoot, "components", id, "_category_.json"), "utf8")),
  })));
  for (const { id, label, category } of categories) assert.equal(category.label, label, id);
  const byPosition = [...categories].sort((left, right) => left.category.position - right.category.position);
  assert.deepEqual(byPosition.map(({ id }) => id), categories.map(({ id }) => id));
});

test("opens each component page with its metadata description", async () => {
  const pages = await componentPages();
  for (const [tag, { description }] of published) {
    const lines = (await readFile(pages.get(tag), "utf8")).split("\n");
    const start = lines.findIndex((line, index) => index > lines.findIndex((title) => title.startsWith("# "))
      && line.trim() !== "" && !line.startsWith("import "));
    const lede = [];
    for (let index = start; index < lines.length && lines[index].trim() !== ""; index += 1) lede.push(lines[index].trim());
    assert.ok(lede.join(" ").startsWith(description), `${tag}: the page's first paragraph begins with its description`);
  }
});
