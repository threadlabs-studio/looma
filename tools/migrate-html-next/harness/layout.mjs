import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(HERE, "..");
const LOOMA = join(MIGRATION, "..", "..");
const STATIC = join(LOOMA, "apps", "storybook", "storybook-static");
const GENERATED = join(MIGRATION, "generated", "layout");
const CORE_GENERATED = join(MIGRATION, "generated", "core");
const CONTROLLERS = join(HERE, "controllers");
const manifest = JSON.parse(await readFile(join(GENERATED, "manifest.json"), "utf8"));
const coreManifest = JSON.parse(await readFile(join(CORE_GENERATED, "manifest.json"), "utf8"));
const runtime = await readFile(join(MIGRATION, "vendor", "html-next-runtime.iife.js"), "utf8");
const componentSources = [
  ...manifest.components.map(({ tag }) => [GENERATED, tag]),
  ...coreManifest.components.map(({ tag }) => [CORE_GENERATED, tag]),
];
const definitions = (await Promise.all(componentSources.map(([directory, tag]) =>
  readFile(join(directory, "components", `${tag}.html`), "utf8"))))
  .map((source) => source.replace(/^<link\s+rel="component"[^>]*>\s*$/gm, ""))
  .join("\n");
const controllerUrls = Object.fromEntries([...manifest.components, ...coreManifest.components]
  .filter(({ controller }) => controller)
  .map(({ tag, controller }) => [tag, controller]));
const layoutCss = await readFile(join(GENERATED, "styles.css"), "utf8");
const previewCss = await readFile(join(LOOMA, "apps", "storybook", ".storybook", "preview.css"), "utf8");
const tokens = (await Promise.all([
  "packages/tokens/src/tokens.css", "packages/tokens/src/theme-light.css",
].map((file) => readFile(join(LOOMA, file), "utf8")))).join("\n");
const mime = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const controllerPrefix = "/__controllers__/";
    const requested = pathname.startsWith(controllerPrefix)
      ? resolve(CONTROLLERS, pathname.slice(controllerPrefix.length))
      : join(STATIC, pathname === "/" ? "index.html" : pathname);
    if (pathname.startsWith(controllerPrefix) && !requested.startsWith(`${resolve(CONTROLLERS)}${sep}`)) {
      throw new Error("controller path escape");
    }
    response.writeHead(200, {
      "content-type": mime[extname(requested)] ?? "application/octet-stream",
      ...(pathname.startsWith(controllerPrefix) ? { "access-control-allow-origin": "*" } : {}),
    });
    response.end(await readFile(requested));
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});
await new Promise((resolveServer) => server.listen(0, resolveServer));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });

async function mismatch(before, after) {
  const page = await context.newPage();
  const result = await page.evaluate(async ({ beforeData, afterData }) => {
    const load = (source) => new Promise((resolveImage) => {
      const image = new Image(); image.onload = () => resolveImage(image); image.src = source;
    });
    const beforeImage = await load(`data:image/png;base64,${beforeData}`);
    const afterImage = await load(`data:image/png;base64,${afterData}`);
    const width = Math.max(beforeImage.width, afterImage.width);
    const height = Math.max(beforeImage.height, afterImage.height);
    const pixels = (image) => {
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0);
      return canvas.getContext("2d").getImageData(0, 0, width, height).data;
    };
    const left = pixels(beforeImage); const right = pixels(afterImage); let changed = 0;
    const matches = (x, y) => {
      const index = (y * width + x) * 4;
      for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
        const nextX = x + dx; const nextY = y + dy;
        if (nextX < 0 || nextY < 0 || nextX >= afterImage.width || nextY >= afterImage.height) continue;
        const next = (nextY * width + nextX) * 4;
        if (Math.abs(left[index] - right[next]) + Math.abs(left[index + 1] - right[next + 1]) + Math.abs(left[index + 2] - right[next + 2]) <= 32) return true;
      }
      return false;
    };
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) if (!matches(x, y)) changed += 1;
    return { changed, total: width * height, before: [beforeImage.width, beforeImage.height], after: [afterImage.width, afterImage.height] };
  }, { beforeData: before.toString("base64"), afterData: after.toString("base64") });
  await page.close();
  return result;
}

