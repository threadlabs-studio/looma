import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(HERE, "..");
const generatedPackages = ["core", "layout", "editor"].map((name) => join(MIGRATION, "generated", name));
const CONTROLLERS = join(HERE, "controllers");
const manifests = await Promise.all(generatedPackages.map(async (directory) => ({
  directory,
  manifest: JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
})));
const components = manifests.flatMap(({ directory, manifest }) =>
  manifest.components.map((component) => ({ ...component, directory })));
const runtime = await readFile(join(MIGRATION, "vendor", "html-next-runtime.iife.js"), "utf8");
const editorStyles = await readFile(join(MIGRATION, "generated", "editor", "styles.css"), "utf8");
const definitions = (await Promise.all(components.map(async ({ tag, directory }) =>
  readFile(join(directory, "components", `${tag}.html`), "utf8"))))
  .map((source) => source.replace(/^<link\s+rel="component"[^>]*>\s*$/gm, ""))
  .join("\n");

const mime = { ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html" });
      response.end("<!doctype html><title>Looma interaction harness</title>");
      return;
    }
    const requested = resolve(CONTROLLERS, pathname.slice(1));
    if (!requested.startsWith(`${resolve(CONTROLLERS)}${sep}`)) throw new Error("path escape");
    response.writeHead(200, {
      "content-type": mime[extname(requested)] ?? "application/octet-stream",
      "access-control-allow-origin": "*",
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
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
page.setDefaultTimeout(3_000);
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(message.text());
});

