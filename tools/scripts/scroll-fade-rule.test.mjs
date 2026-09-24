import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");

// A scroller that is also a bordered, shadowed surface: a mask would cut its border and shadow, so it
// needs an inner scroller before it can fade.
const SURFACE = "the scroller is the bordered, shadowed surface; it needs an inner scroller to fade";
const EXEMPT = {
  "ui-combobox .popup": SURFACE,
  "ui-context-menu .menu": SURFACE,
  "ui-editor-table-context-menu :host": SURFACE,
  "ui-editor-table-toolbar .looma-editor__mobile-toolbar-shell :host .menu": SURFACE,
  "ui-menu .surface": SURFACE,
  "ui-popover .surface": SURFACE,
  "ui-search-shell dialog": "the whole-screen dialog only scrolls as a last resort; its body is the scroller",
  "ui-tabs .list": "its baseline border would fade with the tabs",
};

/**
 * Every Looma scroller fades the edges that hide content the same way: the scroll fade in tokens.css,
 * driven by the scroller's own scroll timeline (see ui-scroll-area). A new scroller gets the fade or a
 * reason here.
 */
test("every scroller fades its edges with the shared scroll fade", async () => {
  const missing = [];
  const seen = new Set();
  for (const tag of (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort()) {
    const source = await readFile(path.join(componentsRoot, tag, `${tag}.html`), "utf8");
    const css = (source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector.trim(), body }));
    for (const { selector, body } of blocks) {
      if (!/overflow(?:-[xy])?:\s*(?:auto|scroll)/.test(body)) continue;
      const key = `${tag} ${selector}`;
      seen.add(key);
      const fades = blocks.some((block) => block.selector === selector && /animation-timeline:\s*scroll\(self/.test(block.body));
      if (!fades && !EXEMPT[key]) missing.push(key);
    }
  }
  assert.deepEqual(missing, []);
  // An exemption outlives its scroller only by mistake.
  assert.deepEqual(Object.keys(EXEMPT).filter((key) => !seen.has(key)), []);
});

test("the scroll fade is registered where scoped styles cannot register it", async () => {
  const tokens = await readFile(path.join(repoRoot, "packages/looma/src/tokens/tokens.css"), "utf8");
  for (const rule of ["@property --_ui-scroll-fade-start", "@property --_ui-scroll-fade-end", "@keyframes ui-scroll-fade-start", "@keyframes ui-scroll-fade-start-hold", "@keyframes ui-scroll-fade-end-hold", "@keyframes ui-scroll-fade-end"]) {
    assert.ok(tokens.includes(rule), rule);
  }
});
