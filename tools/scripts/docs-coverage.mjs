import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const routePath = (permalink) => permalink.replace(/^\/looma\/?/, "").replace(/\/$/, "") || "./";

/** Read the built router's public pages and each page's authored example inventory. */
export function discoverDocsCoverage(root) {
  const metadata = path.join(root, "apps/docs/.docusaurus/docusaurus-plugin-content-docs/default");
  const pages = readdirSync(metadata).filter((name) => name.endsWith(".json")).flatMap((name) => {
    const doc = JSON.parse(readFileSync(path.join(metadata, name), "utf8"));
    if (!doc.permalink || doc.draft) return [];
    const route = routePath(doc.permalink);
    const component = /^components\/(ui-[\w-]+)$/.exec(route)?.[1] ?? null;
    const dir = component && path.join(root, "packages/looma/src/components", component, "examples");
    const examples = dir && existsSync(dir) ? readdirSync(dir).filter((name) => /^\d+[^.]*\.html$/.test(name)).sort().map((name) => {
      const source = readFileSync(path.join(dir, name), "utf8");
      const id = name.replace(/\.html$/, "");
      return { id, title: /^title: (.+)$/m.exec(source)?.[1] ?? id, behavior: existsSync(path.join(dir, `${id}.behavior.ts`)) };
    }) : [];
    return [{ path: route, title: doc.title, source: doc.source.replace("@site/", "apps/docs/"), component, examples }];
  }).sort((a, b) => a.path.localeCompare(b.path, "en"));
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length, "Duplicate documentation routes");
  // Include plugin/custom-page routes in the guard even when they have no docs metadata.
  const chunks = JSON.parse(readFileSync(path.join(root, "apps/docs/.docusaurus/routesChunkNames.json"), "utf8"));
  const builtRoutes = [...new Set(Object.keys(chunks).map((key) => routePath(key.replace(/-[0-9a-f]{3}$/, ""))))]
    .sort((a, b) => a.localeCompare(b, "en"));
  assert.deepEqual(builtRoutes, pages.map((page) => page.path), "Built routes lack documentation coverage metadata. Extend the inventory before accepting a custom page.");
  return { schemaVersion: 1, pages };
}

/** Fail when the built site has routes or scenarios absent from the reviewed inventory. */
export function checkDocsCoverage(expected, actual) {
  assert.deepEqual(actual, expected, "Documentation coverage inventory changed. Review added/removed routes and examples, then run docs:coverage:update.");
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = path.join(root, "apps/docs/tests/coverage.json");
  const inventory = discoverDocsCoverage(root);
  if (process.argv.includes("--write")) writeFileSync(output, `${JSON.stringify(inventory, null, 2)}\n`);
  else checkDocsCoverage(JSON.parse(readFileSync(output, "utf8")), inventory);
  console.log(`Docs coverage: ${inventory.pages.length} routes, ${inventory.pages.reduce((n, page) => n + page.examples.length, 0)} authored examples.`);
}
