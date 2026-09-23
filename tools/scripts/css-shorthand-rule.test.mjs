import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");
const borderShorthand = /(?<![-\w])(border(?:-block|-inline)?(?:-start|-end)?):\s*([^;]+);/g;

/** Splits on the spaces between a value's components, leaving the ones inside var() alone. */
function components(value) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of value.trim()) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === " " && depth === 0) {
      if (current) parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Lowering expands a shorthand into its longhands. One that omits a component and carries a var()
 * comes out with empty values: `border: solid var(--x)` became `border-*-style: ; border-*-color: ;`,
 * and the checkbox's tick — styleless, and so zero-width — stopped being drawn at all.
 */
test("a border shorthand carrying a var() states width, style, and colour", async () => {
  const violations = [];
  for (const tag of (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-"))) {
    const file = `${tag}.html`;
    const source = (await readFile(path.join(componentsRoot, tag, file), "utf8"))
      .replaceAll(/\/\*[\s\S]*?\*\//g, "");
    for (const [, property, value] of source.matchAll(borderShorthand)) {
      if (!value.includes("var(") || value.trim() === "none" || value.trim() === "0") continue;
      if (components(value).length >= 3) continue;
      violations.push(`${file}: ${property}: ${value.trim()}`);
    }
  }
  assert.deepEqual(violations, []);
});
