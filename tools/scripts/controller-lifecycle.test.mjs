import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const components = new URL("../../packages/looma/src/components/", import.meta.url);

for (const tag of (await readdir(components)).filter((name) => name.startsWith("ui-"))) {
  const definition = await readFile(new URL(`${tag}/${tag}.html`, components), "utf8");
  const controllerPath = /\bcontroller="([^"]+)"/.exec(definition)?.[1];
  if (!controllerPath) continue;
  test(`${tag} registers connection setup without touching disconnected DOM`, async () => {
    const { default: controller } = await import(new URL(`${tag}/${controllerPath}`, components));
    const hooks = [];
    const host = { on: (name, callback) => { hooks.push({ name, callback }); return () => {}; } };
    assert.equal(controller(host), undefined, "instance initialization must keep the reconnect subscription");
    assert.equal(hooks.length, 1);
    assert.equal(hooks[0].name, "connect");
    assert.equal(typeof hooks[0].callback, "function");
  });
}
