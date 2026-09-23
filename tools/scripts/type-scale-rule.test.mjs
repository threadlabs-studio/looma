import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const components = new URL("../../packages/looma/src/components/", import.meta.url);
const tokens = new URL("../../packages/looma/src/tokens/tokens.css", import.meta.url);

// A fixed-size glyph inside a fixed-size affordance, not text.
const allowed = new Set(["ui-editor-table-overlay"]);

test("components take their font sizes from the scale, so a theme's base size moves them all", async () => {
  const offenders = [];
  for (const tag of await readdir(components)) {
    if (allowed.has(tag)) continue;
    const source = await readFile(new URL(`${tag}/${tag}.html`, components), "utf8").catch(() => "");
    for (const [declaration] of source.matchAll(/font-size:[^;]*;/g)) {
      if (/\d(rem|px)\b/.test(declaration)) offenders.push(`${tag}: ${declaration}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("every step of the type scale derives from the one base size", async () => {
  const css = await readFile(tokens, "utf8");
  const steps = [...css.matchAll(/--ui-font-size-([a-z0-9]+):\s*([^;]+);/g)];
  assert.ok(steps.length >= 7);
  for (const [, step, value] of steps) {
    assert.match(value, /var\(--ui-font-size\)/, `--ui-font-size-${step} must derive from --ui-font-size`);
  }
  assert.doesNotMatch(css, /--ui-font-size-ui\b/);
});
