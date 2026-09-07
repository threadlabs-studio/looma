import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assertGeneratedOutputIsCurrent } from "./check-docs-sync.mjs";

test("rejects stale generated public API output", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "looma-docs-sync-"));
  const outputPath = path.join(directory, "generated.ts");
  await writeFile(outputPath, "old output\n", "utf8");

  await assert.rejects(
    assertGeneratedOutputIsCurrent({
      path: outputPath,
      generate: async () => "current output\n",
    }),
    /Generated public API output is stale/,
  );
});
