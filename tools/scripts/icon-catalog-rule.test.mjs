import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => import(path.join(repoRoot, "packages/looma/src", file));

/**
 * ui-icon draws from the serialized catalog in components/shared/editor.js, which controllers import
 * straight into a browser; the editor and the Vue adapter draw from LOOMA_ICONS (editor/icons.ts),
 * which imports Lucide. The two must be the same set, drawn the same way: an icon added to one only
 * drew nothing through the other.
 */
test("ui-icon's catalog is Looma's icon set, drawn from the same Lucide nodes", async () => {
  const { LOOMA_ICONS } = await read("editor/icons.ts");
  const { icons } = await read("components/shared/icons.js");
  const strip = (nodes) => nodes.map(([tag, attributes]) => [tag, Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== "key"))]);
  assert.deepEqual(Object.keys(icons).sort(), Object.keys(LOOMA_ICONS).sort());
  for (const [name, nodes] of Object.entries(LOOMA_ICONS)) {
    assert.deepEqual(strip(icons[name]), strip(nodes), name);
  }
});
