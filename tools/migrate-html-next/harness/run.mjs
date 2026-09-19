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

import { convertLightDomStyles } from "../convert-light-dom.mjs";
import { convertShadowStyles } from "../convert-styles.mjs";
import { discoverPorts, referencedTags } from "../discover-ports.mjs";
import { reflectedPropAttributes, renderPort } from "../convert-render.mjs";
import { rootElementFor } from "../root-element.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LOOMA = join(HERE, "..", "..", "..");
const STATIC = join(LOOMA, "apps/storybook/storybook-static");
const CORE = join(LOOMA, "packages/core/src/components");
const CONTROLLERS = join(HERE, "controllers");
const RUNTIME = await readFile(join(HERE, "..", "vendor", "html-next-runtime.iife.js"), "utf8");
const only = process.argv.slice(2); // optional tag filter
const VIEWPORTS = {
  "ui-top-bar": { width: 390, height: 700 },
};
const STORIES = {
  "ui-affordance-scope": "display-badge--default",
  "ui-context-menu": "overlay-contextmenu--default",
  "ui-editable": "display-badge--default",
  "ui-tooltip": "overlay-tooltip--open",
  "ui-tree-item": "display-tree--default",
};
const FIXTURES = {
  "ui-affordance-scope": `<ui-affordance-scope><ui-icon-button label="Action"><button type="button">Action</button></ui-icon-button></ui-affordance-scope>`,
  "ui-editable": `<ui-editable><button slot="preview" data-ui-editable-trigger type="button">Preview value</button><input slot="edit" value="Editing value"></ui-editable>`,
};
const CAPTURE_SELECTORS = {
  "ui-affordance-scope": {
    before: "ui-icon-button",
    after: `[data-component-root~="ui-icon-button"]`,
  },
  "ui-context-menu": {
    before: "ui-menu",
    after: `[data-component-root~="ui-menu"]`,
  },
  "ui-dialog": "dialog[open]",
};
const FORCE_OPEN = new Set(["ui-context-menu", "ui-dialog", "ui-menu", "ui-menu-item", "ui-tooltip"]);

// Map each component tag to a representative story id (prefer a "default"/"info"/"tag" story).
const index = JSON.parse(await readFile(join(STATIC, "index.json"), "utf8"));
const stories = Object.values(index.entries).filter((s) => s.type === "story");
function storyFor(tag) {
  if (STORIES[tag]) return STORIES[tag];
  const name = tag.replace(/^ui-/, "");
  const matches = stories.filter((s) => s.id.includes(`-${name}--`) || s.id.startsWith(`${name}--`));
  if (matches.length === 0) return undefined;
  return (matches.find((s) => /--(default|info|tag|basic)$/.test(s.id)) ?? matches[0]).id;
}

const tokens = (await Promise.all([
  "packages/tokens/src/tokens.css", "packages/tokens/src/theme-light.css",
  "packages/layout/src/layout.css",
].map((f) => readFile(join(LOOMA, f), "utf8").catch(() => "")))).join("\n");
const compatibility = convertLightDomStyles(await readFile(join(LOOMA, "packages/core/src/styles.css"), "utf8"));
const previewStyles = await readFile(join(LOOMA, "apps/storybook/.storybook/preview.css"), "utf8");
// Keep preview.css first, as Storybook does: its external font @import is invalid after any other
// rule, and fallback-font geometry makes repeated labels look like component layout drift.
const pageStyles = [previewStyles, tokens, compatibility].join("\n");

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
    const db = px(ib), da = px(ia);
    // Shift-tolerant: a pixel counts as matched if any pixel within +/-R in the other image matches.
    // This ignores small sub-pixel shifts/AA so the score reflects real visual difference, not layout jitter.
    const T = 32, R = 2;
    const near = (x, y) => {
      const i = (y * W + x) * 4;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const x2 = x + dx, y2 = y + dy;
        if (x2 < 0 || y2 < 0 || x2 >= ia.width || y2 >= ia.height) continue;
        const j = (y2 * W + x2) * 4;
        if (Math.abs(db[i] - da[j]) + Math.abs(db[i + 1] - da[j + 1]) + Math.abs(db[i + 2] - da[j + 2]) <= T) return true;
      }
      return false;
    };
    let m = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!near(x, y)) m++;
    return { before: [ib.width, ib.height], after: [ia.width, ia.height], mismatch: m, total: W * H };
  }, { b: before.toString("base64"), a: after.toString("base64") });
  await page.close();
  return r;
}

