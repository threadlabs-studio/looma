// Visual-convergence harness across the full core-component corpus.
//   before = the original Stencil Shadow-DOM component from the built Storybook
//   after  = its HTML Next migration (render-derived port + converted :scope/:slotted CSS) lowered
//            by the vendored HTML Next runtime
// Auto-discovers every packages/core component that has a .tsx + .css, matches it to a Storybook
// story, derives the root element from :host display, and reports per-component overlap mismatch.
// Tooling only: it renders the migration to validate it, it does not adopt it.
import { createServer } from "node:http";
import { readFile, readdir, writeFile, mkdir, rm } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { convertShadowStyles } from "../convert-styles.mjs";
import { renderPort } from "../convert-render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOMA = join(HERE, "..", "..", "..");
const STATIC = join(LOOMA, "apps/storybook/storybook-static");
const CORE = join(LOOMA, "packages/core/src/components");
const CONTROLLERS = join(HERE, "controllers");
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

const GALLERY = join(HERE, "gallery");
await rm(GALLERY, { recursive: true, force: true });
await mkdir(GALLERY, { recursive: true });

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
    // Shift-tolerant: a pixel counts as matched if any pixel within +/-R in the other image matches.
    // This ignores small sub-pixel shifts/AA so the score reflects real visual difference, not layout jitter.
    const T = 32, R = 2;
    const near = (x, y) => {
      const i = (y * W + x) * 4;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x2 = x + dx, y2 = y + dy;
        if (x2 < 0 || y2 < 0 || x2 >= w2 || y2 >= h2) continue;
        const j = (y2 * W + x2) * 4;
        if (Math.abs(db[i] - da[j]) + Math.abs(db[i + 1] - da[j + 1]) + Math.abs(db[i + 2] - da[j + 2]) <= T) return true;
      }
      return false;
    };
    let m = 0;
    for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) if (!near(x, y)) m++;
    return { before: [ib.width, ib.height], after: [ia.width, ia.height], mismatch: m, total: w2 * h2 };
  }, { b: before.toString("base64"), a: after.toString("base64") });
  await page.close();
  return r;
}

const dirs = (await readdir(CORE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const tags = dirs.filter((t) => (only.length === 0 || only.includes(t)));

// Precompute each component's definition + controller once (keyed by tag), so a composite can pull
// in only the nested components it actually uses — injecting the whole library disrupts mounting.
const defByTag = new Map();
const ctrlByTag = new Map();
for (const tag of dirs) {
  const css = await readFile(join(CORE, tag, `${tag}.css`), "utf8").catch(() => null);
  const tsx = await readFile(join(CORE, tag, `${tag}.tsx`), "utf8").catch(() => null);
  if (css === null || tsx === null) continue;
  let port;
  try { port = renderPort(tag, tsx, rootFor(css)); } catch { continue; }
  const ctrl = await readFile(join(CONTROLLERS, `${tag}.js`), "utf8").catch(() => null);
  if (ctrl !== null) {
    port = port.replace('status="early"', `status="early" controller="./${tag}.js"`);
    ctrlByTag.set(tag, ctrl);
  }
  defByTag.set(tag, port.replace("</template>", `  <style>${convertShadowStyles(css)}</style>\n</template>`));
}
const controllerScript = (tags) => tags.filter((t) => ctrlByTag.has(t))
  .map((t) => `(function(){ ${ctrlByTag.get(t).replace(/export default function controller/, "var __c = function controller")}\n(window.__ctrls=window.__ctrls||{})[${JSON.stringify(t)}]=__c; })();`)
  .join("\n");
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

    // target + the components nested in its story markup (so composites pull in their children)
    const needed = [...new Set([tag, ...[...host.inner.matchAll(/<(ui-[\w-]+)/g)].map((m) => m[1])])].filter((t) => defByTag.has(t));
    const defs = needed.map((t) => defByTag.get(t)).join("\n");
    const ctrls = controllerScript(needed);
    const after = await ctx.newPage();
    await after.setContent(`<!doctype html><html><head><meta charset="utf8"><style>${tokens}</style></head><body>${defs}<${tag} ${host.attrs}>${host.inner}</${tag}></body></html>`);
    await after.addScriptTag({ content: RUNTIME });
    if (ctrls) {
      await after.addScriptTag({ content: ctrls });
      await after.evaluate(() => window.HtmlRuntime.observeDocument(document, {
        onConnect(root, def) {
          const c = window.__ctrls && window.__ctrls[def.contract.tag];
          if (!c) return;
          window.HtmlRuntime.setControllerModule(root, Promise.resolve({ default: c }));
          return c(window.HtmlRuntime.getComponentHost(root));
        },
      }));
      await after.waitForTimeout(400); // allow controllers + image load/error
    } else {
      await after.evaluate(() => window.HtmlRuntime.lowerDocument());
      await after.waitForTimeout(150);
    }
    const target = after.locator(`[data-component-root~="${tag}"]`).first();
    if (await target.count() === 0) { results.push({ tag, note: "did not lower" }); await after.close(); continue; }
    const afterBuf = await target.screenshot();
    await after.close();
    const d = await diff(beforeBuf, afterBuf);
    await writeFile(join(GALLERY, `${tag}.before.png`), beforeBuf);
    await writeFile(join(GALLERY, `${tag}.after.png`), afterBuf);
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

// Browsable before/after gallery.
const row = (r) => `<tr class="${r.pct < 10 ? "ok" : r.pct < 25 ? "mid" : "hi"}">
  <th>${r.tag}<br><small>${r.pct}%</small></th>
  <td><figure><figcaption>before (Shadow&nbsp;DOM)</figcaption><img src="${r.tag}.before.png"></figure></td>
  <td><figure><figcaption>after (HTML&nbsp;Next)</figcaption><img src="${r.tag}.after.png"></figure></td>
</tr>`;
const html = `<!doctype html><meta charset="utf8"><title>Looma → HTML Next convergence</title>
<style>
 body{font:14px/1.5 system-ui;margin:2rem;background:#fafafa;color:#111}
 h1{font-size:1.2rem} table{border-collapse:collapse;width:100%} td,th{border:1px solid #ddd;padding:.6rem;vertical-align:top;text-align:left}
 img{max-width:520px;display:block;background:#fff;box-shadow:0 0 0 1px #eee} figcaption{color:#666;font-size:12px;margin-bottom:.3rem}
 tr.ok th{color:#0a7d33} tr.mid th{color:#a86400} tr.hi th{color:#b00020} small{font-weight:400;color:#888}
 .skip{color:#888;margin-top:1rem}
</style>
<h1>Looma → HTML Next — before / after (${scored.length} rendered, sorted by pixel mismatch)</h1>
<table>${scored.map(row).join("")}</table>
<p class="skip"><strong>Skipped:</strong> ${skipped.map((r) => `${r.tag} (${r.note})`).join(" · ")}</p>`;
await writeFile(join(GALLERY, "index.html"), html);
console.log(`\ngallery: ${join(GALLERY, "index.html")}`);
