import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

// Component modules may import styles; Node has no stylesheet loader. Keep their JavaScript
// evaluation real so this check still catches browser-global access before connect.
registerHooks({ load(url, context, nextLoad) {
  return url.endsWith(".css") ? { format: "module", source: "", shortCircuit: true } : nextLoad(url, context);
} });

const components = new URL("../../packages/looma/src/components/", import.meta.url);

for (const tag of (await readdir(components)).filter((name) => name.startsWith("ui-"))) {
  const definition = await readFile(new URL(`${tag}/${tag}.html`, components), "utf8");
  const modulePath = /\bmodule="([^"]+)"/.exec(definition)?.[1];
  test(`${tag} uses optional named activation without evaluating DOM setup on import`, async () => {
    assert.doesNotMatch(definition, /\bcontroller=/);
    if (!modulePath) return;
    const exports = await import(new URL(`${tag}/${modulePath}`, components));
    assert.deepEqual(Object.keys(exports), exports.connect === undefined ? [] : ["connect"]);
    if (exports.connect !== undefined) assert.equal(typeof exports.connect, "function");
  });
}
