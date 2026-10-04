import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { discoverDocsCoverage, checkDocsCoverage } from "./docs-coverage.mjs";

test("coverage detects added routes and examples rather than silently blessing them", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "looma-docs-coverage-"));
  try {
    const metadata = path.join(root, "apps/docs/.docusaurus/docusaurus-plugin-content-docs/default");
    const examples = path.join(root, "packages/looma/src/components/ui-button/examples");
    await mkdir(metadata, { recursive: true });
    await mkdir(examples, { recursive: true });
    const router = path.join(root, "apps/docs/.docusaurus/routesChunkNames.json");
    await writeFile(router, JSON.stringify({ "/looma/components/ui-button/-abc": {} }));
    await writeFile(path.join(metadata, "button.json"), JSON.stringify({ title: "Button", source: "@site/docs/button.mdx", permalink: "/looma/components/ui-button" }));
    await writeFile(path.join(examples, "01-default.html"), "<!--\ntitle: Default\n-->\n<ui-button>Go</ui-button>");
    const baseline = discoverDocsCoverage(root);
    assert.equal(baseline.pages[0].examples[0].title, "Default");
    assert.doesNotThrow(() => checkDocsCoverage(baseline, discoverDocsCoverage(root)));
    await writeFile(path.join(examples, "02-disabled.html"), "<!--\ntitle: Disabled\n-->\n<ui-button disabled>Go</ui-button>");
    assert.throws(() => checkDocsCoverage(baseline, discoverDocsCoverage(root)), /inventory changed/);
    await rm(path.join(examples, "02-disabled.html"));
    assert.doesNotThrow(() => checkDocsCoverage(baseline, discoverDocsCoverage(root)));
    await writeFile(path.join(metadata, "guide.json"), JSON.stringify({ title: "Guide", source: "@site/docs/guide.md", permalink: "/looma/guide" }));
    await writeFile(router, JSON.stringify({ "/looma/components/ui-button/-abc": {}, "/looma/guide/-def": {} }));
    assert.equal(discoverDocsCoverage(root).pages.length, 2);
    assert.throws(() => checkDocsCoverage(baseline, discoverDocsCoverage(root)), /inventory changed/);
    await writeFile(router, JSON.stringify({ "/looma/components/ui-button/-abc": {}, "/looma/guide/-def": {}, "/looma/playground/-123": {} }));
    assert.throws(() => discoverDocsCoverage(root), /lack documentation coverage metadata/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
