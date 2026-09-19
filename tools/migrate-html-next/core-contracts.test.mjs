import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { coreContracts } from "./core-contracts.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE = join(HERE, "..", "..", "packages", "core", "src", "components");

test("the Looma-owned public contract covers every core component", async () => {
  const tags = (await readdir(CORE, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(Object.keys(coreContracts).sort(), tags);
});

test("contract records use declarative API terms rather than source-framework metadata", () => {
  const serialized = JSON.stringify(coreContracts);
  assert.doesNotMatch(serialized, /Stencil|decorator|@Prop|@Method/);
  assert.deepEqual(coreContracts["ui-combobox"].methods, [
    { name: "validate", returns: "promise(unknown)" },
    { name: "focusInput", returns: "promise(undefined)" },
  ]);
  assert.equal(coreContracts["ui-combobox"].props.config.type, "unknown");
  assert.equal(coreContracts["ui-combobox"].props.tokenSeparators.type, "list(string)");
  assert.equal(coreContracts["ui-button"].root, "span");
  assert.deepEqual(coreContracts["ui-search-shell"].slots, ["backdrop", "search", "status", "body", "footer"]);
  assert.deepEqual(coreContracts["ui-dialog"].events.map(({ name }) => name), ["close"]);
  assert.match(coreContracts["ui-dialog"].events[0].type, /^object\(\{ open: boolean,/);
});
