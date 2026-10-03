import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../packages/looma/src");

test("surface borders and focus rings use semantic dimensions", async () => {
  const tags = (await readdir(path.join(root, "components"))).filter(tag => tag.startsWith("ui-"));
  const files = [...tags.map(tag => path.join(root, "components", tag, `${tag}.html`)), path.join(root, "tokens/tokens.css"), path.join(root, "vue/editor/looma-editor.css")];
  const failures = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const css = (file.endsWith(".html") ? source.slice(source.indexOf("<style>")) : source).replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, property, value] of css.matchAll(/(?:^|[;{\n])\s*(border(?:-(?:block|inline)(?:-(?:start|end))?|-(?:top|right|bottom|left))?(?:-width)?|outline|box-shadow)\s*:\s*([^;]+);/g)) {
      // CSS chevrons and checks construct a glyph, rather than a surface edge. Shadows that
      // model light/blur are not rings; only focus-ring spreads are governed here.
      if (value.includes("currentColor") || (property === "box-shadow" && !value.includes("--ui-focus-ring") && !value.includes("focus-shadow"))) continue;
      if (/\b[1-9][\d.]*px\b/.test(value)) failures.push(`${path.basename(file)}: ${property}: ${value.trim()}`);
    }
  }
  assert.deepEqual(failures, [], "use border, accent-line, or focus width for each visual role");
});
