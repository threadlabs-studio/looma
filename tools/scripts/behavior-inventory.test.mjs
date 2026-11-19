import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";

test("the behavior inventory assigns each source component one primary responsibility", async () => {
  const entries = await readdir(new URL("../../packages/looma/src/components/", import.meta.url), {
    withFileTypes: true,
  });
  const componentTags = entries
    .filter(entry => entry.isDirectory() && entry.name.startsWith("ui-"))
    .map(entry => entry.name);
  const inventory = await readFile(new URL("../../docs/behavior-inventory.md", import.meta.url), "utf8");
  const index = inventory.split("## Component index")[1]?.split("\n## ")[0];
  assert.ok(index, "Component index is missing");
  const indexedTags = Array.from(index.matchAll(/`(ui-[\w-]+)`/g), match => match[1]);
  assert.deepEqual(indexedTags.sort(), componentTags.sort());
});
