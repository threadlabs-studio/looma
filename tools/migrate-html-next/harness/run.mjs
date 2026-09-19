// Visual-convergence harness across the full core-component corpus.
//   before = the original Stencil Shadow-DOM component from the built Storybook
//   after  = its HTML Next migration (render-derived port + converted :scope/:slotted CSS) lowered
//            by the vendored HTML Next runtime
// Auto-discovers every packages/core component that has a .tsx + .css, matches it to a Storybook
// story, derives the root element from :host display, and reports per-component overlap mismatch.
// Tooling only: it renders the migration to validate it, it does not adopt it.
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { convertShadowStyles } from "../convert-styles.mjs";
import { renderPort } from "../convert-render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOMA = join(HERE, "..", "..", "..");
const STATIC = join(LOOMA, "apps/storybook/storybook-static");
const CORE = join(LOOMA, "packages/core/src/components");
const RUNTIME = await readFile(join(HERE, "..", "vendor", "html-next-runtime.iife.js"), "utf8");
const only = process.argv.slice(2); // optional tag filter

// Map each component tag to a representative story id (prefer a "default"/"info"/"tag" story).
const index = JSON.parse(await readFile(join(STATIC, "index.json"), "utf8"));
const stories = Object.values(index.entries).filter((s) => s.type === "story");
function storyFor(tag) {
  const name = tag.replace(/^ui-/, "");
  const matches = stories.filter((s) => s.id.includes(`-${name}--`) || s.id.startsWith(`${name}--`));
  if (matches.length === 0) return undefined;
  return (matches.find((s) => /--(default|info|tag|basic)$/.test(s.id)) ?? matches[0]).id;
}

// Root element mirrors the shadow :host display: inline* -> span, otherwise div.
function rootFor(css) {
  const m = /:host\s*(?:\([^)]*\))?\s*\{[^}]*?\bdisplay:\s*([\w-]+)/.exec(css);
  const display = m?.[1] ?? "inline-flex";
  return /^inline/.test(display) || display === "contents" ? "span" : "div";
}

const tokens = (await Promise.all([
  "packages/tokens/src/tokens.css", "packages/tokens/src/theme-light.css",
  "packages/layout/src/layout.css", "apps/storybook/.storybook/preview.css",
].map((f) => readFile(join(LOOMA, f), "utf8").catch(() => "")))).join("\n");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".map": "application/json" };
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const body = await readFile(join(STATIC, p === "/" ? "/index.html" : p));
    res.writeHead(200, { "content-type": MIME[extname(join(STATIC, p))] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });

async function diff(before, after) {
  const page = await ctx.newPage();
  const r = await page.evaluate(async ({ b, a }) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const ib = await load("data:image/png;base64," + b), ia = await load("data:image/png;base64," + a);
    const W = Math.max(ib.width, ia.width), H = Math.max(ib.height, ia.height);
    const px = (img) => { const c = document.createElement("canvas"); c.width = W; c.height = H; c.getContext("2d").drawImage(img, 0, 0); return c.getContext("2d").getImageData(0, 0, W, H).data; };
    const db = px(ib), da = px(ia), w2 = Math.min(ib.width, ia.width), h2 = Math.min(ib.height, ia.height);
    let m = 0; const T = 32;
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) { const i = (y * W + x) * 4; if (Math.abs(db[i] - da[i]) + Math.abs(db[i + 1] - da[i + 1]) + Math.abs(db[i + 2] - da[i + 2]) > T) m++; }
    return { before: [ib.width, ib.height], after: [ia.width, ia.height], mismatch: m, total: w2 * h2 };
  }, { b: before.toString("base64"), a: after.toString("base64") });
  await page.close();
  return r;
}

const dirs = (await readdir(CORE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const tags = dirs.filter((t) => (only.length === 0 || only.includes(t)));
const results = [];
for (const tag of tags) {
  try {
    const css = await readFile(join(CORE, tag, `${tag}.css`), "utf8").catch(() => null);
    const tsx = await readFile(join(CORE, tag, `${tag}.tsx`), "utf8").catch(() => null);
    if (css === null || tsx === null) { results.push({ tag, note: "no .tsx/.css" }); continue; }
    const story = storyFor(tag);
    if (story === undefined) { results.push({ tag, note: "no story" }); continue; }

    const before = await ctx.newPage();
    await before.goto(`${base}/iframe.html?id=${story}&viewMode=story`, { waitUntil: "networkidle" });
    await before.waitForSelector(`${tag}, ${tag}.hydrated`, { timeout: 8000 }).catch(() => {});
    await before.waitForTimeout(400);
    const el = before.locator(tag).first();
    if (await el.count() === 0) { results.push({ tag, note: "component not in story" }); await before.close(); continue; }
    const box = await el.boundingBox();
    if (box === null || box.width < 1 || box.height < 1) { results.push({ tag, note: "no visible box (controller-driven?)" }); await before.close(); continue; }
    const beforeBuf = await el.screenshot();
    const host = await el.evaluate((node) => ({
      attrs: node.getAttributeNames().filter((n) => !n.startsWith("data-") && !n.startsWith("s-") && n !== "class")
        .map((n) => `${n}="${node.getAttribute(n)}"`).join(" "),
      inner: node.innerHTML.trim(),
    }));
    await before.close();

    const port = renderPort(tag, tsx, rootFor(css)).replace("</template>", `  <style>${convertShadowStyles(css)}</style>\n</template>`);
    const after = await ctx.newPage();
    await after.setContent(`<!doctype html><html><head><meta charset="utf8"><style>${tokens}</style></head><body>${port}<${tag} ${host.attrs}>${host.inner}</${tag}></body></html>`);
    await after.addScriptTag({ content: RUNTIME });
    await after.evaluate(() => window.HtmlRuntime.lowerDocument());
    await after.waitForTimeout(150);
    const target = after.locator(`[data-component-root~="${tag}"]`).first();
    if (await target.count() === 0) { results.push({ tag, note: "did not lower" }); await after.close(); continue; }
    const afterBuf = await target.screenshot();
    await after.close();
    const d = await diff(beforeBuf, afterBuf);
    results.push({ tag, ...d, pct: +(d.mismatch / d.total * 100).toFixed(1) });
  } catch (error) {
    results.push({ tag, note: `ERROR: ${String(error.message ?? error).split("\n")[0].slice(0, 70)}` });
  }
}
await browser.close();
server.close();

const scored = results.filter((r) => r.pct !== undefined).sort((a, b) => a.pct - b.pct);
const skipped = results.filter((r) => r.pct === undefined);
console.log(`\n=== convergence (${scored.length} rendered, ${skipped.length} skipped) ===`);
console.log("component            before      after       mismatch");
for (const r of scored) console.log(`${r.tag.padEnd(20)} ${String(r.before).padEnd(11)} ${String(r.after).padEnd(11)} ${r.pct}%`);
const buckets = { "<10%": scored.filter((r) => r.pct < 10).length, "10-25%": scored.filter((r) => r.pct >= 10 && r.pct < 25).length, ">=25%": scored.filter((r) => r.pct >= 25).length };
console.log(`\nbuckets: <10% = ${buckets["<10%"]},  10-25% = ${buckets["10-25%"]},  >=25% = ${buckets[">=25%"]}`);
console.log("\n=== skipped ===");
for (const r of skipped) console.log(`${r.tag.padEnd(20)} ${r.note}`);
