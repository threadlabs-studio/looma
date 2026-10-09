// Drives Tree / TreeItem drag and drop in Chromium with real pointer drags, against the built package
// (run `pnpm build` first). Assertions go through the public surface: events, ARIA, data-component,
// computed styles, and geometry.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright";
import { build, type Plugin } from "vite";
import { afterAll, beforeAll, describe, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let directory = "";
let browser: Browser;
let bundlePath = "";
let marqueePath = "";
let paddedMarqueePath = "";
let lateItemsPath = "";

async function bundle(name: string, source: string, plugins: Plugin[] = []): Promise<string> {
  const entry = join(directory, `${name}.js`);
  await writeFile(entry, source);
  await build({
    configFile: false,
    logLevel: "silent",
    root: directory,
    plugins,
    resolve: { alias: { "@threadlabs/looma": root } },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: join(directory, name),
      minify: false,
      lib: { entry, formats: ["iife"], name: name.replace(/\W/g, "_"), fileName: () => "bundle.js" },
    },
  });
  return join(directory, name, "bundle.js");
}

type Node = { id: string; label?: string; children?: Node[]; [prop: string]: unknown };
type Spec = { tree?: Record<string, unknown>; items: Node[] };
type Detail = Record<string, unknown>;

// Renders `spec` as a Vue Tree. Every item is sortable unless it says otherwise.
async function open(spec: Spec, script = bundlePath, options: BrowserContextOptions = { reducedMotion: "reduce" }, state: "visible" | "attached" = "visible"): Promise<Page> {
  // Reduced motion turns the rows' style transitions off, so computed styles settle immediately.
  const page = await browser.newPage(options);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html><body style="margin:0;padding:40px 40px 40px 60px;width:320px"><div id="app"></div></body></html>`);
  for (const path of [join(root, "tokens.css"), join(root, "vue/components.css")]) await page.addStyleTag({ path });
  await page.evaluate((value) => { (window as unknown as { spec: Spec }).spec = value; }, spec);
  await page.addScriptTag({ path: script });
  await page.waitForSelector('[data-component="ui-tree"] [role="treeitem"]', { state });
  await page.waitForTimeout(50);
  assert.deepEqual(errors, []);
  return page;
}

const events = (page: Page) => page.evaluate(() => (window as unknown as { events: [string, Detail][] }).events);
const item = (page: Page, id: string) => page.locator(`[role="treeitem"][data-item-id="${id}"]`);
// ponytail: the row is the treeitem's first child; there is no public hook for it.
const rowBox = async (page: Page, id: string) => (await item(page, id).locator(":scope > :first-child").boundingBox())!;

async function startDrag(page: Page, label: string) {
  await page.getByRole("button", { name: `Drag ${label} to reorder` }).hover();
  await page.mouse.down();
}

// Moves to `fraction` of the way down a row, in steps, as a pointer does.
async function dragOver(page: Page, id: string, fraction: number) {
  const box = await rowBox(page, id);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * fraction, { steps: 8 });
  await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height * fraction, { steps: 2 });
}

async function drag(page: Page, label: string, id: string, fraction: number) {
  await startDrag(page, label);
  await dragOver(page, id, fraction);
  await page.mouse.up();
  await page.waitForTimeout(50);
}

// The visible thin bars (insertion indicators) an item draws itself, excluding those of nested items.
function indicators(page: Page, id: string) {
  return item(page, id).evaluate((element) => Array.from(element.querySelectorAll<HTMLElement>('[aria-hidden="true"]'))
    .filter((node) => node.closest('[role="treeitem"]') === element)
    .map((node) => ({ node, rect: node.getBoundingClientRect(), style: getComputedStyle(node) }))
    .filter(({ rect, style }) => style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && rect.height <= 4)
    .map(({ rect, style }) => ({ top: rect.top, bottom: rect.bottom, width: rect.width, color: style.backgroundColor })));
}

const rowStyle = (page: Page, id: string) => item(page, id).locator(":scope > :first-child").evaluate((row) => {
  const style = getComputedStyle(row);
  return { background: style.backgroundColor, shadow: style.boxShadow };
});

it("activates a single-selection row by click and Enter even when already selected", async () => {
  const page = await open({ tree: { selection: "single" }, items: [{ id: "chosen", label: "Chosen", selected: true, sortable: false }] });
  await item(page, "chosen").click();
  await item(page, "chosen").press("Enter");
  assert.deepEqual((await events(page)).filter(([name]) => name === "activate"), [
    ["activate", { id: "chosen", trigger: "pointer" }],
    ["activate", { id: "chosen", trigger: "keyboard" }],
  ]);
  assert.deepEqual((await events(page)).filter(([name]) => name === "select"), []);
  await page.close();
});

it("keeps activation away from disabled rows, controls and multiple-selection checkboxes", async () => {
  const page = await open({ tree: { selection: "single" }, items: [{ id: "disabled", label: "Disabled", disabled: true, sortable: false }] });
  await item(page, "disabled").click({ force: true });
  await item(page, "disabled").press("Enter");
  assert.deepEqual(await events(page), []);
  await page.close();
  const controls = await open({ tree: { selection: "single" }, items: [{ id: "folder", label: "Folder", container: true, sortable: false, children: [{ id: "child", label: "Child" }] }] });
  await item(controls, "folder").getByRole("button", { name: "Expand Folder" }).click();
  assert.deepEqual((await events(controls)).filter(([name]) => name === "activate"), []);
  await controls.close();
  const multiple = await open({ tree: { selection: "multiple" }, items: [{ id: "many", label: "Many", sortable: false }] });
  await item(multiple, "many").click();
  assert.deepEqual((await events(multiple)).filter(([name]) => name === "activate"), []);
  await multiple.close();
});

const files: Node[] = [
  { id: "docs", label: "Docs", container: true, expanded: true, children: [
    { id: "guide", label: "Guide" },
    { id: "api", label: "API" },
  ] },
  { id: "archive", label: "Archive", container: true, children: [{ id: "old", label: "Old" }] },
  { id: "readme", label: "Readme" },
  { id: "license", label: "License" },
];

beforeAll(async () => {
  await mkdir(join(root, ".build"), { recursive: true });
  directory = await mkdtemp(join(root, ".build", "tree-"));
  browser = await chromium.launch();
  bundlePath = await bundle("vue-tree", `
    import { createApp, h } from "vue";
    import { Tree, TreeItem } from "@threadlabs/looma/vue";
    const events = [];
    window.events = events;
    const render = ({ id, children, ...props }) => h(TreeItem, { itemId: id, sortable: true, ...props }, children ? () => children.map(render) : undefined);
    createApp({
      render: () => h(Tree, {
        label: "Files",
        ...window.spec.tree,
        onReorder: (event) => events.push(["reorder", event.detail]),
        onReorderRejected: (event) => events.push(["reorder-rejected", event.detail]),
        onSelect: (event) => events.push(["select", event.detail]),
        onActivate: (event) => events.push(["activate", event.detail]),
      }, () => window.spec.items.map(render)),
    }).mount("#app");
  `);
  lateItemsPath = await bundle("vue-tree-late-items", `
    import { createApp, h } from "vue";
    import { Tree, TreeItem } from "@threadlabs/looma/vue";
    window.treeItemGate = new Promise(resolve => { window.releaseTreeItems = resolve; });
    window.events = [];
    createApp({ render: () => h(Tree, {
      label: "Files", selection: "single",
      onSelect: event => window.events.push(["select", event.detail]),
    }, () => window.spec.items.map(({ id, ...props }) => h(TreeItem, { itemId: id, ...props }))) }).mount("#app");
  `, [{
    name: "delay-tree-item-controller",
    transform(code, id) {
      if (!id.endsWith("/components/ui-tree-item/ui-tree-item.js")) return;
      const declaration = "export default function controller(host) {";
      assert.ok(code.includes(declaration), "delay the real Tree Item controller");
      return code.replace(declaration, "export default async function controller(host) { await window.treeItemGate;");
    },
  }]);
  marqueePath = await bundle("vue-tree-marquee", `
    import { createApp, h } from "vue";
    import { Tree, TreeItem } from "@threadlabs/looma/vue";
    const name = "A name long enough to run past the end of its row and under the controls";
    createApp({
      render: () => h(Tree, { label: "Files", marquee: true, ...window.spec.tree }, () => [
        h(TreeItem, { itemId: "short", label: "Short" }),
        h(TreeItem, { itemId: "long", label: name, actionsVisible: window.spec.tree?.actionsVisible }, {
          leading: () => h("span", { "data-testid": "icon", style: "display:block;width:16px;height:16px" }),
          actions: () => h("button", { type: "button" }, "More"),
        }),
      ]),
    }).mount("#app");
  `);
  // A full-width link keeps its hit area across the row while its title may be short.
  paddedMarqueePath = await bundle("vue-tree-marquee-padded", `
    import { createApp, h } from "vue";
    import { Tree, TreeItem } from "@threadlabs/looma/vue";
    createApp({ render: () => h(Tree, { label: "Files", marquee: true, style: "width:220px" }, () => [
      h(TreeItem, { itemId: "padded", label: "A moderately long file name" }, {
        leading: () => h("span", { style: "display:block;width:16px;height:16px" }),
        label: () => h("a", { href: "#", style: "display:flex;width:100%;padding:0 8px;box-sizing:border-box" },
          h("span", { "data-testid": "title", style: "white-space:nowrap" }, "A moderately long file name")),
        actions: () => h("span", { style: "display:flex;width:56px" }, "•••"),
      }),
      h(TreeItem, { itemId: "short-link", label: "Fact notes" }, {
        leading: () => h("span", { style: "display:block;width:16px;height:16px" }),
        label: () => h("a", { href: "#", style: "display:flex;width:100%;padding:0 8px;box-sizing:border-box" },
          h("span", { style: "white-space:nowrap" }, "Fact notes")),
        actions: () => h("span", { style: "display:flex;width:56px" }, "•••"),
      }),
    ]) }).mount("#app");
  `);
});

afterAll(async () => {
  await browser?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("Tree drag and drop", () => {
  it("restores a keyboard entry point when row controllers initialize after the tree", async () => {
    const page = await open({ items: [{ id: "first", label: "First" }, { id: "second", label: "Second" }] }, lateItemsPath);
    assert.equal(await page.locator('[role="treeitem"][tabindex="0"]').count(), 0);
    await page.evaluate(() => (window as unknown as { releaseTreeItems: () => void }).releaseTreeItems());
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[role="treeitem"]')?.tabIndex === 0, undefined, { timeout: 2_000 });
    await page.keyboard.press("Tab");
    assert.equal(await item(page, "first").evaluate(element => element === document.activeElement), true);
    await page.keyboard.press("ArrowDown");
    assert.equal(await item(page, "second").evaluate(element => element === document.activeElement), true);
    await item(page, "second").click();
    assert.deepEqual((await events(page)).filter(([name]) => name === "select"), [["select", { ids: ["second"], trigger: "pointer" }]]);
    await page.close();
  });

  it("restores the keyboard entry point when an initially hidden tree becomes visible", async () => {
    const page = await open({ tree: { style: "display:none" }, items: [{ id: "first", label: "First", sortable: false }, { id: "second", label: "Second", sortable: false }] }, bundlePath, { reducedMotion: "reduce" }, "attached");
    await page.locator('[role="tree"]').evaluate((element: HTMLElement) => { element.style.display = "block"; });
    await page.waitForFunction(() => document.querySelector<HTMLElement>('[role="treeitem"]')?.tabIndex === 0, undefined, { timeout: 2_000 });
    await page.keyboard.press("Tab");
    assert.equal(await item(page, "first").evaluate(element => element === document.activeElement), true);
    await page.keyboard.press("ArrowDown");
    for (const display of ["none", "block"]) {
      await page.locator('[role="tree"]').evaluate(async (element: HTMLElement, value) => {
        element.style.display = value;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }, display);
    }
    assert.equal(await item(page, "second").getAttribute("tabindex"), "0");
    assert.equal(await item(page, "first").getAttribute("tabindex"), "-1");
    await page.close();
  });

  it("renders a tree with levels and expansion state", async () => {
    const page = await open({ items: files });
    assert.equal(await page.locator('[data-component="ui-tree"]').getAttribute("role"), "tree");
    assert.equal(await item(page, "docs").getAttribute("data-component"), "ui-tree-item");
    assert.equal(await item(page, "docs").getAttribute("aria-level"), "1");
    assert.equal(await item(page, "guide").getAttribute("aria-level"), "2");
    assert.equal(await item(page, "docs").getAttribute("aria-expanded"), "true");
    assert.equal(await item(page, "archive").getAttribute("aria-expanded"), "false");
    assert.equal(await item(page, "readme").getAttribute("aria-expanded"), null);
    await page.close();
  });

  it("indents each nested row by one step", async () => {
    const page = await open({
      tree: { style: "--ui-tree-indent: 20px" },
      items: [{ id: "root", label: "Root", container: true, expanded: true, children: [
        { id: "folder", label: "Folder", container: true, expanded: true, children: [
          { id: "page", label: "Page" },
        ] },
      ] }],
    });
    const positions = await Promise.all(["root", "folder", "page"].map(async (id) => (await rowBox(page, id)).x));
    assert.deepEqual(positions, [60, 80, 100]);
    assert.equal(await item(page, "page").getAttribute("aria-level"), "3");
    await page.close();
  });

  it("reorders a leaf before and after a sibling", async () => {
    const page = await open({ items: files });
    await drag(page, "License", "readme", 0.2);
    await drag(page, "Readme", "license", 0.8);
    const base = { sourceType: "item", targetType: "item", sourceScope: "", targetScope: "", trigger: "pointer" };
    assert.deepEqual(await events(page), [
      ["reorder", { sourceId: "license", targetId: "readme", position: "before", ...base }],
      ["reorder", { sourceId: "readme", targetId: "license", position: "after", ...base }],
    ]);
    await page.close();
  });

  it("reports drag types and scopes in the reorder detail", async () => {
    const page = await open({ items: [
      { id: "a", label: "A", dragType: "page", dropScope: "left" },
      { id: "b", label: "B", dragType: "page", dropScope: "right" },
    ] });
    await drag(page, "A", "b", 0.8);
    assert.deepEqual(await events(page), [["reorder", {
      sourceId: "a", targetId: "b", position: "after", sourceType: "page", targetType: "page", sourceScope: "left", targetScope: "right", trigger: "pointer",
    }]]);
    await page.close();
  });

  it("drops inside a container's middle band, expanding a collapsed one after the hover delay", async () => {
    const page = await open({ tree: { hoverExpandDelay: 200 }, items: files });
    await startDrag(page, "Readme");
    await dragOver(page, "archive", 0.5);
    assert.equal(await item(page, "archive").getAttribute("aria-expanded"), "false");
    await page.waitForFunction(() => document.querySelector('[data-item-id="archive"]')?.getAttribute("aria-expanded") === "true", null, { timeout: 2000 });
    assert.equal(await item(page, "old").isVisible(), true);
    // Re-target the row: it has not moved, since the tree expands downwards.
    await dragOver(page, "archive", 0.5);
    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.deepEqual(await events(page), [["reorder", {
      sourceId: "readme", targetId: "archive", position: "inside", sourceType: "item", targetType: "item", sourceScope: "", targetScope: "", trigger: "pointer",
    }]]);
    await page.close();
  });

  it("does not expand a collapsed container before the hover delay", async () => {
    const page = await open({ tree: { hoverExpandDelay: 1500 }, items: files });
    await startDrag(page, "Readme");
    await dragOver(page, "archive", 0.5);
    await page.waitForTimeout(400);
    assert.equal(await item(page, "archive").getAttribute("aria-expanded"), "false");
    await page.mouse.up();
    await page.close();
  });

  it("shows an insertion indicator at the row edge the drop will use", async () => {
    const page = await open({ items: files });
    await startDrag(page, "License");
    const box = await rowBox(page, "readme");

    await dragOver(page, "readme", 0.2);
    const before = await indicators(page, "readme");
    assert.equal(before.length, 1, "one indicator before");
    assert.ok(Math.abs((before[0]!.top + before[0]!.bottom) / 2 - box.y) <= 2, "indicator on the row's top edge");
    assert.ok(before[0]!.width > box.width * 0.9, "indicator spans the row");
    assert.notEqual(before[0]!.color, "rgba(0, 0, 0, 0)");

    await dragOver(page, "readme", 0.8);
    const after = await indicators(page, "readme");
    assert.equal(after.length, 1, "one indicator after");
    assert.ok(Math.abs((after[0]!.top + after[0]!.bottom) / 2 - (box.y + box.height)) <= 2, "indicator on the row's bottom edge");

    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.deepEqual((await events(page)).map(([, detail]) => detail.position), ["after"]);
    assert.deepEqual(await indicators(page, "readme"), [], "indicator cleared after the drop");
    await page.close();
  });

  it("highlights a container row for an inside drop, with no insertion indicator", async () => {
    const page = await open({ items: files });
    const idle = await rowStyle(page, "archive");
    await startDrag(page, "Readme");
    await dragOver(page, "archive", 0.5);
    const hovered = await rowStyle(page, "archive");
    assert.notEqual(hovered.shadow, "none", "target row is outlined");
    assert.notEqual(hovered.background, idle.background, "target row is tinted");
    assert.deepEqual(await indicators(page, "archive"), []);
    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.deepEqual((await events(page)).map(([, detail]) => detail.position), ["inside"]);
    assert.equal((await rowStyle(page, "archive")).shadow, idle.shadow, "highlight cleared after the drop");
    await page.close();
  });

  // Drop feedback belongs to the target row alone, not the rows nested inside an expanded container.
  it("highlights only the target row, not the rows nested inside it", async () => {
    const page = await open({ items: files });
    const idle = await rowStyle(page, "guide");
    await startDrag(page, "Readme");
    await dragOver(page, "docs", 0.5);
    assert.notEqual((await rowStyle(page, "docs")).shadow, "none");
    assert.deepEqual(await rowStyle(page, "guide"), idle);
    await page.mouse.up();
    await page.close();
  });

  // The insertion indicator before an expanded container is its own, not one per nested row.
  it("shows a single insertion indicator before an expanded container", async () => {
    const page = await open({ items: files });
    await startDrag(page, "Readme");
    await dragOver(page, "docs", 0.1);
    assert.equal((await indicators(page, "docs")).length, 1);
    assert.deepEqual(await indicators(page, "guide"), []);
    assert.deepEqual(await indicators(page, "api"), []);
    await page.mouse.up();
    await page.close();
  });

  it("rejects a drop that would exceed max-depth", async () => {
    // Moving Archive (which has a child) inside Docs would put Old at level 3.
    const page = await open({ tree: { maxDepth: 2 }, items: files });
    await startDrag(page, "Archive");
    await dragOver(page, "docs", 0.5);
    assert.equal((await rowStyle(page, "docs")).shadow, "none", "no inside highlight for a rejected drop");
    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.deepEqual(await events(page), [["reorder-rejected", {
      sourceId: "archive", targetId: "docs", position: "inside", reason: "max-depth", maxDepth: 2, resultingDepth: 3, trigger: "pointer",
    }]]);
    await page.close();
  });

  it("counts drop-depth and subtree-depth overrides against max-depth", async () => {
    const page = await open({ tree: { maxDepth: 3 }, items: [
      { id: "deep", label: "Deep", container: true, dropDepth: 3 },
      { id: "tall", label: "Tall", subtreeDepth: 2 },
      { id: "flat", label: "Flat" },
    ] });
    await drag(page, "Flat", "deep", 0.5);
    await drag(page, "Tall", "flat", 0.8);
    assert.deepEqual(await events(page), [
      ["reorder-rejected", { sourceId: "flat", targetId: "deep", position: "inside", reason: "max-depth", maxDepth: 3, resultingDepth: 4, trigger: "pointer" }],
      ["reorder", { sourceId: "tall", targetId: "flat", position: "after", sourceType: "item", targetType: "item", sourceScope: "", targetScope: "", trigger: "pointer" }],
    ]);
    await page.close();
  });

  it("only drops into a container that accepts the item's drag type", async () => {
    const page = await open({ items: [
      { id: "pages", label: "Pages", container: true, accepts: "page", dragType: "folder" },
      { id: "note", label: "Note", dragType: "page" },
      { id: "photo", label: "Photo", dragType: "image" },
    ] });
    await drag(page, "Photo", "pages", 0.5);
    assert.deepEqual(await events(page), [], "an image is not accepted");
    // Nor can it be placed beside an item of another type.
    await drag(page, "Photo", "note", 0.2);
    assert.deepEqual(await events(page), [], "no reorder across drag types");
    await drag(page, "Note", "pages", 0.5);
    assert.deepEqual(await events(page), [["reorder", {
      sourceId: "note", targetId: "pages", position: "inside", sourceType: "page", targetType: "folder", sourceScope: "", targetScope: "", trigger: "pointer",
    }]]);
    await page.close();
  });

  it("does not drop an item into its own subtree", async () => {
    const page = await open({ items: files });
    await drag(page, "Docs", "guide", 0.8);
    assert.deepEqual(await events(page), []);
    await page.close();
  });

  it("uses the full row as the drag image, not just the handle", async () => {
    const page = await open({ items: files });
    await page.evaluate(() => {
      const calls: unknown[] = [];
      (window as unknown as { dragImages: unknown[] }).dragImages = calls;
      const original = DataTransfer.prototype.setDragImage;
      DataTransfer.prototype.setDragImage = function (image, x, y) {
        const rect = image.getBoundingClientRect();
        const item = image.closest('[role="treeitem"]');
        calls.push({ item: item?.getAttribute("data-item-id"), text: image.textContent?.trim(), width: rect.width, height: rect.height, itemWidth: item?.getBoundingClientRect().width, x, y });
        return original.call(this, image, x, y);
      };
    });
    const handle = (await page.getByRole("button", { name: "Drag Readme to reorder" }).boundingBox())!;
    const box = await rowBox(page, "readme");
    await drag(page, "Readme", "license", 0.8);
    const [call, ...rest] = await page.evaluate(() => (window as unknown as { dragImages: Record<string, number | string>[] }).dragImages);
    assert.deepEqual(rest, []);
    assert.equal(call!.item, "readme");
    assert.equal(call!.text, "Readme");
    assert.equal(call!.width, box.width);
    assert.equal(call!.width, call!.itemWidth);
    assert.equal(call!.height, box.height);
    assert.ok(Number(call!.width) > handle.width * 4, "wider than the handle");
    assert.ok(Number(call!.y) >= 0 && Number(call!.y) <= box.height, "grab point inside the row");
    await page.close();
  });

  it("dims the dragged row while dragging and restores it after", async () => {
    const page = await open({ items: files });
    const opacity = () => item(page, "readme").locator(":scope > :first-child").evaluate((row) => getComputedStyle(row).opacity);
    assert.equal(await opacity(), "1");
    await startDrag(page, "Readme");
    await dragOver(page, "license", 0.8);
    assert.ok(Number(await opacity()) < 1);
    await page.mouse.up();
    await page.waitForTimeout(50);
    assert.equal(await opacity(), "1");
    await page.close();
  });

  it("reorders with two clicks, without dragging", async () => {
    const page = await open({ items: files });
    await page.getByRole("button", { name: "Drag License to reorder" }).click();
    const box = await rowBox(page, "readme");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.2);
    assert.deepEqual(await events(page), [["reorder", {
      sourceId: "license", targetId: "readme", position: "before", sourceType: "item", targetType: "item", sourceScope: "", targetScope: "", trigger: "pointer",
    }]]);
    await page.close();
  });

  it("reorders with the keyboard and can cancel a move", async () => {
    const page = await open({ tree: { moveActivation: "keyboard-touch" }, items: files });
    const handle = page.getByRole("button", { name: "Drag Readme to reorder" });
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    assert.deepEqual(await events(page), [["reorder", {
      sourceId: "readme", targetId: "license", position: "after", sourceType: "item", targetType: "item", sourceScope: "", targetScope: "", trigger: "keyboard",
    }]]);
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Escape");
    assert.equal((await events(page)).length, 1);
    await page.close();
  });

  it("leaves desktop grip clicks inert in keyboard-touch mode but still drags", async () => {
    const page = await open({ tree: { moveActivation: "keyboard-touch" }, items: files });
    await page.getByRole("button", { name: "Drag Readme to reorder" }).click();
    assert.equal(await page.locator("[data-move-mode]").count(), 0);
    assert.equal(await item(page, "readme").getAttribute("data-dragging"), null);
    assert.equal(await page.getByRole("button", { name: "Cancel move" }).count(), 0);
    assert.deepEqual(await events(page), []);
    await page.evaluate(() => document.documentElement.setAttribute("data-ui-input-modality", "touch"));
    await page.getByRole("button", { name: "Drag Readme to reorder" }).click();
    assert.equal(await page.locator("[data-move-mode]").count(), 0);
    await drag(page, "Readme", "license", 0.8);
    assert.equal((await events(page))[0]?.[1].sourceId, "readme");
    assert.equal((await events(page))[0]?.[1].trigger, "pointer");
    await page.close();
  });

  it("visibly cancels a guided move without hover and restores grip focus", async () => {
    const page = await open({ tree: { moveActivation: "keyboard-touch" }, items: files });
    const handle = page.getByRole("button", { name: "Drag Readme to reorder" });
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.mouse.move(0, 0);
    const cancel = page.getByRole("button", { name: "Cancel move" });
    assert.equal(await cancel.isVisible(), true);
    assert.equal(await cancel.evaluate((button) => getComputedStyle(button.parentElement!).opacity), "1");
    await cancel.click();
    assert.equal(await page.locator("[data-move-mode], [data-dragging], [data-drop-position]").count(), 0);
    assert.deepEqual(await events(page), []);
    assert.equal(await handle.evaluate((button) => button === document.activeElement), true);
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Cancel moving Readme" }).click();
    assert.equal(await page.locator("[data-move-mode], [data-dragging]").count(), 0);
    assert.deepEqual(await events(page), []);
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.getByRole("button", { name: "Cancel move" }).focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("[data-move-mode], [data-dragging], [data-drop-position]").count(), 0);
    assert.deepEqual(await events(page), []);
    await page.close();
  });

  it("keeps a 44px move control available under touch input", async () => {
    const page = await open({ tree: { moveActivation: "keyboard-touch" }, items: files }, bundlePath, { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    await page.evaluate(() => document.documentElement.setAttribute("data-ui-input-modality", "touch"));
    const handle = page.getByRole("button", { name: "Drag Readme to reorder" });
    const box = await handle.boundingBox();
    assert.ok(box && Math.round(box.width) >= 44 && Math.round(box.height) >= 44, JSON.stringify(box));
    await handle.tap();
    assert.equal(await page.getByRole("button", { name: "Cancel move" }).isVisible(), true);
    const target = await rowBox(page, "license");
    await page.mouse.click(target.x + target.width / 2, target.y + target.height * 0.8);
    assert.equal((await events(page))[0]?.[1].trigger, "pointer");
    await page.close();
  });

  it("finds items by typed name and marks an empty lazy branch busy while opening", async () => {
    const page = await open({ items: [{ id: "remote", label: "Remote", lazy: true }, ...files] });
    assert.equal(await item(page, "remote").getAttribute("aria-expanded"), "false");
    await item(page, "readme").focus();
    await page.keyboard.press("l");
    assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset.itemId), "license");
    await item(page, "remote").getByRole("button", { name: "Expand Remote" }).click();
    assert.equal(await item(page, "remote").getAttribute("aria-busy"), "true");
    await page.close();
  });
});

describe("Tree selection", () => {
  it("requests one selected item on row click or Space in single mode", async () => {
    const page = await open({ tree: { selection: "single" }, items: files });
    await item(page, "readme").click();
    await item(page, "license").focus();
    await page.keyboard.press("Space");
    assert.deepEqual(await events(page), [
      ["select", { ids: ["readme"], trigger: "pointer" }],
      ["activate", { id: "readme", trigger: "pointer" }],
      ["select", { ids: ["license"], trigger: "keyboard" }],
    ]);
    await page.close();
  });

  it("shows multiple checkboxes and requests descendant selection together", async () => {
    const page = await open({ tree: { selection: "multiple" }, items: files });
    assert.equal(await page.locator('[role="tree"]').getAttribute("aria-multiselectable"), "true");
    const checkbox = item(page, "docs").locator(":scope > .row > .selection-hit > .selection-checkbox");
    assert.equal(await checkbox.isVisible(), true);
    await page.evaluate(() => document.documentElement.setAttribute("data-ui-input-modality", "touch"));
    const touchTarget = await item(page, "docs").locator(":scope > .row > .selection-hit").boundingBox();
    assert.ok(touchTarget && touchTarget.width >= 44 && touchTarget.height >= 44, JSON.stringify(touchTarget));
    await checkbox.click();
    assert.deepEqual(await events(page), [["select", { ids: ["docs", "guide", "api"], trigger: "pointer" }]]);
    await page.close();
  });

  it("follows a controlled Vue selection and marks a partially selected branch", async () => {
    const script = await bundle("vue-controlled-tree-selection", `
      import { createApp, h, ref } from "vue";
      import { Tree, TreeItem } from "@threadlabs/looma/vue";
      const ids = ref(["guide"]);
      window.events = [];
      createApp({ render: () => h(Tree, {
        label: "Files", selection: "multiple",
        onSelect: (event) => { window.events.push(["select", event.detail]); ids.value = event.detail.ids; },
      }, () => h(TreeItem, { itemId: "docs", label: "Docs", container: true, expanded: true, selected: ids.value.includes("docs") }, () => [
        h(TreeItem, { itemId: "guide", label: "Guide", selected: ids.value.includes("guide") }),
        h(TreeItem, { itemId: "api", label: "API", selected: ids.value.includes("api") }),
      ])) }).mount("#app");
    `);
    const page = await open({ items: [] }, script);
    const docsCheckbox = item(page, "docs").locator(":scope > .row > .selection-hit > .selection-checkbox");
    assert.equal(await docsCheckbox.evaluate((element: HTMLInputElement) => element.indeterminate), true);
    await item(page, "api").locator(":scope > .row > .selection-hit > .selection-checkbox").click();
    assert.deepEqual(await events(page), [["select", { ids: ["docs", "guide", "api"], trigger: "pointer" }]]);
    await page.waitForFunction(() => document.querySelector('[data-item-id="docs"]')?.getAttribute("aria-selected") === "true");
    assert.equal(await docsCheckbox.isChecked(), true);
    await page.waitForFunction(() => (document.querySelector('[data-item-id="api"] .selection-checkbox') as HTMLInputElement | null)?.checked === true);
    assert.equal(await item(page, "api").locator(":scope > .row > .selection-hit > .selection-checkbox").isChecked(), true);
    assert.equal(await docsCheckbox.evaluate((element: HTMLInputElement) => element.indeterminate), false);
    await docsCheckbox.click();
    assert.deepEqual((await events(page))[1], ["select", { ids: [], trigger: "pointer" }]);
    await page.close();
  });
});

describe("Tree marquee", () => {
  it("fades the title under persistent actions before pointer hover and respects RTL and touch", async () => {
    for (const touch of [false, true]) for (const direction of ["ltr", "rtl"]) {
      const page = await open({ tree: { actionsVisible: true }, items: [] }, marqueePath, { hasTouch: touch, isMobile: touch, viewport: { width: 375, height: 812 } });
      await page.locator("#app").evaluate((element, value) => { element.dir = value; }, direction);
      const state = await item(page, "long").evaluate(element => {
        const row = element.firstElementChild!;
        const label = row.querySelector<HTMLElement>(":scope > .label")!;
        const actions = row.querySelector<HTMLElement>(":scope > .actions")!;
        return { opacity: getComputedStyle(actions).opacity, mask: getComputedStyle(label).maskImage, clip: getComputedStyle(label).clipPath };
      });
      assert.equal(state.opacity, "1", "persistent controls are visible without hover");
      assert.match(state.mask, /linear-gradient/, "the title fades at rest");
      assert.equal(state.clip, "none", "no hard clipping edge beside controls");
      assert.ok(state.mask.includes(direction === "rtl" ? "to left" : "to right"));
      await page.close();
    }
  });
  const row = (page: Page) => item(page, "long").locator(":scope > :first-child");
  const moving = async (page: Page) => (await row(page).getAttribute("data-ui-marquee")) !== null;

  it("keeps a touch-focused label clear of its separate actions without a desktop mask", async () => {
    const page = await open({ items: [] }, marqueePath, {
      viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
    });
    const target = row(page);
    const bounds = (await target.boundingBox())!;
    await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const geometry = await target.evaluate((element) => {
      const label = element.querySelector<HTMLElement>(".label")!;
      const actions = element.querySelector<HTMLElement>(".actions")!;
      return { mask: getComputedStyle(label).maskImage,
        labelEnd: label.getBoundingClientRect().right,
        actionsStart: actions.getBoundingClientRect().left };
    });
    assert.equal(geometry.mask, "none");
    assert.ok(geometry.labelEnd <= geometry.actionsStart + 1);
    assert.equal(await moving(page), false);
    await page.close();
  });

  it("reserves an actions column for RTL touch rows and touch multiple selection", async () => {
    for (const direction of ["ltr", "rtl"]) {
      const page = await open({ tree: { selection: "multiple" }, items: [] }, marqueePath, {
        viewport: { width: 375, height: 812 }, hasTouch: true, reducedMotion: "reduce",
      });
      await page.evaluate((value) => {
        document.documentElement.dir = value;
        document.documentElement.dataset.uiInputModality = "touch";
      }, direction);
      await row(page).locator('.selection-checkbox').focus();
      const geometry = await row(page).evaluate((element) => {
        const label = element.querySelector<HTMLElement>(".label")!;
        const actions = element.querySelector<HTMLElement>(".actions")!;
        const labelBounds = label.getBoundingClientRect();
        const actionsBounds = actions.getBoundingClientRect();
        return { labelWidth: labelBounds.width, start: labelBounds.left, end: labelBounds.right,
          actionsStart: actionsBounds.left, actionsEnd: actionsBounds.right };
      });
      assert.ok(geometry.labelWidth > 20);
      assert.ok(direction === "ltr" ? geometry.end <= geometry.actionsStart + 1 : geometry.start >= geometry.actionsEnd - 1);
      await page.close();
    }
  });

  it("moves a slotted link title only as far as its visible letters require", async () => {
    const page = await open({ items: [] }, paddedMarqueePath, { reducedMotion: "no-preference" });
    const padded = item(page, "padded").locator(":scope > :first-child");
    await padded.hover();
    assert.equal(await padded.getAttribute("data-ui-marquee"), "");
    const measure = await padded.evaluate((element) => {
      const label = element.querySelector<HTMLElement>(".label")!;
      const track = element.querySelector<HTMLElement>(".label-text")!;
      const title = element.querySelector<HTMLElement>("[data-testid=title]")!;
      const actions = element.querySelector<HTMLElement>(".actions")!;
      track.style.animation = "none";
      return {
        textEnd: title.getBoundingClientRect().right,
        fadeStart: actions.getBoundingClientRect().left - Number.parseFloat(getComputedStyle(label).columnGap),
        distance: Number.parseFloat(getComputedStyle(element).getPropertyValue("--_marquee-distance")),
      };
    });
    assert.ok(Math.abs(measure.textEnd + measure.distance - measure.fadeStart) <= 1,
      `title should end at the fade, not ${measure.textEnd + measure.distance - measure.fadeStart}px beyond it`);
    await item(page, "short-link").hover();
    assert.equal(await item(page, "short-link").locator(":scope > :first-child").getAttribute("data-ui-marquee"), null,
      "a full-row link whose title fits beside the controls must stay still");
    await page.close();
  });

  it("fades a long name out before the icon and runs it again after a rest while hovered", async () => {
    const page = await open({ items: [] }, marqueePath, { reducedMotion: "no-preference", hasTouch: true });
    await page.evaluate(() => {
      const counts = { starts: 0 };
      (window as unknown as { counts: typeof counts }).counts = counts;
      document.addEventListener("animationstart", () => { counts.starts += 1; }, true);
    });
    await row(page).hover();
    assert.ok(await moving(page));
    const fade = await row(page).evaluate((element) => ({
      masks: Array.from(element.children).map((child) => getComputedStyle(child).maskImage).filter((mask) => mask !== "none"),
      // ponytail: the icon's slot box is its parent; the fade is measured against that box.
      icon: element.querySelector('[data-testid="icon"]')!.parentElement!.getBoundingClientRect().width,
    }));
    assert.ok(fade.masks.some((mask) => mask.includes(`rgba(0, 0, 0, 0) ${fade.icon}px`)), `the name is gone by the icon: ${fade.masks.join(" | ")}`);
    await row(page).evaluate((element) => element.style.setProperty("--_marquee-duration", "0.1s"));
    await page.waitForFunction(() => (window as unknown as { counts: { starts: number } }).counts.starts >= 2, null, { timeout: 5_000 });
    await page.mouse.move(0, 0);
    assert.equal(await moving(page), false);
    await page.close();
  });

  it("starts for a hovering pointer or keyboard focus, never for a touch", async () => {
    const page = await open({ items: [] }, marqueePath, { reducedMotion: "no-preference", hasTouch: true });
    const box = (await row(page).boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    assert.equal(await moving(page), false, "a tap neither hovers nor focuses it into motion");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    assert.ok(await moving(page), "arrowing onto the row starts it");
    await page.keyboard.press("ArrowUp");
    assert.equal(await moving(page), false);
    await page.close();
  });
});
