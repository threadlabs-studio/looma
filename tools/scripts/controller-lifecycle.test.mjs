import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const components = new URL("../../packages/looma/src/components/", import.meta.url);

for (const tag of (await readdir(components)).filter((name) => name.startsWith("ui-"))) {
  const definition = await readFile(new URL(`${tag}/${tag}.html`, components), "utf8");
  const modulePath = /\bmodule="([^"]+)"/.exec(definition)?.[1];
  test(`${tag} uses optional named activation without evaluating DOM setup on import`, async () => {
    assert.doesNotMatch(definition, /\bcontroller=/);
    if (!modulePath) return;
    const exports = await import(new URL(`${tag}/${modulePath}`, components));
    assert.deepEqual(Object.keys(exports), ["connect"]);
    assert.equal(typeof exports.connect, "function");
  });
}
