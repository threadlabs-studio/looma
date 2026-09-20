import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(HERE, "..");
const LOOMA = join(MIGRATION, "..", "..");
const LEGACY_LOOMA = process.env.LOOMA_LEGACY_ROOT
  ? resolve(process.env.LOOMA_LEGACY_ROOT)
  : LOOMA;
const GENERATED = join(MIGRATION, "generated", "editor");
const CONTROLLERS = join(HERE, "controllers");
const manifest = JSON.parse(await readFile(join(GENERATED, "manifest.json"), "utf8"));
const runtime = await readFile(join(MIGRATION, "vendor", "html-next-runtime.iife.js"), "utf8");
const definitions = (await Promise.all(manifest.components.map(({ tag }) =>
  readFile(join(GENERATED, "components", `${tag}.html`), "utf8"))))
  .map((source) => source.replace(/^<link\s+rel="component"[^>]*>\s*$/gm, ""))
  .join("\n");
const editorCss = await readFile(join(LEGACY_LOOMA, "packages", "editor", "src", "editor.css"), "utf8");
const migratedCss = await readFile(join(GENERATED, "styles.css"), "utf8");
const readTokens = (root) => Promise.all([
  "packages/tokens/src/tokens.css", "packages/tokens/src/theme-light.css",
].map((file) => readFile(join(root, file), "utf8"))).then((styles) => styles.join("\n"));
const [legacyTokens, migratedTokens] = await Promise.all([
  readTokens(LEGACY_LOOMA),
  readTokens(LOOMA),
]);
const baselineSource = [
  'import "./packages/editor/src/toolbar.ts";',
  'import "./packages/editor/src/insert-table-grid.ts";',
  'import "./packages/editor/src/slash-menu.ts";',
  'import "./packages/editor/src/mention-menu.ts";',
  'import "./packages/editor/src/table-context-menu.ts";',
  'import "./packages/editor/src/table-toolbar.ts";',
  'import "./packages/editor/src/table-overlay.ts";',
].join("\n");
const baselineBundle = execFileSync(join(LOOMA, "packages", "editor", "node_modules", ".bin", "esbuild"), [
  "--bundle", "--format=esm", "--platform=browser", "--sourcefile=editor-migration-baseline.ts",
], { cwd: LEGACY_LOOMA, encoding: "utf8", input: baselineSource });
const mime = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const controllerPrefix = "/__controllers__/";
    const repositoryPrefix = "/__repo__/";
    if (pathname === "/__baseline__.js") {
      response.writeHead(200, { "content-type": "text/javascript" });
      response.end(baselineBundle);
      return;
    }
    let requested;
    let root;
    if (pathname.startsWith(controllerPrefix)) {
      root = resolve(CONTROLLERS);
      requested = resolve(root, pathname.slice(controllerPrefix.length));
    } else if (pathname.startsWith(repositoryPrefix)) {
      root = resolve(LOOMA);
      requested = resolve(root, pathname.slice(repositoryPrefix.length));
    } else {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<!doctype html><title>Editor migration harness</title>");
      return;
    }
    if (!requested.startsWith(`${root}${sep}`)) throw new Error("path escape");
    response.writeHead(200, { "content-type": mime[extname(requested)] ?? "application/octet-stream" });
    response.end(await readFile(requested));
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});
await new Promise((resolveServer) => server.listen(0, resolveServer));
const base = `http://localhost:${server.address().port}`;

const capabilities = [
  "can-add-row-before", "can-add-row-after", "can-add-column-before", "can-add-column-after",
  "can-delete-row", "can-delete-column", "can-delete-table", "can-merge-cells", "can-split-cell",
].join(" ");
const fixtures = {
  "ui-editor-toolbar": {
    children: "<button type=\"button\">Bold</button><button type=\"button\">Italic</button>",
  },
  "ui-editor-insert-table-grid": { attributes: "open max-rows=\"6\" max-cols=\"6\"" },
  "ui-editor-slash-menu": {
    properties: {
      open: true,
      query: "hea",
      selectedIndex: 1,
      anchorRect: { left: 40, top: 32, right: 60, bottom: 52 },
      items: [
        { title: "Paragraph", description: "Start writing with plain text", icon: "pilcrow" },
        { title: "Heading 1", description: "Large section heading", icon: "heading-1" },
        { title: "Quote", description: "Capture a quotation", icon: "quote" },
      ],
    },
  },
  "ui-editor-mention-menu": {
    properties: {
      open: true,
      query: "ma",
      selectedIndex: 1,
      anchorRect: { left: 40, top: 32, right: 60, bottom: 52 },
      items: [
        { id: "1", label: "Marie Curie", detail: "Physics", initials: "MC" },
        { id: "2", label: "Margaret Hamilton", detail: "Engineering", initials: "MH" },
        { id: "3", label: "Mae Jemison", detail: "Astronaut", initials: "MJ" },
      ],
    },
  },
  "ui-editor-table-context-menu": { attributes: `open cell-background="#dbeafe" ${capabilities}` },
  "ui-editor-table-toolbar": { attributes: `open cell-alignment="center" cell-background="#dbeafe" ${capabilities}` },
  "ui-editor-table-overlay": {
    attributes: "open rows=\"3\" cols=\"4\" row-boundaries=\"0,60,120,180\" column-boundaries=\"0,100,200,300,400\" active-cell=\"100,60,100,60,1,1\" hovered-cell=\"200,120,100,60,2,2\" style=\"display:block;position:relative;width:400px;height:180px\"",
  },
};
const visualSurface = {
  "ui-editor-insert-table-grid": ".ui-editor-insert-table-grid",
  "ui-editor-slash-menu": ".ui-editor-slash-menu",
  "ui-editor-mention-menu": ".ui-editor-mention-menu",
  "ui-editor-table-context-menu": ".ui-editor-table-context-menu",
  "ui-editor-table-toolbar": ".ui-editor-table-toolbar",
};
const requestedTags = new Set(process.argv.slice(2));
const components = requestedTags.size
  ? manifest.components.filter(({ tag }) => requestedTags.has(tag))
  : manifest.components;

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

