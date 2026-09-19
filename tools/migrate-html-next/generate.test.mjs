import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateCoreArtifacts } from "./generate.mjs";

test("generates the complete deterministic core graph", async () => {
  const first = await mkdtemp(join(tmpdir(), "looma-html-next-first-"));
  const second = await mkdtemp(join(tmpdir(), "looma-html-next-second-"));
  try {
    const firstManifest = await generateCoreArtifacts({ output: first });
    const secondManifest = await generateCoreArtifacts({ output: second });

    assert.equal(firstManifest.components.length, 33);
    assert.deepEqual(firstManifest, secondManifest);
    assert.equal(firstManifest.components[0].tag, "ui-affordance-scope");
    assert.equal(firstManifest.components.at(-1).tag, "ui-tree-item");

    const avatar = await readFile(join(first, "components", "ui-avatar.html"), "utf8");
    assert.match(avatar, /controller="\.\/controllers\/ui-avatar\.js"/);
    assert.match(avatar, /<style>/);
    assert.match(
      await readFile(join(first, "components", "controllers", "ui-avatar.js"), "utf8"),
      /export default function controller/,
    );

    const contextMenu = await readFile(join(first, "components", "ui-context-menu.html"), "utf8");
    assert.match(contextMenu, /<link rel="component" href="\.\/ui-menu\.html">/);
    assert.match(contextMenu, /<event name="select" type="object\(\{ value: string,/);
  } finally {
    await Promise.all([
      rm(first, { recursive: true, force: true }),
      rm(second, { recursive: true, force: true }),
    ]);
  }
});
