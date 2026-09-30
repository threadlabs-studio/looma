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

async function openEditor(html = "<p>Hello</p>", mode: "sticky" | "popover" = "sticky"): Promise<Page> {
  const page = await open(editorBundle, `<div id="app" style="width: 720px"></div><button id="outside">Outside</button>`, [
    join(root, "tokens.css"),
    join(root, "vue/components.css"),
  ]);
  await page.evaluate(({ value, mode }) => (window as unknown as { mountEditor(html: string, mode: string): void }).mountEditor(value, mode), { value: html, mode });
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
const linkForm = (page: Page) => page.locator(".looma-editor__link-form");

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
    window.mountEditor = (html, mode = "sticky") => {
      const content = ref(html);
      const toolbarOpen = ref(false);
      createApp({
        render: () => [
          mode === "popover" ? h("button", { id: "format-trigger", type: "button" }, "Formatting tools") : null,
          h(LoomaEditor, {
            modelValue: content.value,
            toolbarMode: mode,
            toolbarTriggerId: mode === "popover" ? "format-trigger" : undefined,
            toolbarOpen: toolbarOpen.value,
            "onUpdate:toolbarOpen": (value) => { toolbarOpen.value = value; },
            "onUpdate:modelValue": (value) => { content.value = value; },
          }),
        ],
      }).mount("#app");
    };
  `);
});

afterAll(async () => {
  await browser?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("LoomaEditor links", () => {
  it("shows link actions at a caret inside linked text and edits that link in place", async () => {
    const page = await openEditor('<p>See <a href="/guide" target="_self">guide</a> next</p>');
    const link = prose(page).getByRole("link", { name: "guide" });
    await link.click();
    const actions = page.getByRole("group", { name: "Link actions" });
    await actions.waitFor();
    assert.match(await actions.textContent() ?? "", /\/guide/);
    await actions.getByRole("button", { name: "Edit link" }).click();
    await linkForm(page).getByRole("textbox", { name: "URL" }).fill("/new-guide");
    await linkForm(page).getByRole("button", { name: "Save link" }).click();
    await equals(() => link.getAttribute("href"), "/new-guide", "caret link is edited");
    await prose(page).locator("p").click({ position: { x: 2, y: 8 } });
    await equals(() => actions.count(), 0, "link actions close outside the link");
    await link.click();
    await actions.getByRole("button", { name: "Remove link" }).click();
    await equals(() => prose(page).locator("a").count(), 0, "caret link is removed");
    await page.close();
  });

  it("reveals link actions when the keyboard moves the caret into a link", async () => {
    const page = await openEditor('<p>Before <a href="/guide">guide</a> after</p>');
    await prose(page).locator("p").click();
    await page.keyboard.press("Home");
    // "Before " is seven characters, so nine steps put the caret after "gu", inside the link.
    // Sampling the caret after every step raced the editor's own selection handling.
    for (let index = 0; index < 9; index++) await page.keyboard.press("ArrowRight");
    const actions = page.getByRole("group", { name: "Link actions" });
    await actions.waitFor();
    assert.match(await actions.textContent() ?? "", /\/guide/);
    await page.close();
  });

  it("embeds the full toolbar as one compact surface in a formatting popover", async () => {
    const page = await openEditor("<p>Formatting</p>", "popover");
    await page.getByRole("button", { name: "Formatting tools" }).click();
    const popover = page.locator(".looma-editor__formatting-popover");
    await popover.getByRole("toolbar", { name: "Editor toolbar" }).waitFor();
    const toolbar = popover.getByRole("toolbar", { name: "Editor toolbar" });
    assert.deepEqual(await toolbar.evaluate((element) => {
      const host = element.getRootNode() instanceof ShadowRoot
        ? (element.getRootNode() as ShadowRoot).host : element;
      const style = getComputedStyle(host);
      return { borderLeft: style.borderLeftWidth, paddingLeft: style.paddingLeft };
    }), { borderLeft: "1px", paddingLeft: "4px" });
    assert.equal(await popover.evaluate((element) => getComputedStyle(element.shadowRoot?.querySelector('.surface') ?? element.querySelector('.surface')!).paddingLeft), "0px");
    await page.close();
  });

  it("keeps selected text when the link button press collapses the editor selection", async () => {
    const page = await openEditor();
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+A");
    assert.equal(await page.evaluate(() => window.getSelection()?.toString()), "Hello");
    const linkButton = page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Link" });
    await linkButton.evaluate((button) => {
      button.addEventListener("pointerdown", () => {
        const selection = window.getSelection();
        selection?.collapseToEnd();
        document.dispatchEvent(new Event("selectionchange"));
      });
    });
    await linkButton.click();
    assert.equal(await linkForm(page).getByRole("textbox", { name: "Text" }).count(), 0);
    await page.close();
  });

  it("creates, edits, previews, and removes a link from selected text", async () => {
    const page = await openEditor();
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+A");
    assert.equal(await page.evaluate(() => window.getSelection()?.toString()), "Hello");
    const linkButton = page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Link" });
    await linkButton.click();
    assert.equal(await linkForm(page).getByRole("textbox", { name: "Text" }).count(), 0, "selected text does not need a text field");
    await linkForm(page).getByRole("textbox", { name: "URL" }).fill("javascript:alert(1)");
    await linkForm(page).getByRole("button", { name: "Save link" }).click();
    await linkForm(page).getByRole("alert").waitFor();
    assert.equal(await prose(page).locator("a").count(), 0);
    await linkForm(page).getByRole("textbox", { name: "URL" }).fill("https://example.com/page");
    assert.equal(await linkForm(page).getByRole("link", { name: "Preview link" }).getAttribute("rel"), "noopener noreferrer");
    await linkForm(page).getByRole("button", { name: "Save link" }).click();
    const link = prose(page).locator("a");
    await equals(() => link.getAttribute("href"), "https://example.com/page", "selected text becomes a link");
    assert.equal(await link.textContent(), "Hello");
    await link.click();
    await linkButton.click();
    assert.equal(await linkForm(page).getByRole("textbox", { name: "URL" }).inputValue(), "https://example.com/page");
    await linkForm(page).getByRole("checkbox", { name: "Open in new tab" }).uncheck();
    await linkForm(page).getByRole("textbox", { name: "URL" }).fill("/changed");
    await linkForm(page).getByRole("button", { name: "Save link" }).click();
    await equals(() => link.getAttribute("href"), "/changed", "existing link URL changes");
    assert.equal(await link.getAttribute("target"), "_self");
    await link.click();
    await linkButton.click();
    await linkForm(page).getByRole("button", { name: "Remove link" }).click();
    await equals(() => prose(page).locator("a").count(), 0, "link mark is removed");
    assert.equal(await prose(page).locator("p").textContent(), "Hello");
    await page.close();
  });

  it("inserts linked text at a caret", async () => {
    const page = await openEditor("<p></p>");
    await prose(page).locator("p").click();
    await page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Link" }).click();
    await linkForm(page).getByRole("textbox", { name: "Text" }).fill("Read more");
    await linkForm(page).getByRole("textbox", { name: "URL" }).fill("https://example.com");
    await linkForm(page).getByRole("button", { name: "Save link" }).click();
    await equals(() => prose(page).locator("a").textContent(), "Read more", "link text is inserted");
    await page.close();
  });
});

describe("LoomaEditor block actions", () => {
  it("duplicates, deletes, and inserts below the current top-level block", async () => {
    const page = await openEditor("<p>First</p><p>Second</p>");
    const paragraphs = () => prose(page).locator(":scope > p");
    const texts = () => paragraphs().allTextContents();
    const openActions = async () => {
      await page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Block actions" }).click();
    };
    await paragraphs().first().click();
    await openActions();
    await page.getByRole("menuitem", { name: "Duplicate block" }).click();
    assert.deepEqual(await texts(), ["First", "First", "Second"]);
    await paragraphs().nth(1).click();
    await openActions();
    await page.getByRole("menuitem", { name: "Delete block" }).click();
    assert.deepEqual(await texts(), ["First", "Second"]);
    await paragraphs().nth(1).click();
    await openActions();
    await page.getByRole("menuitem", { name: "Insert paragraph below" }).click();
    assert.deepEqual(await texts(), ["First", "Second", ""]);
    await page.close();
  });

  it("keeps block actions available in the mobile toolbar", async () => {
    const page = await openEditor("<p>Mobile</p>");
    await page.setViewportSize({ width: 390, height: 844 });
    await prose(page).locator("p").click();
    await page.locator(".looma-editor__mobile-toolbar-shell").getByRole("button", { name: "Block actions" }).click();
    await page.getByRole("menuitem", { name: "Duplicate block" }).click();
    assert.deepEqual(await prose(page).locator(":scope > p").allTextContents(), ["Mobile", "Mobile"]);
    await page.close();
  });
});

describe("LoomaEditor tables", () => {
  it("keeps table options reachable and dismissible in a short viewport", async () => {
    const page = await openEditor();
    await page.setViewportSize({ width: 800, height: 420 });
    await insertTableFromSlashMenu(page);
    await cell(page, 0, 0).click();
    await openTableMenu(page);
    const menu = tableMenu(page);
    const bounds = await menu.boundingBox();
    assert.ok(bounds && bounds.y >= 0 && bounds.y + bounds.height <= 420, "menu fits the viewport");
    const swatchShape = await menu.locator(".swatch").first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: parseFloat(style.width), height: parseFloat(style.height), radius: parseFloat(style.borderRadius) };
    });
    assert.equal(swatchShape.width, swatchShape.height, "swatch is square");
    assert.ok(swatchShape.radius >= swatchShape.width / 2, "swatch renders as a circle");
    await menu.getByRole("menuitem", { name: "Delete table" }).scrollIntoViewIfNeeded();
    assert.ok(await menu.evaluate((element) => element.scrollTop > 0), "menu scrolls to lower actions");
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    await openTableMenu(page);
    await page.locator("#outside").click();
    await menu.waitFor({ state: "hidden" });
    await page.close();
  });

  it("reorders rows and columns by dragging their grips", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await cell(page, 1, 0).click();
    await page.keyboard.type("Row A");
    await cell(page, 2, 0).click();
    await page.keyboard.type("Row B");
    await cell(page, 1, 1).click();
    await page.keyboard.type("Column A");
    await cell(page, 1, 2).click();
    await page.keyboard.type("Column B");
    const overlay = page.locator('[data-component="ui-editor-table-overlay"]');
    await cell(page, 2, 0).hover();
    const rowGrip = overlay.getByRole("button", { name: "Row actions" });
    const rowBox = await rowGrip.boundingBox();
    const targetRow = await cell(page, 1, 0).boundingBox();
    assert.ok(rowBox && targetRow);
    await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(rowBox.x + rowBox.width / 2, targetRow.y + targetRow.height / 2, { steps: 6 });
    assert.equal(await overlay.locator("[data-drop-indicator]").getAttribute("hidden"), null, "row drop indicator appears");
    await page.mouse.up();
    await equals(() => cell(page, 1, 0).textContent(), "Row B", "row moved by drag");
    assert.equal(await page.locator('[data-component="ui-editor-table-context-menu"]').count(), 0, "drag does not open an action menu");
    await cell(page, 2, 2).hover();
    const columnGrip = overlay.getByRole("button", { name: "Column actions" });
    const columnBox = await columnGrip.boundingBox();
    const targetColumn = await cell(page, 2, 1).boundingBox();
    assert.ok(columnBox && targetColumn);
    await page.mouse.move(columnBox.x + columnBox.width / 2, columnBox.y + columnBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetColumn.x + targetColumn.width / 2, columnBox.y + columnBox.height / 2, { steps: 6 });
    await page.mouse.up();
    await equals(() => cell(page, 2, 1).textContent(), "Column B", "column moved by drag");
    await page.close();
  });

  it("spaces a paragraph following a table", async () => {
    const page = await openEditor("<table><tbody><tr><td><p>Cell</p></td></tr></tbody></table><p>After</p>");
    const followingParagraph = prose(page).locator(".tableWrapper + p");
    assert.equal(await followingParagraph.count(), 1, "paragraph follows the table wrapper");
    assert.ok(parseFloat(await style(followingParagraph, "margin-top")()) > 0, "paragraph has space after the table");
    await page.close();
  });
  // The toolbar's "Insert table" opens the grid through the popover anchored to it (`for`).
  it("inserts a table sized from the toolbar's insert-table grid", async () => {
    const page = await openEditor();
    await prose(page).click();
    const insertTable = page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Insert table" });
    await insertTable.click();
    await equals(() => insertTable.getAttribute("aria-expanded"), "true", "Insert table opens the grid");
    const grid = page.locator('[data-component="ui-editor-insert-table-grid"]');
    await grid.getByRole("group", { name: "Table dimensions" }).waitFor();
    const hint = async () => (await grid.textContent())?.match(/\d+ × \d+/)?.[0];
    const twoByTwo = grid.getByRole("button", { name: "2 rows by 2 columns" });
    await grid.getByRole("button", { name: "5 rows by 5 columns" }).hover();
    await equals(hint, "5 × 5", "hovering another cell previews it");
    await twoByTwo.hover();
    await equals(hint, "2 × 2", "hovering previews 2 × 2");
    await twoByTwo.click();
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

  it("toggles header row and column from table options with checked state", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await cell(page, 0, 0).click();
    await openTableMenu(page);
    const headerRow = () => tableMenu(page).getByRole("menuitemcheckbox", { name: "Header row" });
    assert.equal(await headerRow().getAttribute("aria-checked"), "true");
    await headerRow().click();
    await equals(() => rows(page).first().locator("th").count(), 0, "first row becomes data cells");
    await openTableMenu(page);
    assert.equal(await headerRow().getAttribute("aria-checked"), "false");
    await headerRow().click();
    await equals(() => rows(page).first().locator("th").count(), 3, "first row is a header again");

    await openTableMenu(page);
    const headerColumn = () => tableMenu(page).getByRole("menuitemcheckbox", { name: "Header column" });
    assert.equal(await headerColumn().getAttribute("aria-checked"), "false");
    await headerColumn().click();
    await equals(() => rows(page).nth(1).locator("th").count(), 1, "first column becomes a header");
    await openTableMenu(page);
    assert.equal(await headerColumn().getAttribute("aria-checked"), "true");
    await cell(page, 1, 0).click({ button: "right" });
    const context = page.locator('[data-component="ui-editor-table-context-menu"]');
    await context.waitFor();
    assert.equal(await context.getByRole("menuitemcheckbox", { name: "Header column" }).getAttribute("aria-checked"), "true");
    await page.close();
  });

  it("moves rows and columns through the table action menu", async () => {
    const page = await openEditor();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await insertTableFromSlashMenu(page);
    await cell(page, 1, 0).click();
    await page.keyboard.type("Row A");
    await cell(page, 2, 0).click();
    await page.keyboard.type("Row B");
    await cell(page, 2, 0).click({ button: "right" });
    const context = () => page.locator('[data-component="ui-editor-table-context-menu"]');
    assert.deepEqual(errors, []);
    assert.equal(await context().count(), 1);
    await context().getByRole("menuitem", { name: "Move row up" }).click();
    await equals(() => cell(page, 1, 0).textContent(), "Row B", "the lower row moves above its sibling");

    await cell(page, 1, 1).click();
    await page.keyboard.type("Column A");
    await cell(page, 1, 2).click();
    await page.keyboard.type("Column B");
    await cell(page, 1, 2).click({ button: "right" });
    await context().getByRole("menuitem", { name: "Move column left" }).click();
    await equals(() => cell(page, 1, 1).textContent(), "Column B", "the right column moves left");
    await page.close();
  });

  it("opens row and column menus from their overlay handles", async () => {
    const page = await openEditor();
    await insertTableFromSlashMenu(page);
    await cell(page, 1, 1).hover();
    const overlay = page.locator('[data-component="ui-editor-table-overlay"]');
    const context = page.locator('[data-component="ui-editor-table-context-menu"]');
    await overlay.getByRole("button", { name: "Row actions" }).click();
    await context.waitFor();
    assert.equal(await context.getByRole("menuitem", { name: "Move row up" }).count(), 1);
    assert.equal(await context.getByRole("menuitem", { name: "Move column left" }).count(), 0);
    assert.equal(await page.locator(".selectedCell").count(), 3);
    await cell(page, 1, 1).hover();
    await overlay.getByRole("button", { name: "Column actions" }).click();
    await context.waitFor();
    assert.equal(await context.getByRole("menuitem", { name: "Move column left" }).count(), 1);
    assert.equal(await context.getByRole("menuitem", { name: "Move row up" }).count(), 0);
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
