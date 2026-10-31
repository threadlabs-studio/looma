import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tokensRoot = path.join(repoRoot, "packages/looma/src/tokens");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");
const editorStyles = path.join(repoRoot, "packages/looma/src/components/ui-editor/ui-editor.css");

// Optional inherited middle layer. These are deliberately unset in tokens.css, so each component
// reads its global fallback when a consumer has not themed that group.
const GROUP_TOKENS = new Set([
  "--ui-field-radius", "--ui-field-danger", "--ui-field-label-font-size", "--ui-action-radius", "--ui-action-edge", "--ui-action-shadow",
  "--ui-font-display", "--ui-press-scale", "--ui-motion-press",
  "--ui-overlay-radius", "--ui-overlay-surface", "--ui-overlay-border", "--ui-overlay-shadow",
]);

async function definedTokens(includeRecipe = true) {
  const files = await readdir(tokensRoot);
  const sources = await Promise.all(files.filter(file => includeRecipe || file !== "theme-system.css").map((file) => readFile(path.join(tokensRoot, file), "utf8")));
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
  const defaults = await definedTokens(false);
  const optional = new Set([...defined].filter(token => !defaults.has(token)));
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
    // A root relaying its hook to its parts, `--_ui-x: var(--ui-x)`, passes an unset hook on as unset;
    // the parts that read `--_ui-x` supply the fallback.
    const relays = new Set([...source.matchAll(/--_(ui-[\w-]+)\s*:\s*var\(--(ui-[\w-]+)\)/g)].filter(([, relay, hook]) => relay === hook).map(([, , hook]) => `--${hook}`));
    for (const [, token, next] of source.matchAll(/var\((--ui-[\w-]+)\s*(,|\))/g)) {
      if (optional.has(token) && !GROUP_TOKENS.has(token)) {
        if (next === ")") violations.push(`${path.basename(file)}: optional recipe role ${token} has no default fallback`);
        continue;
      }
      if (defined.has(token) || GROUP_TOKENS.has(token) || local.has(token) || relays.has(token)) continue;
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

test("group tokens stay optional and shared across components", async () => {
  // Only an explicitly imported recipe opts into group values; defaults and palettes do not.
  const defined = await definedTokens(false);
  const tags = (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-"));
  for (const token of GROUP_TOKENS) {
    assert.equal(defined.has(token), false, `${token} must be unset so its fallback remains live`);
    const users = [];
    for (const tag of tags) {
      const source = await readFile(path.join(componentsRoot, tag, `${tag}.html`), "utf8");
      if (new RegExp(`var\\(\\s*${token}\\s*,`).test(source)) users.push(tag);
    }
    assert.ok(users.length >= 2, `${token} should theme a group, not only ${users.join(", ")}`);
  }
});

test("line-height declarations and shared leading tokens stay unitless", async () => {
  const files = [
    ...(await readdir(tokensRoot)).filter(file => file.endsWith('.css')).map(file => path.join(tokensRoot,file)),
    ...(await readdir(componentsRoot)).filter(tag => tag.startsWith('ui-')).map(tag => path.join(componentsRoot,tag,`${tag}.html`)),
    editorStyles,
  ];
  const violations = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const [,property,value] of source.matchAll(/(?:^|[;{\s])(line-height|--ui-line-height[\w-]*)\s*:\s*([^;}]+)/gm)) {
      if (/\d(?:%|(?:px|r?em|r?ex|r?ch|r?cap|r?ic|r?lh|in|cm|mm|q|pt|pc|[sld]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max))\b)/i.test(value)) violations.push(`${path.relative(repoRoot,file)}: ${property}: ${value.trim()}`);
    }
  }
  assert.deepEqual(violations, [], 'Leading must follow each text role through unitless multipliers, not inherited lengths.');
});
