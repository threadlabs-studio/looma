import assert from "node:assert/strict";
import { createServer } from "node:http";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPOSITORY = join(HERE, "..", "..");
const packageRoots = Object.fromEntries(["core", "layout", "editor"].map((name) => [
  name,
  join(REPOSITORY, "packages", name, "src", "declarative"),
]));
// Each component is a folder: src/components/<tag>/<tag>.html and its controller <tag>.js.
const componentRoots = Object.fromEntries(["core", "layout", "editor"].map((name) => [
  name,
  join(REPOSITORY, "packages", name, "src", "components"),
]));
const components = (await Promise.all(Object.entries(componentRoots).map(async ([group, root]) =>
  Promise.all((await readdir(root))
    .filter((name) => name.startsWith("ui-"))
    .map(async (tag) => {
      const directory = join(root, tag);
      const controllerPath = join(directory, `${tag}.js`);
      let controller = null;
      try {
        await access(controllerPath);
        controller = `${tag}/${tag}.js`;
      } catch {
        // Styling-only definitions intentionally have no controller module.
      }
      return { tag, group, directory, controller };
    }))))).flat();
const runtime = await readFile(join(HERE, "vendor", "html-next-runtime.iife.js"), "utf8");
const sharedStyles = (await Promise.all(["layout", "editor"].map((group) =>
  readFile(join(packageRoots[group], "styles.css"), "utf8")))).join("\n");
const definitions = (await Promise.all(components.map(async ({ tag, directory }) =>
  readFile(join(directory, `${tag}.html`), "utf8"))))
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
    const [, group, ...segments] = pathname.split("/");
    const controllerRoot = componentRoots[group];
    if (!controllerRoot) throw new Error("unknown controller package");
    const requested = resolve(controllerRoot, ...segments);
    if (!requested.startsWith(`${resolve(controllerRoot)}${sep}`)) throw new Error("path escape");
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
page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(message.text());
});