const results = [];
try {
  for (const { tag } of manifest.components) {
    const story = `layout-${tag.slice(3)}--default`;
    const beforePage = await context.newPage();
    await beforePage.goto(`${base}/iframe.html?id=${story}&viewMode=story`, { waitUntil: "networkidle" });
    const beforeNode = beforePage.locator(tag).first();
    await beforeNode.waitFor({ state: "attached" });
    if (tag === "ui-separator") {
      await beforeNode.evaluate((element) => { element.style.inlineSize = "200px"; });
    }
    const box = await beforeNode.boundingBox();
    const invocation = await beforeNode.evaluate((element) => ({
      attributes: element.getAttributeNames().map((name) => `${name}="${element.getAttribute(name)}"`).join(" "),
      children: element.innerHTML,
    }));
    const beforeImage = await beforeNode.screenshot();
    if (process.env.MIGRATION_DEBUG) console.log("before", tag, await beforeNode.evaluate((element) => ({ html: element.outerHTML, style: getComputedStyle(element).cssText, rect: element.getBoundingClientRect().toJSON(), font: getComputedStyle(element).font, padding: getComputedStyle(element).padding })));
    await beforePage.close();

    const afterPage = await context.newPage();
    const errors = [];
    afterPage.on("pageerror", (error) => errors.push(error.message));
    const frameWidth = tag === "ui-center" || tag === "ui-separator" ? 968 : box.width;
    const invocationMarkup = `<${tag} ${invocation.attributes}>${invocation.children}</${tag}>`;
    const fixture = tag === "ui-separator"
      ? `<div style="display:flex;align-items:center;gap:1rem"><span>Before</span>${invocationMarkup}<span>After</span></div>`
      : invocationMarkup;
    await afterPage.setContent(`<!doctype html><style>${previewCss}\n${tokens}\n${layoutCss}\nbody{margin:0;padding:1rem}</style>${definitions}<div style="inline-size:${frameWidth}px">${fixture}</div>`);
    await afterPage.addScriptTag({ content: runtime });
    await afterPage.evaluate(async (urls) => {
      const modules = {};
      for (const [componentTag, url] of Object.entries(urls)) modules[componentTag] = await import(url);
      window.HtmlRuntime.observeDocument(document, {
        onConnect(root, definition) {
          const module = modules[definition.contract.tag];
          if (!module) return;
          window.HtmlRuntime.setControllerModule(root, Promise.resolve(module));
          return module.default(window.HtmlRuntime.getComponentHost(root));
        },
      });
    }, Object.fromEntries(Object.entries(controllerUrls).map(([componentTag, file]) =>
      [componentTag, `${base}/__controllers__/${file}`])));
    await afterPage.waitForTimeout(50);
    if (errors.length) throw new Error(errors.join(" | "));
    const afterNode = afterPage.locator(`[data-component-root~="${tag}"]`).first();
    if (process.env.MIGRATION_DEBUG) console.log("after", tag, await afterNode.evaluate((element) => ({ html: element.outerHTML, style: getComputedStyle(element).cssText, rect: element.getBoundingClientRect().toJSON(), font: getComputedStyle(element).font, padding: getComputedStyle(element).padding })));
    const afterImage = await afterNode.screenshot();
    const comparison = await mismatch(beforeImage, afterImage);
    results.push({ tag, ...comparison, ratio: comparison.changed / comparison.total });
    await afterPage.close();
  }
} finally {
  await browser.close();
  server.close();
}

for (const result of results) {
  console.log(`${result.tag.padEnd(18)} ${(result.ratio * 100).toFixed(1)}% ${result.before.join("x")} -> ${result.after.join("x")}`);
}
const failures = results.filter(({ ratio }) => ratio >= 0.01);
if (failures.length) throw new Error(`${failures.length}/${results.length} layout components exceed 1% mismatch.`);
console.log(`Validated ${results.length} HTML Next layout components under 1% mismatch.`);