async function applyProperties(page, tag, properties = {}) {
  await page.evaluate(({ componentTag, values }) => {
    const element = document.querySelector(componentTag);
    for (const [name, value] of Object.entries(values)) element[name] = value;
  }, { componentTag: tag, values: properties });
}

const results = [];
try {
  for (const { tag, controller } of components) {
    const fixture = fixtures[tag];
    const invocation = `<${tag} ${fixture.attributes ?? ""}>${fixture.children ?? ""}</${tag}>`;
    const pageStyle = "body{margin:0;padding:1rem;font-family:var(--ui-font-family-sans);color:var(--ui-text-primary)}";

    const beforePage = await context.newPage();
    await beforePage.goto(base);
    const beforeErrors = [];
    beforePage.on("pageerror", (error) => beforeErrors.push(error.message));
    await beforePage.setContent(`<!doctype html><style>${legacyTokens}\n${pageStyle}\n${editorCss}</style><script type="module">import "${base}/__baseline__.js";</script>${invocation}`);
    await beforePage.evaluate((componentTag) => Promise.race([
      customElements.whenDefined(componentTag),
      new Promise((_, reject) => setTimeout(() => reject(new Error(
        `${componentTag} is not registered by the baseline. After adoption, set LOOMA_LEGACY_ROOT to a checkout of the migration base.`,
      )), 5_000)),
    ]), tag);
    await applyProperties(beforePage, tag, fixture.properties);
    await beforePage.waitForTimeout(50);
    if (beforeErrors.length) throw new Error(`${tag} baseline: ${beforeErrors.join(" | ")}`);
    const beforeNode = beforePage.locator(visualSurface[tag] ?? tag).first();
    if (process.env.MIGRATION_DEBUG) console.log("capturing before", tag, await beforeNode.boundingBox());
    const beforeImage = await beforeNode.screenshot();
    if (process.env.MIGRATION_DEBUG) console.log("before", tag, await beforeNode.evaluate((element) => element.outerHTML));
    await beforePage.close();

    const afterPage = await context.newPage();
    const errors = [];
    afterPage.on("pageerror", (error) => errors.push(error.message));
    await afterPage.goto(base);
    await afterPage.setContent(`<!doctype html><style>${migratedTokens}\n${pageStyle}\n${migratedCss}</style>${definitions}${invocation}`);
    await applyProperties(afterPage, tag, fixture.properties);
    await afterPage.addScriptTag({ content: runtime });
    await afterPage.evaluate(async ({ componentTag, controllerUrl }) => {
      const module = await import(controllerUrl);
      window.HtmlRuntime.observeDocument(document, {
        onConnect(root, definition) {
          if (definition.contract.tag !== componentTag) return;
          window.HtmlRuntime.setControllerModule(root, Promise.resolve(module));
          return module.default(window.HtmlRuntime.getComponentHost(root));
        },
      });
    }, { componentTag: tag, controllerUrl: `${base}/__controllers__/${controller}` });
    await afterPage.waitForTimeout(50);
    if (errors.length) throw new Error(`${tag}: ${errors.join(" | ")}`);
    const afterNode = afterPage.locator(visualSurface[tag] ?? `[data-component-root~="${tag}"]`).first();
    if (process.env.MIGRATION_DEBUG) console.log("capturing after", tag, await afterNode.boundingBox());
    const afterImage = await afterNode.screenshot();
    if (process.env.MIGRATION_DEBUG) console.log("after", tag, await afterNode.evaluate((element) => element.outerHTML));
    const comparison = await mismatch(beforeImage, afterImage);
    results.push({ tag, ...comparison, ratio: comparison.changed / comparison.total });
    await afterPage.close();
  }
} finally {
  await browser.close();
  server.close();
}

for (const result of results) {
  console.log(`${result.tag.padEnd(31)} ${(result.ratio * 100).toFixed(1)}% ${result.before.join("x")} -> ${result.after.join("x")}`);
}
const failures = results.filter(({ ratio }) => ratio >= 0.01);
if (failures.length) throw new Error(`${failures.length}/${results.length} editor components exceed 1% mismatch.`);
console.log(`Validated ${results.length} HTML Next editor components under 1% mismatch.`);