await page.goto(base);
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${sharedStyles}</style>${definitions}<main id="fixture"></main>`);
await page.addScriptTag({ content: runtime });
const controllerUrls = Object.fromEntries(components
  .filter(({ controller }) => controller !== null)
  .map(({ tag, group, controller }) => [tag, `${base}/${group}/${controller}`]));
await page.evaluate(async ({ urls, events }) => {
  window.__loomaEvents = [];
  // Capture phase: some component events (tree `expand`) deliberately do not bubble.
  for (const name of events) document.addEventListener(name, (event) => {
    // Every component event (some, like tree expand, do not bubble), plus native events that bubble.
    // Capture would otherwise also record non-bubbling native events such as a dialog's own close.
    if (!(event instanceof CustomEvent) && !event.bubbles) return;
    window.__loomaEvents.push({ name, detail: event.detail ?? null });
  }, { capture: true });
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
    "highlight", "select", "insert", "action",
  ],
});

async function mount(markup, props = {}) {
  await page.evaluate(({ source, componentProps }) => {
    window.__loomaEvents.length = 0;
    const fixture = document.querySelector("#fixture");
    const template = document.createElement("template");
    template.innerHTML = source;
    const invocation = template.content.firstElementChild;
    // Props are attributes: kebab-case names, JSON text for list/object shapes.
    for (const [name, value] of Object.entries(componentProps)) {
      const attribute = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      invocation.setAttribute(attribute, typeof value === "string" ? value : JSON.stringify(value));
    }
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
  await mount(`<ui-checkbox value="terms">Accept</ui-checkbox>`);
  const root = page.locator('[data-component-root~="ui-checkbox"]');
  await root.locator("input").click();
  assert.equal(await root.locator("input").getAttribute("aria-checked"), "true");
  assert.deepEqual((await events("change")).findLast(({ detail }) => detail !== null)?.detail, {
    checked: true,
    value: "terms",
    trigger: "programmatic",
  });
});

await check("switch keyboard activation", async () => {
  await mount(`<ui-switch>Power</ui-switch>`);
  const root = page.locator('[data-component-root~="ui-switch"]');
  const control = root.locator('input[role="switch"]');
  await control.focus();
  await control.press("Space");
  assert.equal(await control.getAttribute("aria-checked"), "true");
  assert.equal((await events("change")).findLast(({ detail }) => detail !== null)?.detail.trigger, "keyboard");
});

await check("radio group selection and roving state", async () => {
  await mount(`<ui-radio-group value="starter" name="plan">
    <ui-radio value="starter">Starter</ui-radio>
    <ui-radio value="pro">Pro</ui-radio>
  </ui-radio-group>`);
  const radios = page.locator('[data-component-root~="ui-radio"]');
  await radios.nth(1).locator("input").click();
  assert.equal(await radios.nth(0).getAttribute("aria-checked"), "false");
  assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true");
  assert.equal((await events("select")).at(-1)?.detail.value, "pro");
});

await check("native input/select/textarea bridges", async () => {
  await mount(`<div>
    <ui-input></ui-input>
    <ui-select><option value="a">A</option><option value="b">B</option></ui-select>
    <ui-textarea rows="3"></ui-textarea>
  </div>`);
  await page.locator('input[data-component-root~="ui-input"]').fill("hello");
  await page.locator('select[data-component-root~="ui-select"]').selectOption("b");
  await page.locator('textarea[data-component-root~="ui-textarea"]').fill("notes");
  const inputEvents = await events("input");
  assert.equal(inputEvents.length >= 2, true);
  assert.equal(await page.locator('input[data-component-root~="ui-input"]').inputValue(), "hello");
  assert.equal(await page.locator('select[data-component-root~="ui-select"]').inputValue(), "b");
  assert.equal(await page.locator('textarea[data-component-root~="ui-textarea"]').inputValue(), "notes");
  assert.equal(await page.locator('textarea[data-component-root~="ui-textarea"]').getAttribute("rows"), "3");
});

await check("disclosure open and close", async () => {
  await mount(`<ui-disclosure summary="Details"><section>Body</section></ui-disclosure>`);
  const root = page.locator('[data-component-root~="ui-disclosure"]');
  const button = root.locator(".disclosure__trigger");
  const panel = root.locator(".disclosure__panel");
  assert.equal(await panel.getAttribute("aria-hidden"), "true");
  await button.click();
  assert.equal(await panel.getAttribute("aria-hidden"), "false");
  assert.equal((await events("open")).at(-1)?.detail.open, true);
});

await check("avatar group survives nested component lowering", async () => {
  await mount(`<ui-avatar-group max="2" label="Project team">
    <ui-avatar name="Maya Chen" fallback="MC"></ui-avatar>
    <ui-avatar name="Noah Williams" fallback="NW"></ui-avatar>
    <ui-avatar name="Ari Kim" fallback="AK"></ui-avatar>
  </ui-avatar-group>`);
  const group = page.locator('[data-component-root~="ui-avatar-group"]');
  const avatars = group.locator(':scope > [data-component-root~="ui-avatar"]');
  assert.equal(await avatars.count(), 3);
  assert.equal(await avatars.nth(2).isHidden(), true);
  assert.equal(await group.locator("[data-ui-avatar-group-overflow]").textContent(), "+1");
});

await check("editable activation, commit, and escape", async () => {
  await mount(`<ui-editable value="Project atlas" label="Project title"></ui-editable>`);
  const root = page.locator('[data-component-root~="ui-editable"]');
  await root.locator(".editable__preview").click();
  await debugFixture("editable after click");
  const input = root.locator(".editable__input");
  assert.equal(await input.isVisible(), true);
  await input.fill("Project loom");
  await input.press("Enter");
  await page.waitForTimeout(20);
  assert.equal(await root.locator(".editable__preview").textContent().then((text) => text.includes("Project loom")), true);
  assert.equal((await events("change")).findLast(({ detail }) => detail !== null)?.detail.value, "Project loom");
  await root.locator(".editable__preview").click();
  await input.fill("Discard me");
  await input.press("Escape");
  assert.equal(await input.isHidden(), true);
  assert.equal(await root.locator(".editable__preview").textContent().then((text) => text.includes("Project loom")), true);
  assert.deepEqual((await events("edit-change")).map(({ detail }) => detail.edit), [true, false, true, false]);
});

await check("tabs keyboard selection", async () => {
  await mount(`<ui-tabs value="panel-first">
    <section id="panel-first" aria-label="First">One</section>
    <section id="panel-second" aria-label="Second">Two</section>
  </ui-tabs>`);
  const root = page.locator('[data-component-root~="ui-tabs"]');
  const tabs = root.locator('[role="tab"]');
  await tabs.nth(0).focus();
  await tabs.nth(0).press("ArrowRight");
  assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
  assert.equal(await root.locator("#panel-second").isVisible(), true);
  assert.equal((await events("select")).at(-1)?.detail.trigger, "keyboard");
});

await check("menu selection closes anchored surface", async () => {
  await mount(`<div><button id="menu-trigger">Menu</button><ui-menu for="menu-trigger">
    <ui-menu-item value="edit" tabindex="0">Edit</ui-menu-item>
  </ui-menu></div>`);
  const menu = page.locator('[data-component-root~="ui-menu"]');
  assert.equal(await menu.getAttribute("data-state-open"), null);
  await page.locator("#menu-trigger").click();
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
  await page.locator('[data-component-root~="ui-popover"]').evaluate((element) => { element.setAttribute("data-open", "true"); });
  await page.waitForTimeout(20);
  await debugFixture("overlays after popover click");
  assert.equal(await page.locator('[data-component-root~="ui-popover"]').evaluate((element) => element.hasAttribute("data-state-open")), true);
  await page.locator("#tooltip-trigger").focus();
  assert.equal(await page.locator('[data-component-root~="ui-tooltip"]').evaluate((element) => element.hasAttribute("data-state-open")), true);
});

await check("dialog escape request", async () => {
  await mount(`<ui-dialog open modal dismissible><h2>Confirm</h2><button>Okay</button></ui-dialog>`);
  const root = page.locator('[data-component-root~="ui-dialog"]');
  await debugFixture("dialog after mount");
  assert.equal(await root.getAttribute("open"), "");
  await root.press("Escape");
  await debugFixture("dialog after escape");
  // The close event is dispatched asynchronously; wait for it rather than reading at once.
  await page.waitForFunction(() => window.__loomaEvents.some((event) => event.name === "close"), null, { timeout: 2000 });
  assert.equal((await events("close")).at(-1)?.detail.reason, "escape");
});

await check("combobox authored options and public methods", async () => {
  await mount(`<ui-combobox label="Destination" disclosure><option value="nyc">New York</option></ui-combobox>`);
  const root = page.locator('[data-component-root~="ui-combobox"]');
  await root.locator("input").fill("New");
  await root.locator("input").press("ArrowDown");
  await root.locator("input").press("Enter");
  assert.equal((await events("value-change")).at(-1)?.detail.value, "nyc");
  assert.equal(await root.evaluate((element) => typeof element.validate === "function" && typeof element.focusInput === "function"), true);
  assert.equal((await root.evaluate((element) => element.validate())).status, "valid");
});

await check("toast region command and owned dismissal", async () => {
  await mount(`<div><ui-toast-region id="notifications"></ui-toast-region><button commandfor="notifications" command="--show-toast" value="Page saved.">Show toast</button></div>`);
  await page.locator('button[command="--show-toast"]').click();
  const region = page.locator('[data-component-root~="ui-toast-region"]');
  assert.equal(await region.locator(".toast__message").textContent(), "Page saved.");
  await region.locator(".toast__dismiss").click();
  // The toast leaves at once (closing state) and is removed after its exit animation.
  assert.equal(await region.locator(".toast[data-state-closing]").count(), 1);
  await region.locator(".toast").waitFor({ state: "detached", timeout: 2000 });
  assert.equal((await events("dismiss")).at(-1)?.detail.id.startsWith("ui-toast-"), true);
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
  await separator.evaluate((element) => { element.setAttribute("data-orientation", "vertical"); });
  await page.waitForTimeout(20);
  assert.equal(await separator.getAttribute("aria-orientation"), "vertical");
});

await check("resizable sidebar keyboard contract", async () => {
  await mount(`<div style="display:flex;inline-size:900px"><ui-sidebar resizable width="288"><nav>Navigation</nav></ui-sidebar><main>Content</main></div>`);
  const sidebar = page.locator('[data-component-root~="ui-sidebar"]');
  const handle = sidebar.locator("[data-ui-sidebar-resizer]");
  assert.equal(await handle.getAttribute("role"), "separator");
  assert.equal(await handle.getAttribute("aria-label"), "Resize sidebar");
  await handle.press("ArrowRight");
  assert.equal(Math.round(await sidebar.evaluate((element) => element.getBoundingClientRect().width)), 304);
  assert.deepEqual((await events("resize")).at(-1)?.detail, { width: 304, trigger: "keyboard" });
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
  assert.equal((await events("highlight")).at(-1)?.detail.index, 1);
  assert.equal((await events("select")).at(-1)?.detail.index, 1);

  await mount(`<ui-editor-mention-menu id="mentions"></ui-editor-mention-menu>`, {
    open: true,
    anchorRect,
    items: [{ id: "ada", label: "Ada Lovelace", detail: "Engineering" }],
  });
  const mention = page.locator('[data-component-root~="ui-editor-mention-menu"]');
  assert.equal(await mention.getAttribute("aria-activedescendant"), "mentions-option-0");
  await mention.locator("[data-index='0']").click();
  assert.equal((await events("select")).at(-1)?.detail.index, 0);
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
  assert.deepEqual((await events("select")).at(-1)?.detail, { index: 1 });

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
  await slash.locator('[data-index="5"]').hover();
  assert.equal(await slash.locator('[data-index="5"]').getAttribute("aria-selected"), "true", "slash pointer highlight is reflected");
  assert.equal(await slash.locator(".ui-editor-slash-menu__list").evaluate((element, original) => element === original, list), true);
  assert.equal(await slash.locator(".ui-editor-slash-menu__list").evaluate((element) => element.scrollTop), 120);

  await page.setViewportSize({ width: 375, height: 420 });
  await slash.evaluate((element) => { element.setAttribute("data-anchor-rect", JSON.stringify({ left: 16, top: 300, right: 17, bottom: 318 })); });
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
  assert.equal(await grid.locator('input[type="checkbox"]').isChecked(), false);
  await grid.locator("[data-insert-table]").click();
  assert.deepEqual((await events("insert")).at(-1)?.detail, { rows: 2, cols: 2, withHeaderRow: false });
});

await check("editor table toolbar overflow contract", async () => {
  await mount(`<ui-editor-table-toolbar open cell-alignment="center" cell-background="#fef3c7"></ui-editor-table-toolbar>`, {
    actions: ["align-center", "background-yellow", "add-row-after", "add-column-after", "delete-table", "merge-cells", "split-cell"],
  });
  const toolbar = page.locator('[data-component-root~="ui-editor-table-toolbar"]');
  assert.equal(await toolbar.locator('[data-action="align-center"]').getAttribute("aria-pressed"), "true");
  await toolbar.locator('[data-action="toggle-overflow"]').click();
  assert.equal(await toolbar.locator('[data-action="background-yellow"]').getAttribute("aria-checked"), "true");
  await toolbar.locator('[data-action="merge-cells"]').click();
  assert.equal((await events("action")).at(-1)?.detail.action, "merge-cells");
  assert.equal(await toolbar.locator('[role="menu"]').count(), 0);
  await toolbar.locator('[data-action="toggle-overflow"]').click();
  await page.evaluate(() => document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })));
  assert.equal(await toolbar.locator('[role="menu"]').count(), 0);
});

await check("editor table overlay geometry and proximity", async () => {
  await mount(`<ui-editor-table-overlay open style="display:block;position:relative;width:400px;height:200px"></ui-editor-table-overlay>`, {
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
  assert.deepEqual((await events("action")).at(-1)?.detail, { action: "add-row-after", boundaryIndex: 1 });
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
  await mount(`<ui-editor-insert-table-grid open max-rows="4" max-cols="4" header-row></ui-editor-insert-table-grid>`);
  const grid = page.locator('[data-component-root~="ui-editor-insert-table-grid"]');
  await grid.locator('[data-row="2"][data-col="3"]').click();
  await grid.locator("[data-insert-table]").click();
  assert.deepEqual((await events("insert")).at(-1)?.detail, { rows: 2, cols: 3, withHeaderRow: true });

  await mount(`<ui-editor-table-toolbar open></ui-editor-table-toolbar>`, { actions: ["add-row-after"] });
  const toolbar = page.locator('[data-component-root~="ui-editor-table-toolbar"]');
  await toolbar.locator('[data-action="add-row-after"]').click();
  assert.equal((await events("action")).at(-1)?.detail.action, "add-row-after");

  await mount(`<ui-editor-table-context-menu open></ui-editor-table-context-menu>`, { actions: ["delete-table"] });
  const menu = page.locator('[data-component-root~="ui-editor-table-context-menu"]');
  await menu.locator('[data-action="delete-table"]').click();
  assert.equal((await events("action")).at(-1)?.detail.action, "delete-table");

  await mount(`<ui-editor-table-overlay open></ui-editor-table-overlay>`, {
    geometry: { rowBoundaries: [0, 40, 80], columnBoundaries: [0, 60, 120], activeCell: null },
  });
  const overlay = page.locator('[data-component-root~="ui-editor-table-overlay"]');
  await overlay.locator('[data-action="add-row-after"]').first().dispatchEvent("click");
  assert.equal((await events("action")).at(-1)?.detail.action, "add-row-after");
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
