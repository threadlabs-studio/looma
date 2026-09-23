import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tokensRoot = path.join(repoRoot, "packages/looma/src/tokens");

/** The values a theme states. Everything else is mixed from them. */
const SEEDS = new Set([
  "--ui-accent", "--ui-danger", "--ui-success", "--ui-warning", "--ui-info",
  "--ui-on-accent", "--ui-on-danger",
  "--ui-surface", "--ui-surface-raised", "--ui-surface-sunken", "--ui-text"
]);

async function declaredColours(file) {
  const source = await readFile(path.join(tokensRoot, file), "utf8");
  return [...source.matchAll(/(--ui-[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)].map(([, token]) => token);
}

/**
 * High contrast is the one theme that overrides derived colours, and it says why in the file: a
 * mixed border is a grey one, and this theme asks for an edge that is drawn rather than implied.
 */
const DELIBERATE_DIVERGENCE = {
  "theme-high-contrast.css": new Set([
    "--ui-border", "--ui-border-strong", "--ui-control-border",
    "--ui-text-secondary", "--ui-text-muted", "--ui-disabled-text", "--ui-focus-ring"
  ])
};

test("a theme states the seeds and derives the rest", async () => {
  for (const file of (await readdir(tokensRoot)).filter((name) => name.startsWith("theme-"))) {
    const allowed = DELIBERATE_DIVERGENCE[file] ?? new Set();
    const extra = [...new Set(await declaredColours(file))]
      .filter((token) => !SEEDS.has(token) && !allowed.has(token));
    // A theme that restates a derived colour stops following its own seeds: change the accent and
    // the restated value stays where it was.
    assert.deepEqual(extra, [], `${file} states colours that derive from the seeds`);
  }
});

test("the contract states each seed once, and no other raw colour", async () => {
  const declared = await declaredColours("tokens.css");
  assert.deepEqual(declared.toSorted(), [...SEEDS].toSorted());
});