await page.goto(base);
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${editorStyles}</style>${definitions}<main id="fixture"></main>`);
await page.addScriptTag({ content: runtime });
const controllerUrls = Object.fromEntries(components
  .filter(({ controller }) => controller !== null)
  .map(({ tag, controller }) => [tag, `${base}/${controller}`]));
await page.evaluate(async ({ urls, events }) => {
  window.__loomaEvents = [];
  for (const name of events) document.addEventListener(name, (event) => {
    window.__loomaEvents.push({ name, detail: event.detail ?? null });
  });
  const controllers = {};
  for (const [tag, url] of Object.entries(urls)) controllers[tag] = await import(url);
  window.__stopLooma = window.HtmlRuntime.observeDocument(document, {
    onConnect(root, definition) {
      const module = controllers[definition.contract.tag];
      if (!module) return;
      window.HtmlRuntime.setControllerModule(root, Promise.resolve(module));
      return module.default(window.HtmlRuntime.getComponentHost(root));
    },
  });
}, {
  urls: controllerUrls,
  events: [
    "input", "change", "select", "open", "close", "edit-change", "value-change",
    "query-change", "validation-change", "dismiss", "expand", "reorder", "reorder-rejected", "resize",
    "looma-editor-slash-menu-highlight", "looma-editor-slash-menu-select",
    "looma-editor-mention-menu-highlight", "looma-editor-mention-menu-select",
    "looma-editor-insert-table", "looma-editor-table-action", "looma-editor-table-overlay-action",
  ],
});

async function mount(markup, props = {}) {
  await page.evaluate(({ source, componentProps }) => {
    window.__loomaEvents.length = 0;
    const fixture = document.querySelector("#fixture");
    const template = document.createElement("template");
    template.innerHTML = source;
    const invocation = template.content.firstElementChild;
    Object.assign(invocation, componentProps);
    fixture.replaceChildren(template.content);
  }, { source: markup, componentProps: props });
  await page.waitForTimeout(50);
  if (pageErrors.length) throw new Error(pageErrors.splice(0).join(" | "));
}

async function events(name) {
  return page.evaluate((eventName) => window.__loomaEvents.filter((event) => event.name === eventName), name);
}

async function debugFixture(label) {
  if (process.env.MIGRATION_DEBUG) {
    console.log(label, await page.locator("#fixture").innerHTML(), await page.evaluate(() => window.__loomaEvents));
  }
}

const results = [];
const only = process.argv.slice(2);
async function check(name, run) {
  if (only.length && !only.some((filter) => name.includes(filter))) return;
  try {
    await run();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

await check("checkbox uncontrolled change", async () => {
  await mount(`<ui-checkbox value="terms"><input type="checkbox"> Accept</ui-checkbox>`);
  const root = page.locator('[data-component-root~="ui-checkbox"]');
  await root.locator("input").click();
  assert.equal(await root.getAttribute("aria-checked"), "true");
  assert.deepEqual((await events("change")).findLast(({ detail }) => detail !== null)?.detail, {
    checked: true,
    value: "terms",
    trigger: "programmatic",
  });
});

await check("switch keyboard activation", async () => {
  await mount(`<ui-switch>Power</ui-switch>`);
  const root = page.locator('[data-component-root~="ui-switch"]');
  await root.focus();
  await root.press("Space");
  assert.equal(await root.getAttribute("aria-checked"), "true");
  assert.equal((await events("change")).at(-1)?.detail.trigger, "keyboard");
});

await check("radio group selection and roving state", async () => {
  await mount(`<ui-radio-group value="starter" name="plan">
    <ui-radio value="starter"><input type="radio">Starter</ui-radio>
    <ui-radio value="pro"><input type="radio">Pro</ui-radio>
  </ui-radio-group>`);
  const radios = page.locator('[data-component-root~="ui-radio"]');
  await radios.nth(1).locator("input").click();
  assert.equal(await radios.nth(0).getAttribute("aria-checked"), "false");
  assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true");
  assert.equal((await events("select")).at(-1)?.detail.value, "pro");
});

await check("native input/select/textarea bridges", async () => {
  await mount(`<div>
    <ui-input><input value=""></ui-input>
    <ui-select><select><option value="a">A</option><option value="b">B</option></select></ui-select>
    <ui-textarea rows="3"><textarea></textarea></ui-textarea>
  </div>`);
  await page.locator('[data-component-root~="ui-input"] input').fill("hello");
  await page.locator('[data-component-root~="ui-select"] select').selectOption("b");
  await page.locator('[data-component-root~="ui-textarea"] textarea').fill("notes");
  const inputEvents = await events("input");
  assert.equal(inputEvents.some(({ detail }) => detail?.value === "hello"), true);
  assert.equal(inputEvents.some(({ detail }) => detail?.value === "b"), true);
  assert.equal(inputEvents.some(({ detail }) => detail?.value === "notes"), true);
  assert.equal(await page.locator('[data-component-root~="ui-textarea"] textarea').getAttribute("rows"), "3");
});

await check("disclosure open and close", async () => {
  await mount(`<ui-disclosure><button data-ui-disclosure-trigger>Details</button><section>Body</section></ui-disclosure>`);
  const root = page.locator('[data-component-root~="ui-disclosure"]');
  const button = root.locator("button");
  const content = root.locator("section");
  assert.equal(await content.isHidden(), true);
  await button.click();
  assert.equal(await content.isVisible(), true);
  assert.equal((await events("open")).at(-1)?.detail.open, true);
});

await check("editable activation and escape", async () => {
  await mount(`<ui-editable><button slot="preview" data-ui-editable-trigger>Preview</button><input slot="edit"></ui-editable>`);
  const root = page.locator('[data-component-root~="ui-editable"]');
  await root.locator('[data-ui-editable-trigger]').click();
  await debugFixture("editable after click");
  assert.equal(await root.locator('input[slot="edit"]').isVisible(), true);
  await root.locator('input[slot="edit"]').press("Escape");
  await page.waitForTimeout(20);
  await debugFixture("editable after escape");
  assert.equal(await root.locator('input[slot="edit"]').isHidden(), true);
  assert.deepEqual((await events("edit-change")).map(({ detail }) => detail.edit), [true, false]);
});

await check("tabs keyboard selection", async () => {
  await mount(`<ui-tabs default-value="first">
    <button id="first" role="tab" aria-controls="panel-first">First</button>
    <button id="second" role="tab" aria-controls="panel-second">Second</button>
    <section id="panel-first">One</section><section id="panel-second">Two</section>
  </ui-tabs>`);
  const root = page.locator('[data-component-root~="ui-tabs"]');
  await root.locator("#first").focus();
  await root.locator("#first").press("ArrowRight");
  assert.equal(await root.locator("#second").getAttribute("aria-selected"), "true");
  assert.equal(await root.locator("#panel-second").isVisible(), true);
  assert.equal((await events("select")).at(-1)?.detail.trigger, "keyboard");
});

await check("menu selection closes anchored surface", async () => {
  await mount(`<div><button id="menu-trigger">Menu</button><ui-menu for="menu-trigger" default-open>
    <ui-menu-item value="edit" tabindex="0">Edit</ui-menu-item>
  </ui-menu></div>`);
  const menu = page.locator('[data-component-root~="ui-menu"]');
  assert.equal(await menu.getAttribute("data-state-open"), "");
  await menu.locator('[data-component-root~="ui-menu-item"]').click();
  await page.waitForTimeout(20);
  await debugFixture("menu after selection");
  assert.equal((await events("select")).at(-1)?.detail.value, "edit");
  assert.equal(await menu.getAttribute("data-state-open"), null);
});

await check("popover and tooltip anchored triggers", async () => {
  await mount(`<div><button id="popover-trigger">Open</button><ui-popover for="popover-trigger">Panel</ui-popover>
    <button id="tooltip-trigger">Help</button><ui-tooltip for="tooltip-trigger" show-delay="0">Hint</ui-tooltip></div>`);
  await page.locator('[data-component-root~="ui-popover"]').evaluate((element) => { element.open = true; });
  await page.waitForTimeout(20);
  await debugFixture("overlays after popover click");
  assert.equal(await page.locator('[data-component-root~="ui-popover"]').evaluate((element) => element.hasAttribute("data-state-open")), true);
  await page.locator("#tooltip-trigger").focus();
  assert.equal(await page.locator('[data-component-root~="ui-tooltip"]').evaluate((element) => element.hasAttribute("data-state-open")), true);
});

await check("dialog escape request", async () => {
  await mount(`<ui-dialog default-open><h2>Confirm</h2><button>Okay</button></ui-dialog>`);
  const root = page.locator('[data-component-root~="ui-dialog"]');
  assert.equal(await root.locator("dialog").getAttribute("open"), "");
  await root.press("Escape");
  await debugFixture("dialog after escape");
  assert.equal((await events("close")).at(-1)?.detail.reason, "escape");
});

await check("combobox selection and public methods", async () => {
  await mount(`<ui-combobox label="Destination" disclosure></ui-combobox>`, {
    config: { options: [{ id: "nyc", value: "nyc", label: "New York" }] },
  });
  const root = page.locator('[data-component-root~="ui-combobox"]');
  await root.locator("input").fill("New");
  await root.locator("input").press("ArrowDown");
  await root.locator("input").press("Enter");
  assert.equal((await events("value-change")).at(-1)?.detail.value, "nyc");
  assert.equal(await root.evaluate((element) => typeof element.validate === "function" && typeof element.focusInput === "function"), true);
  assert.equal((await root.evaluate((element) => element.validate())).status, "valid");
});

await check("tree expansion and roving keyboard focus", async () => {
  await mount(`<ui-tree label="Files"><ui-tree-item item-id="folder" label="Folder" container>
    Folder<ui-tree-item slot="children" item-id="child" label="Child">Child</ui-tree-item>
  </ui-tree-item><ui-tree-item item-id="other" label="Other">Other</ui-tree-item></ui-tree>`);
  const items = page.locator('[data-component-root~="ui-tree-item"]');
  await items.nth(0).focus();
  await items.nth(0).press("ArrowRight");
  assert.equal(await items.nth(0).getAttribute("aria-expanded"), "true");
  await items.nth(0).press("ArrowDown");
  assert.equal(await items.nth(1).evaluate((element) => element === document.activeElement), true);
  assert.equal((await events("expand")).at(-1)?.detail.id, "folder");
});

await check("layout accessibility defaults", async () => {
  await mount(`<div><ui-reel aria-label="Recent pages"><div>One</div></ui-reel><ui-separator></ui-separator></div>`);
  const reel = page.locator('[data-component-root~="ui-reel"]');
  const separator = page.locator('[data-component-root~="ui-separator"]');
  assert.equal(await reel.getAttribute("role"), "region");
  assert.equal(await reel.getAttribute("tabindex"), "0");
  assert.equal(await reel.getAttribute("aria-label"), "Recent pages");
  assert.equal(await separator.getAttribute("role"), "separator");
  assert.equal(await separator.getAttribute("aria-orientation"), "horizontal");
  await separator.evaluate((element) => { element.orientation = "vertical"; });
  assert.equal(await separator.getAttribute("aria-orientation"), "vertical");
});

await check("resizable sidebar keyboard contract", async () => {
  await page.evaluate(() => localStorage.clear());
  await mount(`<ui-sidebar resizable storage-key="docs-nav" style="--ui-sidebar-width:288px"><aside>Navigation</aside><main>Content</main></ui-sidebar>`);
  const sidebar = page.locator('[data-component-root~="ui-sidebar"]');
  const handle = sidebar.locator("[data-ui-sidebar-resizer]");
  assert.equal(await handle.getAttribute("role"), "separator");
  assert.equal(await handle.getAttribute("aria-label"), "Resize sidebar");
  await handle.press("ArrowRight");
  assert.equal(await sidebar.evaluate((element) => element.style.getPropertyValue("--ui-sidebar-width")), "304px");
  assert.deepEqual((await events("resize")).at(-1)?.detail, { width: 304, trigger: "keyboard" });
  assert.equal(await page.evaluate(() => localStorage.getItem("looma:sidebar-width:docs-nav")), "304");
});

await check("editor menu intent contracts", async () => {
  const anchorRect = { left: 40, top: 40, right: 41, bottom: 60 };
  await mount(`<ui-editor-slash-menu></ui-editor-slash-menu>`, {
    open: true,
    query: "hea",
    anchorRect,
    items: [
      { title: "Heading", description: "Large section heading", icon: "heading-1" },
      { title: "Paragraph", description: "Plain text", icon: "pilcrow" },
    ],
  });
  const slash = page.locator('[data-component-root~="ui-editor-slash-menu"]');
  assert.equal(await slash.getAttribute("role"), "listbox");
  await slash.locator("[data-index='1']").hover();
  await slash.locator("[data-index='1']").click();
  assert.equal((await events("looma-editor-slash-menu-highlight")).at(-1)?.detail.index, 1);
  assert.equal((await events("looma-editor-slash-menu-select")).at(-1)?.detail.index, 1);

  await mount(`<ui-editor-mention-menu id="mentions"></ui-editor-mention-menu>`, {
    open: true,
    anchorRect,
    items: [{ id: "ada", label: "Ada Lovelace", detail: "Engineering" }],
  });
  const mention = page.locator('[data-component-root~="ui-editor-mention-menu"]');
  assert.equal(await mention.getAttribute("aria-activedescendant"), "mentions-option-0");
  await mention.locator("[data-index='0']").click();
  assert.equal((await events("looma-editor-mention-menu-select")).at(-1)?.detail.index, 0);
});

await check("editor bounded menus and positioning", async () => {
  await page.mouse.move(900, 650);
  await mount(`<ui-editor-mention-menu id="bounded-mentions" selected-index="1"></ui-editor-mention-menu>`, {
    open: true,
    anchorRect: { x: 16, y: 40, width: 1, height: 18 },
    items: Array.from({ length: 1_000 }, (_, index) => ({ id: `person-${index}`, label: `Person ${index}` })),
  });
  const mention = page.locator('[data-component-root~="ui-editor-mention-menu"]');
  assert.equal(await mention.locator('[role="option"]').count(), 20);
  await debugFixture("bounded mention initial state");
  assert.equal(await mention.locator('[data-index="1"]').getAttribute("aria-selected"), "true", "mention selectedIndex is reflected");
  await mention.locator('[data-index="1"]').click();
  assert.deepEqual((await events("looma-editor-mention-menu-select")).at(-1)?.detail, { index: 1 });

  await mount(`<ui-editor-slash-menu></ui-editor-slash-menu>`, {
    open: true,
    anchorRect: { x: 64, y: 80, width: 1, height: 16 },
    items: Array.from({ length: 12 }, (_, index) => ({ title: `Command ${index + 1}`, description: `Insert command ${index + 1}`, icon: "pilcrow" })),
  });
  const slash = page.locator('[data-component-root~="ui-editor-slash-menu"]');
  assert.equal(await slash.evaluate((element) => element.style.left), "64px");
  assert.equal(await slash.evaluate((element) => element.style.top), "104px");
  await slash.locator(".ui-editor-slash-menu__list").evaluate((element) => { element.scrollTop = 120; });
  const list = await slash.locator(".ui-editor-slash-menu__list").elementHandle();
  await slash.locator('[data-index="5"]').dispatchEvent("mouseover");
  assert.equal(await slash.locator('[data-index="5"]').getAttribute("aria-selected"), "true", "slash pointer highlight is reflected");
  assert.equal(await slash.locator(".ui-editor-slash-menu__list").evaluate((element, original) => element === original, list), true);
  assert.equal(await slash.locator(".ui-editor-slash-menu__list").evaluate((element) => element.scrollTop), 120);

  await page.setViewportSize({ width: 375, height: 420 });
  await slash.evaluate((element) => { element.anchorRect = { left: 16, top: 300, right: 17, bottom: 318 }; });
  await page.waitForTimeout(20);
  assert.equal(await slash.evaluate((element) => element.style.left), "0px");
  assert.equal(await slash.evaluate((element) => element.style.width), "375px");
  assert.equal(await slash.evaluate((element) => element.style.maxHeight), "320px");
  await page.setViewportSize({ width: 1000, height: 700 });
});

await check("editor table picker preview and header intent", async () => {
  await mount(`<ui-editor-insert-table-grid open max-rows="4" max-cols="4"></ui-editor-insert-table-grid>`);
  const grid = page.locator('[data-component-root~="ui-editor-insert-table-grid"]');
  assert.equal(await grid.locator("[data-row][data-col]").count(), 16);
  await grid.locator('[data-row="2"][data-col="2"]').click();
  assert.equal(await grid.locator(".ui-editor-insert-table-grid__hint").textContent(), "2 × 2 selected");
  await grid.locator('[data-row="4"][data-col="1"]').dispatchEvent("mouseover");
  assert.equal(await grid.locator(".ui-editor-insert-table-grid__hint").textContent(), "4 × 1");
  await grid.dispatchEvent("mouseleave");
  assert.equal(await grid.locator(".ui-editor-insert-table-grid__hint").textContent(), "2 × 2 selected");
  await grid.locator('input[type="checkbox"]').uncheck();
  await grid.locator("[data-insert-table]").click();
  assert.deepEqual((await events("looma-editor-insert-table")).at(-1)?.detail, { rows: 2, cols: 2, withHeaderRow: false });
});

await check("editor table toolbar overflow contract", async () => {
  await mount(`<ui-editor-table-toolbar open cell-alignment="center" cell-background="#fef3c7" can-add-row-after can-add-column-after can-delete-table can-merge-cells can-split-cell></ui-editor-table-toolbar>`);
  const toolbar = page.locator('[data-component-root~="ui-editor-table-toolbar"]');
  assert.equal(await toolbar.locator('[data-action="align-center"]').getAttribute("aria-pressed"), "true");
  await toolbar.locator('[data-action="toggle-overflow"]').click();
  assert.equal(await toolbar.locator('[data-action="background-yellow"]').getAttribute("aria-checked"), "true");
  await toolbar.locator('[data-action="merge-cells"]').click();
  assert.equal((await events("looma-editor-table-action")).at(-1)?.detail.action, "merge-cells");
  assert.equal(await toolbar.locator('[role="menu"]').count(), 0);
  await toolbar.locator('[data-action="toggle-overflow"]').click();
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  assert.equal(await toolbar.locator('[role="menu"]').count(), 0);
});

await check("editor table overlay geometry and proximity", async () => {
  await mount(`<ui-editor-table-overlay open rows="2" cols="2" style="display:block;position:relative;width:400px;height:200px"></ui-editor-table-overlay>`, {
    geometry: {
      rowBoundaries: [0, 82, 200], columnBoundaries: [0, 154, 400],
      activeCell: { left: 0, top: 0, width: 154, height: 82, rowIndex: 0, columnIndex: 0 },
      hoveredCell: { left: 154, top: 82, width: 246, height: 118, rowIndex: 1, columnIndex: 1 },
    },
  });
  const overlay = page.locator('[data-component-root~="ui-editor-table-overlay"]');
  const rowControl = overlay.locator('[data-control-key="row:1"]');
  const rowHandle = rowControl.locator(".ui-editor-table-overlay__handle");
  assert.equal(await rowControl.evaluate((element) => element.style.top), "82px");
  await rowHandle.focus();
  assert.equal(await rowControl.getAttribute("data-active"), "true");
  await rowHandle.press("Enter");
  assert.deepEqual((await events("looma-editor-table-overlay-action")).at(-1)?.detail, { action: "add-row-after", boundaryIndex: 1 });
  assert.equal(await overlay.locator('[data-action="open-cell-menu"]').evaluate((element) => element.style.left), "124px");
  assert.equal(await overlay.locator('[data-action="select-row"]').evaluate((element) => element.style.top), "141px");
  assert.equal(await overlay.locator('[data-action="select-column"]').evaluate((element) => element.style.left), "277px");
  const box = await rowHandle.boundingBox();
  await page.evaluate(({ x, y }) => document.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse", bubbles: true })), { x: box.x - 8, y: box.y + box.height / 2 });
  await page.waitForTimeout(30);
  assert.equal(await rowHandle.getAttribute("data-ui-proximity"), "near");
  assert.equal(await overlay.getAttribute("data-ui-interaction"), "engaged");
});

await check("editor table intent contracts", async () => {
  await mount(`<ui-editor-insert-table-grid open max-rows="4" max-cols="4"></ui-editor-insert-table-grid>`);
  const grid = page.locator('[data-component-root~="ui-editor-insert-table-grid"]');
  await grid.locator('[data-row="2"][data-col="3"]').click();
  await grid.locator("[data-insert-table]").click();
  assert.deepEqual((await events("looma-editor-insert-table")).at(-1)?.detail, { rows: 2, cols: 3, withHeaderRow: true });

  await mount(`<ui-editor-table-toolbar open can-add-row-after></ui-editor-table-toolbar>`);
  const toolbar = page.locator('[data-component-root~="ui-editor-table-toolbar"]');
  await toolbar.locator('[data-action="add-row-after"]').click();
  assert.equal((await events("looma-editor-table-action")).at(-1)?.detail.action, "add-row-after");

  await mount(`<ui-editor-table-context-menu open can-delete-table></ui-editor-table-context-menu>`);
  const menu = page.locator('[data-component-root~="ui-editor-table-context-menu"]');
  await menu.locator('[data-action="delete-table"]').click();
  assert.equal((await events("looma-editor-table-action")).at(-1)?.detail.action, "delete-table");

  await mount(`<ui-editor-table-overlay open rows="2" cols="2" row-boundaries="0 40 80" column-boundaries="0 60 120"></ui-editor-table-overlay>`);
  const overlay = page.locator('[data-component-root~="ui-editor-table-overlay"]');
  await overlay.locator('[data-action="add-row-after"]').first().dispatchEvent("click");
  assert.equal((await events("looma-editor-table-overlay-action")).at(-1)?.detail.action, "add-row-after");
});

await page.evaluate(() => window.__stopLooma?.());
await browser.close();
server.close();

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.name}${result.ok ? "" : ` — ${result.error}`}`);
}
const failed = results.filter(({ ok }) => !ok);
if (failed.length) throw new Error(`${failed.length}/${results.length} interaction checks failed.`);
console.log(`Validated ${results.length} HTML Next interaction contracts.`);
