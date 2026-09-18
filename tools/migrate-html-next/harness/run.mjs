// Visual-convergence harness: render each component two ways and diff, clipped to the component.
//   before = the original Stencil Shadow-DOM component from the built Storybook
//   after  = its HTML Next migration (passthrough port + converted :scope/:slotted CSS) lowered by
//            the vendored HTML Next runtime
// Reports per-component overlap pixel-mismatch. Tooling only; it renders the migration, it does not
// adopt it into the shipped component set.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { convertShadowStyles } from "../convert-styles.mjs";
import { passthroughPort } from "../convert-template.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOMA = join(HERE, "..", "..", "..");
const STATIC = join(LOOMA, "apps/storybook/storybook-static");
const RUNTIME = await readFile(join(HERE, "..", "vendor", "html-next-runtime.iife.js"), "utf8");

const COMPONENTS = [
  { tag: "ui-button", story: "forms-button--default", root: "span" },
  { tag: "ui-badge", story: "display-badge--default", root: "span" },
  { tag: "ui-chip", story: "display-chip--tag", root: "span" },
  { tag: "ui-callout", story: "display-callout--info", root: "div" },
  { tag: "ui-icon-button", story: "forms-icon-button--default", root: "span" },
];

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
const ctx = await browser.newContext({ viewport: { width: 900, height: 600 }, deviceScaleFactor: 2 });

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

const results = [];
for (const c of COMPONENTS) {
  try {
    const shadowCss = await readFile(join(LOOMA, `packages/core/src/components/${c.tag}/${c.tag}.css`), "utf8");
    // before
    const before = await ctx.newPage();
    await before.goto(`${base}/iframe.html?id=${c.story}&viewMode=story`, { waitUntil: "networkidle" });
    await before.waitForSelector(`${c.tag}.hydrated, ${c.tag}`);
    await before.waitForTimeout(400);
    const el = before.locator(c.tag).first();
    const beforeBuf = await el.screenshot();
    const host = await el.evaluate((node) => ({
      attrs: node.getAttributeNames().filter((n) => !n.startsWith("data-") && !n.startsWith("s-") && n !== "class")
        .map((n) => `${n}="${node.getAttribute(n)}"`).join(" "),
      inner: node.innerHTML.trim(),
    }));
    await before.close();
    // after
    const css = convertShadowStyles(shadowCss);
    const port = passthroughPort(c.tag, shadowCss, c.root).replace("</template>", `  <style>${css}</style>\n</template>`);
    const after = await ctx.newPage();
    await after.setContent(`<!doctype html><html><head><meta charset="utf8"><style>${tokens}</style></head><body>${port}<${c.tag} ${host.attrs}>${host.inner}</${c.tag}></body></html>`);
    await after.addScriptTag({ content: RUNTIME });
    await after.evaluate(() => window.HtmlRuntime.lowerDocument());
    await after.waitForTimeout(150);
    const afterBuf = await after.locator(`[data-component-root~="${c.tag}"]`).first().screenshot();
    await after.close();
    const d = await diff(beforeBuf, afterBuf);
    results.push({ tag: c.tag, ...d, pct: +(d.mismatch / d.total * 100).toFixed(1) });
  } catch (error) {
    results.push({ tag: c.tag, error: String(error.message ?? error).split("\n")[0] });
  }
}

await browser.close();
server.close();
console.log("\ncomponent          before      after       overlap-mismatch");
for (const r of results) {
  if (r.error) console.log(`${r.tag.padEnd(18)} ERROR: ${r.error}`);
  else console.log(`${r.tag.padEnd(18)} ${String(r.before).padEnd(11)} ${String(r.after).padEnd(11)} ${r.pct}%`);
}
