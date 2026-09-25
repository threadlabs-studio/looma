import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loomaIconCatalog } from "./icon-catalog.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * ui-icon draws from the generated catalog in components/shared/icons.js, which controllers import
 * straight into a browser; the editor and the Vue adapter draw from LOOMA_ICONS, which imports Lucide.
 * They must be the same set, drawn the same way: an icon added to one only drew nothing through the
 * other. Regenerate with tools/scripts/generate-icon-catalog.mjs.
 */
test("ui-icon's catalog is Looma's icon set, drawn from the same Lucide nodes", async () => {
  const { icons } = await import(pathToFileURL(path.join(repoRoot, "packages/looma/src/components/shared/icons.js")).href);
  const catalog = await loomaIconCatalog();
  assert.ok(Object.keys(catalog).length >= 50, "read Looma's icon set");
  assert.deepEqual(icons, catalog);
});
