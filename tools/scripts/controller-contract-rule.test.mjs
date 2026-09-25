import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");

// Markers the compiler and the adapters write for their own use: which component a root is, and the
// state attribute :host-state() reads. They are implementation details, and they differ by adapter.
const IMPLEMENTATION_DETAILS = /data-component|data-ui-[a-z-]+-state|data-slotted/;

/**
 * A controller (and an example's behavior script) finds what it works with from its host's root
 * element, by public contract: host.element.querySelector('[role="menuitem"]'), closest('[role="tree"]'),
 * refs, and native elements. It never selects by an adapter's implementation markers, which a Vue app
 * does not need to carry and which change with the compiler.
 */
test("controllers find related parts by public contract, never by implementation markers", async () => {
  const violations = [];
  const scan = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await scan(file);
      else if (/\.(js|ts)$/.test(entry.name)) {
        const source = await readFile(file, "utf8");
        source.split("\n").forEach((line, index) => {
          if (IMPLEMENTATION_DETAILS.test(line)) violations.push(`${path.relative(componentsRoot, file)}:${index + 1}`);
        });
      }
    }
  };
  await scan(componentsRoot);
  assert.deepEqual(violations, []);
});
