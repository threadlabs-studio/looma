// Drives LoomaEditor's table and slash-menu UI from the built package (run `pnpm build` first) in
// Chromium, through the public surface only: roles, accessible names, ARIA state, data-component,
// computed styles, and geometry. Helpers are copied from browser.test.ts on purpose.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import { build } from "vite";
import { afterAll, beforeAll, describe, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let directory = "";
let browser: Browser;
let editorBundle = "";

async function bundle(name: string, source: string): Promise<string> {
  const entry = join(directory, `${name}.js`);
  await writeFile(entry, source);
  await build({
    configFile: false,
    logLevel: "silent",
    root: directory,
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

async function open(bundlePath: string, body: string, css: readonly string[]): Promise<Page> {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html><body>${body}</body></html>`);
  for (const path of css) await page.addStyleTag({ path });
  await page.addScriptTag({ path: bundlePath });
  await page.waitForTimeout(50);
  assert.deepEqual(errors, []);
  return page;
}

/** Polls `read` until it satisfies `check`, failing with the last value seen. */
async function until<T>(read: () => Promise<T>, check: (value: T) => boolean, message: string): Promise<T> {
  let value = await read();
  for (const deadline = Date.now() + 5000; !check(value) && Date.now() < deadline;) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    value = await read();
  }
  assert.ok(check(value), `${message} (last value: ${JSON.stringify(value)})`);
  return value;
}

const equals = <T>(read: () => Promise<T>, expected: T, message: string) =>
  until(read, (value) => value === expected, `${message}: expected ${JSON.stringify(expected)}`);

const style = (locator: Locator, property: string) => () =>
  locator.evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);

async function openEditor(html = "<p>Hello</p>"): Promise<Page> {
  const page = await open(editorBundle, `<div id="app" style="width: 720px"></div><button id="outside">Outside</button>`, [
    join(root, "tokens.css"),
    join(root, "vue/components.css"),
  ]);
  await page.evaluate((value) => (window as unknown as { mountEditor(html: string): void }).mountEditor(value), html);
  page.setDefaultTimeout(5000);
  await page.locator(".ProseMirror").waitFor();
  return page;
}

const prose = (page: Page) => page.locator(".ProseMirror");
const table = (page: Page) => prose(page).locator("table").last();
const rows = (page: Page) => table(page).locator("tr");
const cell = (page: Page, row: number, col: number) => rows(page).nth(row).locator("th, td").nth(col);
const tableToolbar = (page: Page) => page.getByRole("toolbar", { name: "Table actions" });
const tableMenu = (page: Page) => page.getByRole("menu", { name: "More table actions" });

async function insertTableFromSlashMenu(page: Page): Promise<void> {
  await prose(page).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/tab");
  await page.getByRole("option", { name: /table insert a table/i }).click();
  await table(page).waitFor();
}

async function openTableMenu(page: Page): Promise<void> {
  await tableToolbar(page).getByRole("button", { name: "Table options" }).click();
  await tableMenu(page).waitFor();
}

async function selectFirstTwoCells(page: Page): Promise<void> {
  await cell(page, 0, 0).click();
  await page.keyboard.down("Shift");
  await cell(page, 0, 1).click();
  await page.keyboard.up("Shift");
}

beforeAll(async () => {
  await mkdir(join(root, ".build"), { recursive: true });
  directory = await mkdtemp(join(root, ".build", "editor-table-"));
  browser = await chromium.launch();
  editorBundle = await bundle("vue-looma-editor-table", `
    import { createApp, h, ref } from "vue";
    import { LoomaEditor } from "@threadlabs/looma/vue/editor";
    window.mountEditor = (html) => {
      const content = ref(html);
      createApp({
        render: () => h(LoomaEditor, { modelValue: content.value, toolbarMode: "sticky", "onUpdate:modelValue": (value) => { content.value = value; } }),
      }).mount("#app");
    };
  `);
});

afterAll(async () => {
  await browser?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("LoomaEditor tables", () => {
  // The toolbar's "Insert table" opens the grid through the popover anchored to it (`for`).
  it("inserts a table sized from the toolbar's insert-table grid", async () => {
    const page = await openEditor();
    await prose(page).click();
    const insertTable = page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Insert table" });
    await insertTable.click();
    await equals(() => insertTable.getAttribute("aria-expanded"), "true", "Insert table opens the grid");
    const grid = page.locator('[data-component="ui-editor-insert-table-grid"]');
    await grid.getByRole("group", { name: "Table dimensions" }).waitFor();
    const hint = async () => (await grid.textContent())?.match(/\d+ × \d+( selected)?/)?.[0];
    const twoByTwo = grid.getByRole("button", { name: "2 rows by 2 columns" });
    await twoByTwo.hover();
    await equals(hint, "2 × 2", "hovering previews 2 × 2");
    await twoByTwo.click();
    await equals(hint, "2 × 2 selected", "clicking selects 2 × 2");
    await equals(() => twoByTwo.getAttribute("aria-pressed"), "true", "selected cell is pressed");
    await grid.getByRole("button", { name: "5 rows by 5 columns" }).hover();
    await equals(hint, "5 × 5", "hovering another cell previews it");
    // Insert uses the selected size, not the last preview.
    await grid.getByRole("button", { name: "Insert table", exact: true }).click();
    await table(page).waitFor();
    assert.equal(await rows(page).count(), 2);
    assert.equal(await rows(page).nth(0).locator("th, td").count(), 2);
    await page.close();
  });

  it("inserts a 3 × 3 table from the slash menu", async () => {
    const page = await openEditor();
    await prose(page).click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/tab");
    const slash = page.locator('[data-component="ui-editor-slash-menu"]');
    await slash.getByRole("option", { name: /table/i }).first().waitFor();
    await slash.getByRole("option", { name: /table insert a table/i }).click();
    await table(page).waitFor();
    assert.equal(await rows(page).count(), 3);
    assert.equal(await rows(page).nth(0).locator("th, td").count(), 3);
    await page.close();
  });

  it("aligns cell text from the table toolbar", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    const first = cell(page, 0, 0);
    await first.click();
    const toolbar = tableToolbar(page);
    await toolbar.waitFor();
    assert.equal(await toolbar.getByRole("button", { name: "Left" }).getAttribute("aria-pressed"), "true");
    await equals(style(first, "text-align"), "left", "cell starts left-aligned");
    for (const name of ["Center", "Right", "Left"]) {
      await toolbar.getByRole("button", { name }).click();
      await equals(() => toolbar.getByRole("button", { name }).getAttribute("aria-pressed"), "true", `${name} is pressed`);
      await equals(style(first, "text-align"), name.toLowerCase(), `cell is ${name.toLowerCase()}-aligned`);
    }
    await page.close();
  });

  it("lists table options and edits rows from the table toolbar", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await cell(page, 0, 0).click();
    const options = tableToolbar(page).getByRole("button", { name: "Table options" });
    await openTableMenu(page);
    assert.equal(await options.getAttribute("aria-expanded"), "true");
    const text = (await tableMenu(page).textContent()) ?? "";
    for (const section of ["Structure", "Background", "Cells", "Table", "Clear selected cells"]) {
      assert.ok(text.includes(section), `menu shows ${section}`);
    }
    assert.ok(!text.includes("Merge selected cells"), "merge is hidden for a single cell");
    assert.ok(!text.includes("Split merged cell"), "split is hidden for an unmerged cell");
    await tableMenu(page).getByRole("menuitem", { name: /delete row/i }).click();
    await equals(() => rows(page).count(), 2, "row deleted");
    await tableToolbar(page).getByRole("button", { name: /add row/i }).click();
    await equals(() => rows(page).count(), 3, "row added");
    await page.close();
  });

  it("reveals only the hovered row boundary's insertion handle, which adds a row", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await cell(page, 0, 0).click();
    const overlay = page.locator('[data-component="ui-editor-table-overlay"]');
    const handles = overlay.getByRole("button", { name: "Insert row below" });
    await handles.first().waitFor();
    const handle = handles.nth(0);
    const sibling = handles.nth(1);
    await equals(style(handle, "opacity"), "0", "handle is hidden before hover");
    const bounds = await handle.boundingBox();
    assert.ok(bounds, "row insertion handle has bounds");
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await equals(style(handle, "opacity"), "1", "hovered handle shows");
    await equals(style(sibling, "opacity"), "0", "other boundary's handle stays hidden");
    await handle.click();
    await equals(() => rows(page).count(), 4, "row inserted");
    await page.close();
  });

  it("widens a column by dragging a cell's right edge without overflowing the editor", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    const first = cell(page, 0, 0);
    await first.click();
    const bounds = await first.boundingBox();
    assert.ok(bounds, "first cell has bounds");
    const y = bounds.y + bounds.height / 2;
    await page.mouse.move(bounds.x + bounds.width - 2, y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width + 96, y, { steps: 6 });
    await page.mouse.up();
    await until(() => first.evaluate((element) => element.getBoundingClientRect().width), (width) => width > bounds.width + 80, "column widens by about the drag");
    const [editorBox, tableBox] = await Promise.all([prose(page).boundingBox(), table(page).boundingBox()]);
    assert.ok(editorBox && tableBox);
    assert.ok(tableBox.width - editorBox.width <= 1, `table (${tableBox.width}px) fits the editor (${editorBox.width}px)`);
    await page.close();
  });

  it("colors, merges, and splits a multi-cell selection", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await selectFirstTwoCells(page);
    await openTableMenu(page);
    await tableMenu(page).getByRole("menuitemradio", { name: /blue/i }).click();
    await equals(style(cell(page, 0, 0), "background-color"), "rgb(219, 234, 254)", "first cell is blue");
    await equals(style(cell(page, 0, 1), "background-color"), "rgb(219, 234, 254)", "second cell is blue");

    await selectFirstTwoCells(page);
    await openTableMenu(page);
    await tableMenu(page).getByRole("menuitem", { name: "Merge selected cells" }).click();
    await equals(() => rows(page).nth(0).locator("th, td").count(), 2, "cells merged");
    await openTableMenu(page);
    await tableMenu(page).getByRole("menuitem", { name: "Split merged cell" }).click();
    await equals(() => rows(page).nth(0).locator("th, td").count(), 3, "cell split");
    await page.close();
  });

  it("edits a cell from the right-click context menu", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    const first = cell(page, 0, 0);
    await first.click({ button: "right" });
    const menu = page.locator('[data-component="ui-editor-table-context-menu"][role="menu"]');
    await menu.waitFor();
    const bounds = await menu.boundingBox();
    assert.ok(bounds && bounds.width <= 280, `context menu is at most 280px wide (${bounds?.width})`);
    const text = (await menu.textContent()) ?? "";
    for (const section of ["Cell background", "Structure", "Table"]) assert.ok(text.includes(section), `menu shows ${section}`);
    assert.equal(await menu.locator("button:disabled").count(), 0, "no disabled actions");
    await menu.getByRole("menuitemradio", { name: /yellow/i }).click();
    await equals(style(first, "background-color"), "rgb(254, 243, 199)", "cell is yellow");

    await first.click({ button: "right" });
    await menu.waitFor();
    await menu.getByRole("menuitem", { name: /add column right/i }).click();
    await equals(() => rows(page).nth(0).locator("th, td").count(), 4, "column added");
    await page.close();
  });

  it("hides the table toolbar when focus leaves the table", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await cell(page, 0, 0).click();
    await tableToolbar(page).waitFor();
    await page.locator("#outside").click();
    await tableToolbar(page).waitFor({ state: "hidden" });
    await page.close();
  });
});
