import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tokensRoot = path.join(repoRoot, "packages/looma/src/tokens");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");
const editorStyles = path.join(repoRoot, "packages/looma/src/vue/editor/looma-editor.css");

async function definedTokens() {
  const files = await readdir(tokensRoot);
  const sources = await Promise.all(files.map((file) => readFile(path.join(tokensRoot, file), "utf8")));
  return new Set(sources.flatMap((source) => [...source.matchAll(/(--ui-[\w-]+)\s*:/g)].map((match) => match[1])));
}

async function componentTokens() {
  const tags = (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-"));
  // The Vue editor surface owns --ui-editor-* the way a component owns its tag prefix.
  return { tags, prefixes: [...tags.map((tag) => `${tag}-`), "ui-editor-"] };
}

/**
 * A `var(--ui-x)` with no fallback is invalid at computed-value time when `--ui-x` is not defined,
 * which reads as "the property was never set": a renamed global silently drops a radius or a colour.
 * A component token is exempt, since a consumer defines it.
 */
test("every global token a stylesheet reads is defined", async () => {
  const defined = await definedTokens();
  const { prefixes } = await componentTokens();
  const files = [
    ...(await readdir(componentsRoot))
      .filter((name) => name.startsWith("ui-"))
      .map((tag) => path.join(componentsRoot, tag, `${tag}.html`)),
    editorStyles,
  ];
  const violations = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    // A stylesheet that sets a token itself may read it back without a fallback.
    const local = new Set([...source.matchAll(/(--ui-[\w-]+)\s*:/g)].map((match) => match[1]));
    for (const [, token, next] of source.matchAll(/var\((--ui-[\w-]+)\s*(,|\))/g)) {
      if (defined.has(token) || local.has(token)) continue;
      // A component's own token is defined by whoever sets it, so a fallback is the contract.
      if (prefixes.some((prefix) => token.startsWith(`--${prefix}`))) {
        if (next === ")") {
          violations.push(`${path.basename(file)}: ${token} has no fallback`);
        }
        continue;
      }
      violations.push(`${path.basename(file)}: ${token} is not defined in tokens.css or a theme`);
    }
  }
  assert.deepEqual(violations, []);
});
