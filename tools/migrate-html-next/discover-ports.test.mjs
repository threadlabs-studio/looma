import assert from "node:assert/strict";
import { test } from "node:test";

import { discoverPorts, referencedTags } from "./discover-ports.mjs";

test("finds component tags in markup", () => {
  assert.deepEqual(referencedTags("<div><ui-tooltip></ui-tooltip><ui-chip /></div>"), ["ui-tooltip", "ui-chip"]);
});

test("loads transitive generated component dependencies once", async () => {
  const sources = new Map([
    ["ui-combobox", "<div><ui-tooltip></ui-tooltip></div>"],
    ["ui-tooltip", "<span><ui-popover></ui-popover></span>"],
    ["ui-popover", "<div></div>"],
  ]);
  const loaded = [];
  const ports = await discoverPorts(["ui-combobox", "ui-tooltip"], async (tag) => {
    loaded.push(tag);
    return { tag, port: sources.get(tag) };
  });
  assert.deepEqual(loaded, ["ui-combobox", "ui-tooltip", "ui-popover"]);
  assert.deepEqual(ports.map((port) => port.tag), loaded);
});
