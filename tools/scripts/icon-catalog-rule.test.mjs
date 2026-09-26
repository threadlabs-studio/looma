import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { iconShapesExpression, loomaIconCatalog } from "./icon-catalog.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * ui-icon draws from the generated catalog in its own template; components/shared/icons.js carries the
 * same data for controllers, which import it straight into a browser; the editor and the Vue adapter
 * draw from LOOMA_ICONS, which imports Lucide. They must be the same set, drawn the same way: an icon
 * added to one only drew nothing through the other. Regenerate with
 * tools/scripts/generate-icon-catalog.mjs.
 */
test("ui-icon's catalog is Looma's icon set, drawn from the same Lucide nodes", async () => {
  const { icons } = await import(pathToFileURL(path.join(repoRoot, "packages/looma/src/components/shared/icons.js")).href);
  const catalog = await loomaIconCatalog();
  assert.ok(Object.keys(catalog).length >= 50, "read Looma's icon set");
  assert.deepEqual(icons, catalog);
});

test("ui-icon derives its shapes from the same catalog", async () => {
  const html = await readFile(path.join(repoRoot, "packages/looma/src/components/ui-icon/ui-icon.html"), "utf8");
  const derived = /<computed\s+name="shapes"\s+from="([^"]*)"/.exec(html)?.[1];
  const flat = (source) => source.replace(/\s+/g, " ");
  assert.equal(flat(derived ?? ""), flat(iconShapesExpression(await loomaIconCatalog())));
});
