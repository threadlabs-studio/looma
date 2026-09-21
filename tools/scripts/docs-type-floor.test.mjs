import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The docs site keeps text readable: nothing below 0.75rem (labels and metadata), and prose larger.
test("docs stylesheet sets no font size below 0.75rem", async () => {
  const css = await readFile(new URL("../../apps/docs/src/css/custom.css", import.meta.url), "utf8");
  const tooSmall = [...css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)]
    .filter(([, value, unit]) => (unit === "rem" ? Number(value) * 16 : Number(value)) < 12)
    .map(([declaration]) => declaration);
  assert.deepEqual(tooSmall, []);
});