const dirs = (await readdir(CORE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
const tags = dirs.filter((t) => (only.length === 0 || only.includes(t)));
const results = [];
const debugSnapshot = (node) => {
  const target = node.shadowRoot?.firstElementChild ?? node.firstElementChild ?? node;
  const rootStyle = getComputedStyle(node);
  const rootRect = node.getBoundingClientRect();
  const style = getComputedStyle(target);
  const rect = target.getBoundingClientRect();
  return {
    html: node.outerHTML,
    root: {
      rect: { width: rootRect.width, height: rootRect.height },
      display: rootStyle.display,
      inlineSize: rootStyle.inlineSize,
      maxInlineSize: rootStyle.maxInlineSize,
      overflow: rootStyle.overflow,
      padding: rootStyle.padding,
      border: rootStyle.border,
    },
    target: target.outerHTML,
    rect: { width: rect.width, height: rect.height },
    style: {
      display: style.display,
      boxSizing: style.boxSizing,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      padding: style.padding,
      border: style.border,
    },
  };
};
for (const tag of tags) {
  try {
    const css = await readFile(join(CORE, tag, `${tag}.css`), "utf8").catch(() => null);
    const tsx = await readFile(join(CORE, tag, `${tag}.tsx`), "utf8").catch(() => null);
    if (css === null || tsx === null) { results.push({ tag, note: "no .tsx/.css" }); continue; }
    const story = storyFor(tag);
    if (story === undefined) { results.push({ tag, note: "no story" }); continue; }

    const before = await ctx.newPage();
    await before.setViewportSize(VIEWPORTS[tag] ?? { width: 1000, height: 700 });
    await before.goto(`${base}/iframe.html?id=${story}&viewMode=story`, { waitUntil: "networkidle" });
    if (FIXTURES[tag]) {
      await before.evaluate(({ fixture }) => {
        const root = document.querySelector("#storybook-root");
        if (root) root.innerHTML = fixture;
      }, { fixture: FIXTURES[tag] });
    }
    await before.waitForSelector(`${tag}, ${tag}.hydrated`, { timeout: 8000 }).catch(() => {});
    await before.waitForTimeout(400);
    const el = before.locator(tag).first();
    if (await el.count() === 0) { results.push({ tag, note: "component not in story" }); await before.close(); continue; }
    if (FORCE_OPEN.has(tag)) {
      await el.evaluate((node, componentTag) => {
        const target = componentTag === "ui-menu-item" ? node.closest("ui-menu") : node;
        target?.setAttribute("open", "");
      }, tag);
      await before.waitForTimeout(300);
    }
    const capture = CAPTURE_SELECTORS[tag];
    const beforeCaptureSelector = typeof capture === "string" ? capture : capture?.before;
    const beforeVisual = beforeCaptureSelector ? el.locator(beforeCaptureSelector).first() : el;
    const box = await beforeVisual.boundingBox();
    if (box === null || box.width < 1 || box.height < 1) { results.push({ tag, note: "no visible box (controller-driven?)" }); await before.close(); continue; }
    const beforeBuf = await beforeVisual.screenshot();
    const host = await el.evaluate((node) => ({
      attrs: node.getAttributeNames().filter((n) => !n.startsWith("data-") && !n.startsWith("s-") && n !== "class")
        .map((n) => `${n}="${node.getAttribute(n)}"`).join(" "),
      inner: node.innerHTML.trim(),
    }));
    if (process.env.MIGRATION_DEBUG) {
      console.log("before", await el.evaluate(debugSnapshot));
    }
    await before.close();

    // Composite components nest other component tags (e.g. avatar-group nests avatars); each
    // nested tag needs its own port + controller to lower and converge. Build a port for the
    // top tag plus every ui-* tag that appears in the story markup.
    const portFor = async (t) => {
      const c = await readFile(join(CORE, t, `${t}.css`), "utf8").catch(() => null);
      const x = await readFile(join(CORE, t, `${t}.tsx`), "utf8").catch(() => null);
      if (c === null || x === null) return null;
      const ctrl = await readFile(join(CONTROLLERS, `${t}.js`), "utf8").catch(() => null);
      const rendered = renderPort(t, x, rootElementFor(c));
      const end = rendered.lastIndexOf("</template>");
      const p = `${rendered.slice(0, end)}  <style>${convertShadowStyles(c, { reflectedAttributes: reflectedPropAttributes(x) })}</style>\n${rendered.slice(end)}`;
      return { tag: t, port: p, ctrl };
    };
    const childTags = referencedTags(host.inner).filter((childTag) => childTag !== tag);
    const parts = await discoverPorts([tag, ...childTags], portFor);
    const ctrls = Object.fromEntries(parts.filter((p) => p.ctrl).map((p) => [p.tag, p.ctrl]));
    const portsHtml = parts.map((p) => p.port).join("\n");

    const after = await ctx.newPage();
    const runtimeErrors = [];
    after.on("pageerror", (error) => runtimeErrors.push(error.message));
    after.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    await after.setViewportSize(VIEWPORTS[tag] ?? { width: 1000, height: 700 });
    // Match Storybook's canvas padding (1rem) so full-width components have the same available
    // width — otherwise right-aligned content (e.g. avatar-group) shifts by the padding delta.
    // Preserve the containing width supplied by the representative story. Block components such
    // as tree rows otherwise expand from their story's constrained column to the full test canvas,
    // measuring a missing parent layout rather than the component migration.
    await after.setContent(`<!doctype html><html><head><meta charset="utf8"><style>${pageStyles}\nbody{margin:0;padding:1rem}</style></head><body>${portsHtml}<div data-migration-frame style="inline-size:${box.width}px"><${tag} ${host.attrs}>${host.inner}</${tag}></div></body></html>`);
    await after.evaluate(() => document.fonts.ready);
    await after.addScriptTag({ content: RUNTIME });
    // Import controllers as real ES modules (blob URLs) and wire each by tag — nothing is
    // stashed on window. Always observe, even when this graph has no controller: a lowered parent
    // can generate another component invocation that must be discovered in the next mutation turn.
    await after.evaluate(async (srcByTag) => {
      const mods = {};
      for (const [t, src] of Object.entries(srcByTag)) {
        const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
        mods[t] = (await import(url)).default;
      }
      window.HtmlRuntime.observeDocument(document, {
        onConnect(root, def) {
          const fn = mods[def.contract.tag];
          if (!fn) return;
          window.HtmlRuntime.setControllerModule(root, Promise.resolve({ default: fn }));
          return fn(window.HtmlRuntime.getComponentHost(root));
        },
      });
    }, ctrls);
    await after.waitForTimeout(400); // allow recursive lowering, controllers, and image load/error
    if (runtimeErrors.length > 0) throw new Error(runtimeErrors.join(" | "));
    const target = after.locator(`[data-component-root~="${tag}"]`).first();
    if (await target.count() === 0) { results.push({ tag, note: "did not lower" }); await after.close(); continue; }
    if (process.env.MIGRATION_DEBUG) console.log("after", await target.evaluate(debugSnapshot));
    const afterCaptureSelector = typeof capture === "string" ? capture : capture?.after;
    const afterVisual = afterCaptureSelector ? target.locator(afterCaptureSelector).first() : target;
    if (await afterVisual.count() === 0) { results.push({ tag, note: "capture target missing" }); await after.close(); continue; }
    const afterBuf = await afterVisual.screenshot();
    await after.close();
    const d = await diff(beforeBuf, afterBuf);
    await writeFile(join(GALLERY, `${tag}.before.png`), beforeBuf);
    await writeFile(join(GALLERY, `${tag}.after.png`), afterBuf);
    results.push({ tag, ...d, pct: +(d.mismatch / d.total * 100).toFixed(1) });
  } catch (error) {
    results.push({ tag, note: `ERROR: ${String(error.message ?? error).split("\n")[0].slice(0, 240)}` });
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
