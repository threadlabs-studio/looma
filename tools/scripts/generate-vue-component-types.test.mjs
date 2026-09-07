import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("generated Vue adapter types expose component props and typed callbacks", async () => {
  const source = await readFile(
    path.join(repoRoot, "packages/vue/src/generated-component-types.ts"),
    "utf8",
  );

  assert.match(source, /export interface DialogProps/);
  assert.match(source, /"open"\?: boolean \| undefined/);
  assert.match(source, /"onClose"\?: \(\(detail: VueAdapterEventMap\['close'\]\) => void\) \| undefined/);
  assert.match(source, /export interface TreeProps/);
  assert.match(source, /"onReorderRejected"\?: \(\(detail: VueAdapterEventMap\['reorderRejected'\]\) => void\) \| undefined/);
});
