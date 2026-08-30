import assert from "node:assert/strict";
import test from "node:test";

import { topologicallySortPackages } from "./create-release-manifest.mjs";

function entry(name, dependencies = {}) {
  return { packageJson: { name, dependencies } };
}

test("derives a deterministic dependency-first publish order", () => {
  const ordered = topologicallySortPackages([
    entry("@looma/tokens"),
    entry("@looma/layout"),
    entry("@looma/core"),
    entry("@looma/editor", { "@looma/core": "0.1.0", "@looma/tokens": "0.1.0" }),
    entry("@looma/vue", {
      "@looma/core": "0.1.0",
      "@looma/editor": "0.1.0",
      "@looma/layout": "0.1.0"
    })
  ]);

  assert.deepEqual(
    ordered.map((item) => item.packageJson.name),
    ["@looma/tokens", "@looma/layout", "@looma/core", "@looma/editor", "@looma/vue"]
  );
});

test("rejects a missing internal release dependency", () => {
  assert.throws(
    () => topologicallySortPackages([entry("@looma/editor", { "@looma/core": "0.1.0" })]),
    /depends on missing release package @looma\/core/
  );
});

test("rejects an internal release dependency cycle", () => {
  assert.throws(
    () =>
      topologicallySortPackages([
        entry("@looma/core", { "@looma/editor": "0.1.0" }),
        entry("@looma/editor", { "@looma/core": "0.1.0" })
      ]),
    /dependency cycle: @looma\/core, @looma\/editor/
  );
});
