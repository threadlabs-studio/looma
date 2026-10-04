// Drives LoomaEditor's table and slash-menu UI from the built package (run `pnpm build` first) in
// Chromium, through the public surface only: roles, accessible names, ARIA state, data-component,
// computed styles, and geometry. Helpers are copied from browser.test.ts on purpose.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContextOptions, type Locator, type Page } from "playwright";
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

async function open(bundlePath: string, body: string, css: readonly string[], options: BrowserContextOptions = {}): Promise<Page> {
  const page = await browser.newPage(options);
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

async function openEditor(html = "<p>Hello</p>", mode: "sticky" | "popover" = "sticky", links = false, options: BrowserContextOptions = {}, inventory?: string): Promise<Page> {
  const page = await open(editorBundle, `<div id="app" style="width: 720px"></div><button id="outside">Outside</button>`, [
    join(root, "tokens.css"),
    join(root, "vue/components.css"),
  ], options);
  await page.route(/https:\/\/example\.test\/(?:image|rendition)\.svg/, route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><rect width="320" height="160" fill="#e4f1ed"/><circle cx="252" cy="42" r="22" fill="#f0c569"/><path d="M0 160V112L80 64L184 144L240 108L320 156V160Z" fill="#569d86"/></svg>' }));
  await page.evaluate(({ value, mode, links, inventory }) => (window as unknown as { mountEditor(html: string, mode: string, links: boolean, inventory?: string): void }).mountEditor(value, mode, links, inventory), { value: html, mode, links, inventory });
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
    window.mountEditor = (html, mode = "sticky", links = false, inventory) => {
      const content = ref(html);
      const editable = ref(true);
      window.fixtureSetEditable = value => { editable.value = value; };
      window.fixtureActivations = [];
      window.fixtureRenditionErrors = [];
      const toolbarOpen = ref(false);
      const slashMode = ref(inventory);
      const emptyCommands = [];
      window.fixtureSetSlashMode = mode => { slashMode.value = mode; };
      const hostCommands = ["alpha", "beta"].map(name => ({
        id: "host-" + name, title: "Host content", description: name + " content", group: "Host content", icon: "tag", keywords: ["host", name],
        command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent(name.toUpperCase()).run(),
      }));
      const extend = defaults => [...defaults, ...hostCommands];
      const targets = [
        { id: "one", label: "Guide", detail: "Team / Guides", href: "/records/one" },
        { id: "two", label: "Guide", detail: "Personal / Guides", href: "/records/two" },
        ...Array.from({ length: 5 }, (_, index) => ({ id: "more-" + index, label: "More " + (index + 1), detail: "Team / References", href: "/records/more-" + index })),
      ];
      createApp({
        render: () => [
          mode === "popover" ? h("button", { id: "format-trigger", type: "button" }, "Formatting tools") : null,
          h(LoomaEditor, {
            modelValue: content.value,
            editable: editable.value,
            onImageActivate: value => window.fixtureActivations.push(value),
            onImageRenditionError: value => window.fixtureRenditionErrors.push(value),
            resolveImageAttributes: inventory === "rendition" ? () => ({ src: "https://example.test/rendition.svg", srcset: "https://example.test/rendition.svg 2x", sizes: "320px", decoding: "async" }) : undefined,
            slashCommands: slashMode.value === "extend" ? extend : slashMode.value === "replace" ? hostCommands : slashMode.value === "empty" ? emptyCommands : undefined,
            onReady: (editor) => { window.fixtureEditor = editor; },
            linkSearch: links ? async (query) => targets.filter(target => target.label.toLowerCase().includes(query.toLowerCase())) : undefined,
            linkResolve: links ? async (href) => targets.find(target => target.href === href) ?? null : undefined,
            linkTargetLabel: "Page",
            linkBaseUrl: links ? "https://example.test" : undefined,
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
  it("opens the existing link form from slash, selects a host result by keyboard, and cancels", async () => {
    const page = await openEditor("<p>Read </p>", "sticky", true);
    await prose(page).locator("p").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" /link");
    await page.getByRole("option", { name: /Link Link to a destination or URL/i }).waitFor();
    await page.keyboard.press("Enter");
    const form = linkForm(page);
    await form.getByRole("searchbox", { name: "Link destination" }).fill("Guide");
    await equals(() => form.getByLabel("Destination search results").getByRole("button").count(), 2, "host results are ready for keyboard selection");
    await mkdir(join(root, "../../.context"), { recursive: true });
    await page.screenshot({ animations: "disabled", path: join(root, "../../.context/link-verification.png") });
    await form.getByRole("searchbox").press("ArrowDown");
    await page.keyboard.press("Enter");
    await form.getByRole("textbox", { name: "Text", exact: true }).fill("Guide");
    await form.getByRole("button", { name: "Save link" }).click();
    await equals(() => prose(page).getByRole("link", { name: "Guide" }).getAttribute("href"), "/records/one", "slash uses the same host picker");
    await prose(page).getByRole("link", { name: "Guide" }).click();
    await page.getByRole("group", { name: "Link actions" }).waitFor();
    await page.screenshot({ animations: "disabled", path: join(root, "../../.context/link-actions-verification.png") });
    await prose(page).locator("p").click();
    await page.keyboard.press("End");
    await page.keyboard.type(" /link");
    await page.getByRole("option", { name: /Link Link to a destination or URL/i }).waitFor();
    await page.keyboard.press("Enter");
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await prose(page).locator("a").count(), 1, "cancel inserts no second link");
    await page.close();
  });

  it("uses one standard form hierarchy with flat results and a primary save action", async () => {
    const page = await openEditor("<p>Hello</p>", "sticky", true);
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.getByRole("toolbar").getByRole("button", { name: "Link" }).click();
    const form = linkForm(page);
    await form.getByRole("heading", { name: "Add link" }).waitFor({ timeout: 1000 });
    await form.getByRole("searchbox", { name: "Link destination" }).fill("Guide");
    await equals(() => form.locator('[data-component="ui-search-result-row"]').count(), 2, "results use flat component rows");
    assert.match(await form.getByRole("button", { name: "Save link" }).getAttribute("data-ui-button-state") ?? "", /variant=solid/);
    assert.equal(await form.getByRole("searchbox").getAttribute("placeholder"), "Search pages or paste a URL…");
    assert.equal(await form.getByRole("tab").count(), 0, "one field replaces destination modes");
    assert.equal(await form.getByRole("searchbox").evaluate(element => getComputedStyle(element).outlineStyle), "none", "input group owns one focus treatment");
    await page.screenshot({ animations: "disabled", path: join(root, ".build", "link-picker-desktop.png") });
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await prose(page).locator("a").count(), 0, "cancel keeps content unchanged");
    await form.waitFor({ state: "hidden" });
    await page.close();
  });

  it("keeps a phone link trigger mounted throughout a held pointer press and field focus", async () => {
    const page = await openEditor("<p>Hello</p>", "popover", true);
    await page.setViewportSize({ width: 375, height: 760 });
    await prose(page).locator("p").click({ position: { x: 8, y: 8 } });
    const trigger = page.locator(".looma-editor__mobile-toolbar-shell").getByRole("button", { name: "Link" });
    await trigger.hover();
    await page.mouse.down();
    // A real press is held briefly; an instantaneous automated click can miss the blur race.
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 100)));
    assert.equal(await trigger.count(), 1, "the press cannot remove its own trigger");
    await page.mouse.up();
    const form = linkForm(page);
    await form.getByRole("searchbox", { name: "Link destination" }).fill("More");
    await equals(() => form.locator('[data-component="ui-search-result-row"]').count(), 5, "results appear");
    assert.equal(await trigger.count(), 1, "the field keeps its mobile anchor mounted");
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.close();
  });

  it("keeps the icon gap compact and shows three results before scrolling", async () => {
    for (const width of [1280, 375]) {
      const page = await openEditor("<p>Hello</p>", "sticky", true);
      await page.addStyleTag({ content: "body { font: 16px/1.5 sans-serif; } button { font: inherit; }" });
      await page.setViewportSize({ width, height: 760 });
      await prose(page).locator("p").dblclick({ position: { x: 16, y: 8 } });
      const toolbar = width === 375 ? page.locator(".looma-editor__mobile-toolbar-shell") : page.getByRole("toolbar");
      await toolbar.getByRole("button", { name: "Link" }).click();
      const form = linkForm(page);
      const input = form.getByRole("searchbox", { name: "Link destination" });
      await input.fill("More");
      const results = form.getByLabel("Destination search results");
      const rows = results.locator('[data-component="ui-search-result-row"]');
      await equals(() => rows.count(), 5, "remaining results are available to scroll");
      const iconBox = await form.locator('[data-component="ui-input-group"] svg').first().boundingBox();
      const inputBox = await input.boundingBox();
      const padding = Number.parseFloat(await input.evaluate(element => getComputedStyle(element).paddingInlineStart));
      assert.ok(iconBox && inputBox && inputBox.x + padding - iconBox.x - iconBox.width <= 8.5, "one icon-to-value gap");
      const resultBox = await results.boundingBox();
      const rowBox = await rows.first().boundingBox();
      assert.ok(resultBox && rowBox && resultBox.height >= rowBox.height * 3 + 24 - 1, "three complete rows stay ahead of the overflow fade");
      assert.ok(resultBox && rowBox && resultBox.height < rowBox.height * 4, "the next row is only an overflow hint");
      assert.ok(await results.evaluate(element => element.scrollHeight > element.clientHeight), "additional results scroll");
      await page.screenshot({ animations: "disabled", path: join(root, ".build", `link-picker-three-${width}.png`) });
      await results.hover();
      await page.mouse.wheel(0, 300);
      await until(() => results.evaluate(element => element.scrollTop), value => value > 0, "last result remains reachable by scrolling");
      await rows.last().click();
      await form.getByRole("button", { name: "Save link" }).click();
      await equals(() => prose(page).getByRole("link").getAttribute("href"), "/records/more-4", "scrolled result can be selected");
      await page.close();
    }
  });

  it("opens the same link picker from the slash command", async () => {
    const page = await openEditor("<p></p>", "sticky", true);
    await prose(page).locator("p").click();
    await page.keyboard.type("/link");
    await page.getByRole("option", { name: /link link to a destination or url/i }).click();
    await linkForm(page).getByRole("searchbox", { name: "Link destination" }).waitFor();
    assert.equal(await prose(page).locator("p").textContent(), "");
    await page.close();
  });

  it("normalizes same-site links pasted over selected text and in HTML without changing existing links", async () => {
    const page = await openEditor('<p>Hello</p><p><a href="https://example.test/old">Existing</a></p>', "sticky", true);
    await prose(page).locator("p").first().dblclick({ position: { x: 16, y: 8 } });
    await equals(() => page.evaluate(() => window.getSelection()?.toString()), "Hello", "paste starts with the text selected");
    await equals(() => page.evaluate(() => {
      const editor = (window as unknown as { fixtureEditor: { state: { selection: { from: number; to: number }; doc: { textBetween(from: number, to: number): string } } } }).fixtureEditor;
      return editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
    }), "Hello", "editor selection has synchronized before native paste");
    await prose(page).evaluate(element => {
      const data = new DataTransfer();
      data.setData("text/plain", "https://example.test/path?q=one#part");
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
    });
    await equals(() => prose(page).getByRole("link", { name: "Hello" }).getAttribute("href"), "/path?q=one#part", "URL paste keeps selected text and becomes relative");
    assert.equal(await prose(page).getByRole("link", { name: "Existing" }).getAttribute("href"), "https://example.test/old", "untouched links remain authored");
    await page.keyboard.press("ControlOrMeta+z");
    await equals(() => prose(page).getByRole("link", { name: "Hello" }).count(), 0, "normalization is undone with the paste");
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+End");
    await prose(page).evaluate(element => {
      const data = new DataTransfer();
      data.setData("text/html", '<p><a href="https://example.test/inside#part">Inside</a> <a href="https://elsewhere.test/outside">Outside</a></p>');
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
    });
    await equals(() => prose(page).getByRole("link", { name: "Inside" }).getAttribute("href"), "/inside#part", "HTML paste normalizes site links");
    assert.equal(await prose(page).getByRole("link", { name: "Outside" }).getAttribute("href"), "https://elsewhere.test/outside");
    await page.close();
  });

  it("links selected text from the selection menu and closes both menus", async () => {
    const page = await openEditor("<p>Hello</p>", "popover", true);
    await prose(page).locator("p").dblclick({ position: { x: 16, y: 8 } });
    const toolbar = page.getByRole("toolbar", { name: "Editor toolbar" });
    await toolbar.getByRole("button", { name: "Link" }).click();
    const form = linkForm(page);
    await form.getByRole("searchbox", { name: "Link destination" }).fill("https://example.test/path?q=one#part");
    await form.getByRole("button", { name: "Save link" }).click();
    await equals(() => prose(page).getByRole("link").getAttribute("href"), "/path?q=one#part", "site link becomes relative");
    await form.waitFor({ state: "hidden" });
    await toolbar.waitFor({ state: "hidden" });
    assert.equal(await prose(page).textContent(), "Hello", "selection text is preserved");
    await prose(page).locator("p").dblclick({ position: { x: 16, y: 8 } });
    await toolbar.getByRole("button", { name: "Link" }).click();
    await form.getByRole("button", { name: "Cancel", exact: true }).click();
    await form.waitFor({ state: "hidden" });
    await toolbar.waitFor({ state: "hidden" });
    await page.close();
  });

  it("searches host targets, keeps their identity URL, and describes the chosen target", async () => {
    const page = await openEditor("<p>Hello</p>", "sticky", true);
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Link" }).click();
    const form = linkForm(page);
    await form.getByRole("searchbox", { name: "Link destination" }).fill("Guide");
    const results = form.getByLabel("Destination search results").getByRole("button");
    await equals(() => results.count(), 2, "duplicate titles keep distinct context");
    await form.getByRole("searchbox", { name: "Link destination" }).press("ArrowDown");
    assert.equal(await results.first().evaluate(element => document.activeElement === element), true);
    await results.nth(1).click();
    await form.getByRole("button", { name: "Save link" }).click();
    const link = prose(page).getByRole("link", { name: "Hello" });
    await equals(() => link.getAttribute("href"), "/records/two", "host destination is saved");
    assert.equal(await link.getAttribute("target"), "_self");
    await link.click();
    await until(() => page.getByRole("group", { name: "Link actions" }).textContent(), value => value?.includes("Personal / Guides") ?? false, "context shows resolved target");
    assert.equal(await page.getByRole("group", { name: "Link actions" }).getByLabel("Page: Guide").count(), 1);
    const context = page.getByRole("group", { name: "Link actions" });
    const title = context.locator("strong");
    const detail = context.locator("small");
    assert.match(await title.evaluate(element => getComputedStyle(element).fontFamily), /sans-serif/, "portaled controls keep the UI font even on a serif page");
    const titleBox = await title.boundingBox();
    const detailBox = await detail.boundingBox();
    assert.ok(titleBox && detailBox && detailBox.y - titleBox.y - titleBox.height <= 2, "title and location form a compact label");
    await page.screenshot({ animations: "disabled", path: join(root, ".build", "link-context-desktop.png") });
    await page.close();
  });

  it("keeps the URL flow distinct and rejects an unselected relative path", async () => {
    const page = await openEditor("<p>Hello</p>", "sticky", true);
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.getByRole("toolbar", { name: "Editor toolbar" }).getByRole("button", { name: "Link" }).click();
    const form = linkForm(page);
    await form.getByRole("searchbox", { name: "Link destination" }).fill("/guide");
    await form.getByRole("button", { name: "Save link" }).click();
    await form.getByRole("alert").waitFor();
    assert.equal(await prose(page).locator("a").count(), 0);
    await form.getByRole("searchbox", { name: "Link destination" }).fill("https://example.com/guide");
    await form.getByRole("button", { name: "Save link" }).click();
    await equals(() => prose(page).locator("a").getAttribute("href"), "https://example.com/guide", "external URL stays absolute");
    await page.close();
  });

  it("accepts a pasted URL directly and returns to page search when replaced", async () => {
    const page = await openEditor("<p>Hello</p>", "sticky", true);
    await prose(page).focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.getByRole("toolbar").getByRole("button", { name: "Link" }).click();
    const form = linkForm(page);
    const destination = form.getByRole("searchbox", { name: "Link destination" });
    await destination.focus();
    await page.keyboard.insertText("https://example.com/guide?q=one#section");
    await form.getByRole("checkbox", { name: "Open in new tab" }).waitFor();
    assert.equal(await form.getByLabel("Destination search results").count(), 0, "URL does not show search results");
    await destination.fill("Guide");
    await equals(() => form.getByLabel("Destination search results").getByRole("button").count(), 2, "replacing URL restores search");
    await destination.fill("mailto:hello@example.com");
    await form.getByRole("button", { name: "Save link" }).click();
    await equals(() => prose(page).getByRole("link").getAttribute("href"), "mailto:hello@example.com", "pasted destination is saved without a mode switch");
    await page.close();
  });

  it("resolves an existing host link and keeps the picker inside a phone viewport", async () => {
    const page = await openEditor('<p>Read <a href="/records/one" target="_self">this guide</a></p>', "sticky", true);
    await prose(page).getByRole("link", { name: "this guide" }).click();
    const actions = page.getByRole("group", { name: "Link actions" });
    await until(() => actions.textContent(), value => value?.includes("Team / Guides") ?? false, "saved target is resolved");
    await actions.getByRole("button", { name: "Edit link" }).click();
    await equals(() => linkForm(page).getByRole("searchbox", { name: "Link destination" }).inputValue(), "Guide", "picker opens in target mode");
    await page.close();

    const phone = await openEditor("<p>Hello</p>", "sticky", true);
    await phone.setViewportSize({ width: 375, height: 760 });
    await prose(phone).locator("p").click();
    await phone.locator(".looma-editor__mobile-toolbar-shell").getByRole("button", { name: "Link" }).click();
    const bounds = await linkForm(phone).boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 375, "link form fits phone viewport");
    await linkForm(phone).getByRole("searchbox", { name: "Link destination" }).fill("Guide");
    await equals(() => linkForm(phone).getByLabel("Destination search results").getByRole("button").count(), 2, "rich results fit phone picker");
    await phone.screenshot({ animations: "disabled", path: join(root, ".build", "link-picker-375.png") });
    await phone.close();
  });

  it("edits an existing relative URL in the combined destination field", async () => {
    const page = await openEditor('<p><a href="/before#part">Read</a></p>', "sticky", true);
    await prose(page).getByRole("link", { name: "Read" }).click();
    await page.getByRole("group", { name: "Link actions" }).getByRole("button", { name: "Edit link" }).click();
    await linkForm(page).getByRole("searchbox", { name: "Link destination" }).fill("/after?q=one#part");
    await linkForm(page).getByRole("button", { name: "Save link" }).click();
    await equals(() => prose(page).getByRole("link", { name: "Read" }).getAttribute("href"), "/after?q=one#part", "editing a relative destination does not turn it into a search query");
    await page.close();
  });

  it("shows link actions at a caret inside linked text and edits that link in place", async () => {
    const page = await openEditor('<p>See <a href="/guide" target="_self">guide</a> next</p>');
    const link = prose(page).getByRole("link", { name: "guide" });
    await link.click();
    const actions = page.getByRole("group", { name: "Link actions" });
    await actions.waitFor();
    assert.equal(await actions.getByLabel("URL: /guide").count(), 1);
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
    await prose(page).focus();
    await page.keyboard.press("Home");
    // Step right one character at a time, giving the actions their show delay after each step.
    // Keys sent milliseconds apart were sometimes dropped, which made fixed counts flaky.
    const actions = page.getByRole("group", { name: "Link actions" });
    let revealed = false;
    for (let index = 0; index < 18 && !revealed; index++) {
      await page.keyboard.press("ArrowRight");
      revealed = await actions.waitFor({ timeout: 400 }).then(() => true, () => false);
    }
    assert.equal(revealed, true, "link actions appear once the keyboard caret is in the link");
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

describe("LoomaEditor slash discovery", () => {
  it("groups defaults, prioritizes callouts, and keeps unmatched queries visible without changing content", async () => {
    const page = await openEditor("<p></p>");
    await prose(page).focus();
    await page.keyboard.type("/");
    const menu = page.getByRole("listbox", { name: "Insert block" });
    await menu.waitFor();
    assert.equal(await menu.getByRole("group", { name: "Basic blocks", exact: true }).count(), 1);
    assert.equal(await menu.getByRole("group", { name: "Callouts", exact: true }).count(), 1);
    assert.equal(await menu.getByRole("group", { name: "Insertions", exact: true }).count(), 1);
    assert.equal(await menu.getByRole("option", { name: /Image Upload/ }).count(), 0, "no upload capability means no image row");
    await page.screenshot({ animations: "disabled", path: join(root, "../../.context/slash-groups.png") });
    await page.keyboard.type("callout");
    await equals(() => menu.getByRole("option").first().getAttribute("data-value"), "info", "callouts rank above the quote alias");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("/unmatched");
    await menu.getByRole("status").waitFor();
    assert.equal(await menu.getByRole("status").textContent(), "No commands found.");
    await page.keyboard.press("Enter");
    assert.equal(await prose(page).textContent(), "/unmatched", "no-result Enter preserves the query");
    await page.keyboard.press("Escape");
    await menu.waitFor({ state: "hidden" });
    assert.equal(await prose(page).textContent(), "/unmatched");
    await page.close();
  });

  it("extends or replaces one inventory and preserves duplicate-title identities and hover keyboard selection", async () => {
    const page = await openEditor("<p></p>", "sticky", false, {}, "extend");
    await prose(page).focus();
    await page.keyboard.type("/host");
    const menu = page.getByRole("listbox", { name: "Insert block" });
    const beta = menu.getByRole("option", { name: "Host content beta content" });
    await beta.waitFor();
    await beta.hover();
    await equals(() => beta.getAttribute("aria-selected"), "true", "hover updates editor selection");
    await page.keyboard.press("Enter");
    await equals(() => prose(page).textContent(), "BETA", "keyboard follows the hovered identity");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("/toc");
    await menu.getByRole("option", { name: /Table of contents/ }).waitFor();
    await page.evaluate(() => (window as unknown as { fixtureSetSlashMode(mode: string): void }).fixtureSetSlashMode("replace"));
    await menu.waitFor({ state: "hidden" });
    assert.equal(await prose(page).textContent(), "/toc", "inventory replacement leaves source text intact");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("/beta");
    await beta.waitFor();
    assert.equal(await beta.getAttribute("data-value"), "host-beta");
    await beta.click();
    await equals(() => prose(page).textContent(), "BETA", "filtered identity selects the intended host command");
    await page.evaluate(() => (window as unknown as { fixtureSetSlashMode(mode: string): void }).fixtureSetSlashMode("empty"));
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("/");
    await menu.getByRole("status").waitFor();
    assert.equal(await menu.getByRole("option").count(), 0, "explicitly empty means no defaults");
    await page.close();
  });
});

describe("LoomaEditor collapsible sections", () => {
  it("inserts a section, edits its summary and rich body, cancels settings, and exits with Mod-Enter", async () => {
    for (const width of [1280, 375]) {
      const page = await openEditor("<p></p>", "sticky", false, { hasTouch: width === 375, viewport: { width, height: 760 } });
      await page.evaluate(() => { document.querySelector<HTMLElement>("#app")!.style.width = "100%"; });
      const activate = (control: Locator) => width === 375 ? control.tap() : control.click();
      await prose(page).focus();
      await page.keyboard.type("/expand");
      await activate(page.getByRole("option", { name: /Expand Collapsible/ }));
      const section = prose(page).locator("[data-looma-expand]");
      await section.getByRole("button", { name: "Details", exact: true }).waitFor();
      await page.keyboard.type("Body content");
      await equals(() => section.locator("[data-looma-expand-body]").textContent(), "Body content", "caret starts in the body");
      await page.keyboard.press("Enter");
      await page.keyboard.type("/bullet");
      await activate(page.getByRole("option", { name: /Bullet list/ }));
      await page.keyboard.type("List item");
      await section.locator("ul li").waitFor();
      if (width === 375) {
        await activate(page.locator(".looma-editor__mobile-toolbar-shell").getByRole("button", { name: "Block actions" }));
        await activate(page.getByRole("menuitem", { name: "Insert paragraph below" }));
        await equals(() => prose(page).evaluate(element => element === document.activeElement), true, "touch block action returns focus to the document");
      } else await page.keyboard.press("ControlOrMeta+Enter");
      await page.keyboard.type("After section");
      await equals(() => prose(page).locator(":scope > p").last().textContent(), "After section", "shortcut or touch block action leaves the container");
      await activate(section.getByRole("button", { name: "Section settings", exact: true }));
      const settings = page.locator('[data-component="ui-popover"][aria-label="Section settings"]');
      await settings.getByRole("textbox", { name: "Summary" }).fill("More context");
      await activate(settings.getByRole("checkbox", { name: "Initially expanded" }));
      const bounds = await settings.boundingBox();
      assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, "settings fit the viewport");
      await page.screenshot({ animations: "disabled", path: join(root, `../../.context/expand-settings-${width}.png`) });
      await activate(settings.getByRole("button", { name: "Save", exact: true }));
      await section.getByRole("button", { name: "More context", exact: true }).waitFor();
      await activate(section.getByRole("button", { name: "Section settings", exact: true }));
      await settings.getByRole("textbox", { name: "Summary" }).fill("Discarded");
      await activate(settings.getByRole("button", { name: "Cancel", exact: true }));
      await activate(section.getByRole("button", { name: "Section settings", exact: true }));
      await settings.getByRole("textbox", { name: "Summary" }).fill("Also discarded");
      await page.keyboard.press("Escape");
      await settings.waitFor({ state: "hidden" });
      assert.equal(await section.getByRole("button", { name: "More context", exact: true }).count(), 1);
      const saved = await page.evaluate(() => (window as unknown as { fixtureEditor: { getJSON(): unknown; getHTML(): string } }).fixtureEditor.getJSON());
      assert.match(JSON.stringify(saved), /More context/);
      assert.match(JSON.stringify(saved), /"open":true/);
      await page.close();
    }
  });

  it("supports transient reader keyboard/touch toggles and reveals a collapsed heading from the TOC", async () => {
    for (const width of [1280, 375]) {
      const page = await openEditor('<nav data-looma-toc></nav><details><summary>Supporting detail</summary><h2>Inside section</h2><p>Hidden context</p></details>', "sticky", false, { hasTouch: width === 375, viewport: { width, height: 760 } });
      await page.evaluate(() => {
        const editor = (window as unknown as { fixtureEditor: { setEditable(value: boolean): void } }).fixtureEditor;
        editor.setEditable(false);
        document.querySelector<HTMLElement>("#app")!.style.width = "100%";
      });
      const trigger = prose(page).getByRole("button", { name: "Supporting detail", exact: true });
      await equals(() => trigger.getAttribute("aria-expanded"), "false", "reader starts with the saved collapsed state");
      const before = await page.evaluate(() => JSON.stringify((window as unknown as { fixtureEditor: { getJSON(): unknown } }).fixtureEditor.getJSON()));
      if (width === 375) await trigger.tap();
      else { await trigger.focus(); await page.keyboard.press("Enter"); }
      await equals(() => trigger.getAttribute("aria-expanded"), "true", "reader can expand");
      if (width === 375) await trigger.tap();
      else await page.keyboard.press("Space");
      await equals(() => trigger.getAttribute("aria-expanded"), "false", "reader can collapse");
      const link = prose(page).getByRole("navigation").getByRole("link", { name: "Inside section" });
      if (width === 375) await link.tap(); else await link.click();
      await equals(() => trigger.getAttribute("aria-expanded"), "true", "TOC reveals the hidden destination");
      await equals(() => prose(page).locator("h2").evaluate(element => element === document.activeElement), true, "navigation focuses the destination after disclosure reveal");
      assert.equal(await prose(page).getByRole("button", { name: "Section settings", exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => JSON.stringify((window as unknown as { fixtureEditor: { getJSON(): unknown } }).fixtureEditor.getJSON())), before, "all reader interactions remain transient");
      await page.screenshot({ animations: "disabled", path: join(root, `../../.context/expand-reader-${width}.png`) });
      await page.close();
    }
  });
});

describe("LoomaEditor automatic table of contents", () => {
  it("inserts from slash, configures standard dropdowns, and navigates in read-only mode", async () => {
    for (const width of [1280, 375]) {
      const page = await openEditor("<p></p><h1>Overview</h1><h2>Details</h2><h3>Deep detail</h3>", "sticky", false, { hasTouch: width === 375, viewport: { width, height: 760 } });
      const activate = (control: Locator) => width === 375 ? control.tap() : control.click();
      await page.locator("#app").evaluate(element => { (element as HTMLElement).style.width = "min(720px, 100%)"; });
      await prose(page).locator("p").first().click();
      await page.keyboard.type("/toc");
      await page.getByRole("option", { name: /Table of contents Automatic links/i }).waitFor();
      await page.keyboard.press("Enter");
      const nav = prose(page).getByRole("navigation", { name: "Table of contents" });
      await equals(() => nav.getByRole("link").count(), 3, "all headings appear automatically");
      await activate(nav.getByRole("button", { name: "Table of contents settings" }));
      const settings = page.locator('[data-component="ui-popover"][aria-label="Table of contents settings"]');
      await activate(settings.getByRole("button", { name: "Formatting", exact: true }));
      const format = page.getByRole("menu", { name: "Formatting", exact: true });
      if (width === 1280) {
        await equals(() => format.getByRole("menuitemradio", { name: "Plain", exact: true }).evaluate(element => element === document.activeElement), true, "menu autofocus has completed before keyboard navigation");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Enter");
      } else {
        await activate(format.getByRole("menuitemradio", { name: "Numbered" }));
      }
      await page.keyboard.press("Escape");
      assert.equal(await settings.isVisible(), true, "Escape closes only the nested dropdown");
      await activate(settings.getByRole("button", { name: "Heading depth", exact: true }));
      await activate(page.getByRole("menu", { name: "Heading depth", exact: true }).getByRole("menuitemradio", { name: "Through heading 2" }));
      await page.keyboard.press("Escape");
      await mkdir(join(root, "../../.context"), { recursive: true });
      await page.screenshot({ animations: "disabled", path: join(root, `../../.context/toc-settings-${width}.png`) });
      assert.ok(await settings.evaluate(element => {
        const box = element.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth;
      }), "settings fit the viewport");
      await activate(settings.getByRole("button", { name: "Save", exact: true }));
      await equals(() => nav.getByRole("link").count(), 2, "depth filters headings");
      assert.equal(await nav.locator("ol").count(), 2, "numbered nested lists preserve hierarchy");
      await activate(nav.getByRole("button", { name: "Table of contents settings" }));
      await activate(settings.getByRole("button", { name: "Formatting", exact: true }));
      await activate(page.getByRole("menu", { name: "Formatting", exact: true }).getByRole("menuitemradio", { name: "Bulleted" }));
      await page.keyboard.press("Escape");
      await activate(settings.getByRole("button", { name: "Cancel", exact: true }));
      assert.equal(await nav.getAttribute("data-format"), "numbered", "cancel discards draft settings");
      await page.evaluate(() => {
        const editor = (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor;
        let range = { from: 0, to: 0 };
        editor.state.doc.descendants((node, position) => {
          if (node.type.name === "heading" && node.attrs.level === 1) range = { from: position + 1, to: position + 1 + node.content.size };
        });
        editor.commands.insertContentAt(range, "Updated");
        editor.setEditable(false);
      });
      await equals(() => nav.getByRole("button", { name: "Table of contents settings" }).count(), 0, "readers see no settings control");
      await equals(() => nav.getByRole("link").first().textContent(), "Updated", "heading edits update entries");
      if (width === 1280) {
        await nav.getByRole("link").first().focus();
        await page.keyboard.press("Enter");
        assert.equal(await prose(page).locator("h1").evaluate(element => element === document.activeElement), true, "keyboard navigation focuses the destination");
      }
      await activate(nav.getByRole("link", { name: "Details", exact: true }));
      assert.equal(await page.getByRole("group", { name: "Link actions" }).count(), 0, "TOC navigation does not open link editing");
      assert.equal(await prose(page).locator("h2").evaluate(element => element === document.activeElement), true);
      await page.screenshot({ animations: "disabled", path: join(root, `../../.context/toc-reader-${width}.png`) });
      await page.close();
    }
  });

  it("uses the existing chip editor for /status", async () => {
    const page = await openEditor("<p></p>");
    await prose(page).click();
    await page.keyboard.type("/status");
    await page.getByRole("option", { name: /Chip Inline label/i }).waitFor();
    await page.keyboard.press("Enter");
    const input = page.getByRole("textbox", { name: "Chip text" });
    await input.fill("In progress");
    await page.getByRole("button", { name: "Blue chip", exact: true }).click();
    await equals(() => prose(page).locator("[data-looma-chip]").getAttribute("data-label"), "In progress", "status uses existing chip content");
    assert.equal(await prose(page).locator("[data-looma-chip]").getAttribute("data-color"), "blue");
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
    const deleteTable = menu.getByRole("menuitem", { name: "Delete table" });
    const scroll = await menu.evaluate((element) => {
      const overflow = element.scrollHeight - element.clientHeight;
      element.scrollTop = element.scrollHeight;
      return { overflow, top: element.scrollTop };
    });
    assert.ok(scroll.overflow === 0 || scroll.top > 0, "menu scrolls when lower actions overflow");
    const deleteBounds = await deleteTable.boundingBox();
    assert.ok(deleteBounds && deleteBounds.y >= bounds.y && deleteBounds.y + deleteBounds.height <= bounds.y + bounds.height,
      "the last action is reachable within the menu");
    await menu.hover();
    await page.mouse.wheel(0, -300);
    await menu.waitFor();
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
    const during = await table(page).evaluate(element => {
      const wrapper = element.closest(".tableWrapper")!;
      return { table: element.getBoundingClientRect().width, client: wrapper.clientWidth, scroll: wrapper.scrollWidth,
        columns: Array.from(element.querySelectorAll("col")).map(column => column.getBoundingClientRect().width) };
    });
    await page.mouse.up();
    // Release reconciliation runs on the next frame, after Tiptap persists the drag.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const after = await table(page).evaluate(element => {
      const wrapper = element.closest(".tableWrapper")!;
      return { table: element.getBoundingClientRect().width, client: wrapper.clientWidth, scroll: wrapper.scrollWidth,
        columns: Array.from(element.querySelectorAll("col")).map(column => column.getBoundingClientRect().width) };
    });
    assert.equal(during.scroll, during.client, "table fits while the pointer is down");
    assert.equal(after.scroll, after.client, "release must not add a one-pixel scrollbar");
    await until(() => first.evaluate((element) => element.getBoundingClientRect().width), (width) => width > bounds.width + 80, "column widens by about the drag");
    const [editorBox, tableBox] = await Promise.all([prose(page).boundingBox(), table(page).boundingBox()]);
    assert.ok(editorBox && tableBox);
    assert.ok(tableBox.width <= editorBox.width, `table (${tableBox.width}px) fits the editor (${editorBox.width}px)`);
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


describe("atomic editor blocks", () => {
  it("selects a clicked divider for deletion and restores it with undo", async () => {
    const page = await openEditor("<p>Before</p><hr><p>After</p>");
    assert.ok((await prose(page).locator("hr").boundingBox())!.height >= 24);
    await prose(page).locator("hr").click();
    await equals(() => page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.state.selection.constructor.name), "NodeSelection", "divider selection");
    await page.keyboard.press("Delete");
    assert.equal(await prose(page).locator("hr").count(), 0);
    await page.keyboard.press("ControlOrMeta+z");
    await equals(() => prose(page).locator("hr").count(), 1, "divider undo");
    await page.close();
  });

  it("keeps Tab in text and selects images by click without creating viewer tab stops", async () => {
    const page = await openEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Example"><p>After</p>');
    const image = prose(page).locator("img");
    assert.notEqual(await image.getAttribute("tabindex"), "0");
    assert.notEqual(await image.getAttribute("role"), "button");
    await page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.commands.focus("start"));
    await equals(() => prose(page).evaluate(el => el === document.activeElement), true, "editor has focus");
    await page.keyboard.press("Tab");
    await equals(() => prose(page).locator("p").first().textContent(), "\tBefore", "tab insertion");
    assert.equal(await prose(page).evaluate(el => el === document.activeElement), true);
    await image.click();
    await equals(() => page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.state.selection.constructor.name), "NodeSelection", "image selection");
    await page.keyboard.press("Backspace");
    assert.equal(await image.count(), 0);
    await page.close();
  });
});


describe("image controls", () => {
  it("uses one placement bar and a secondary description, preserving reader activation", async () => {
    const page = await openEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Example"><p>After</p>');
    const image = prose(page).locator("img");
    await image.click();
    const actions = page.getByRole("toolbar", { name: "Image actions" });
    await actions.waitFor();
    assert.equal(await actions.getByRole("button").count(), 6);
    await actions.getByRole("button", { name: "Center image", exact: true }).click();
    await equals(() => actions.getByRole("button", { name: "Center image", exact: true }).getAttribute("aria-pressed"), "true", "active placement");
    await actions.getByRole("button", { name: "Image description", exact: true }).click();
    const description = page.getByRole("form", { name: "Image description" });
    await description.getByLabel("Alt text").fill("Landscape");
    await description.getByRole("button", { name: "Save", exact: true }).click();
    await equals(() => image.getAttribute("alt"), "Landscape", "saved description");
    await actions.getByRole("button", { name: "Image description", exact: true }).click();
    await description.getByLabel("Alt text").fill("Draft");
    await description.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.equal(await image.getAttribute("alt"), "Landscape");
    await page.evaluate(() => (window as unknown as { fixtureSetEditable(value: boolean): void }).fixtureSetEditable(false));
    await equals(() => image.getAttribute("tabindex"), "0", "reader tab stop");
    assert.equal(await prose(page).getByRole("button", { name: /Resize image/ }).count(), 0);
    await image.press("Enter");
    await equals(() => page.evaluate(() => (window as unknown as { fixtureActivations: unknown[] }).fixtureActivations.length), 1, "reader activation");
    await page.evaluate(() => (window as unknown as { fixtureSetEditable(value: boolean): void }).fixtureSetEditable(true));
    await equals(() => image.getAttribute("tabindex"), "-1", "author removes tab stop");
    await image.click();
    await page.keyboard.press("Delete");
    await equals(() => image.count(), 0, "delete selected image");
    await page.close();
  });

  it("drags corners with a locked aspect ratio, previews without persisting, and undoes once", async () => {
    const page = await openEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Example"><p>After</p>');
    const image = prose(page).locator("img");
    await image.click();
    const handles = prose(page).getByRole("button", { name: /Resize image/ });
    await equals(() => handles.count(), 4, "selected corner handles");
    const handle = prose(page).getByRole("button", { name: "Resize image from bottom right" });
    const origin = (await handle.boundingBox())!;
    await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
    await page.mouse.down();
    await page.mouse.move(origin.x + origin.width / 2 + 80, origin.y + origin.height / 2 + 40, { steps: 5 });
    assert.equal(await image.getAttribute("width"), "320", "preview must not persist");
    const preview = (await image.boundingBox())!;
    assert.ok(Math.abs(preview.width - 400) < 2, JSON.stringify(preview));
    await page.mouse.up();
    await equals(() => image.getAttribute("width"), "400", "committed drag width");
    assert.equal(await image.getAttribute("height"), "200");
    await page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.commands.undo());
    await equals(() => image.getAttribute("width"), "320", "one undo restores original width");
    await image.click();
    const restored = (await handle.boundingBox())!;
    await page.mouse.move(restored.x + restored.width / 2, restored.y + restored.height / 2);
    await page.mouse.down();
    await page.mouse.move(restored.x + restored.width / 2 + 100, restored.y + restored.height / 2 + 50);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(await image.getAttribute("width"), "320", "Escape cancels the drag");
    assert.ok(Math.abs((await image.boundingBox())!.width - 320) < 2);
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await equals(() => image.getAttribute("width"), "328", "keyboard resize");
    assert.equal(await image.getAttribute("height"), "164");
    await page.close();
  });

  it("wraps actual text on either side, centers, and contains floats at the editor boundary", async () => {
    const words = Array.from({ length: 120 }, () => "Following text wraps around the image.").join(" ");
    const page = await openEditor(`<p>Before</p><img src="https://example.test/image.svg" width="200" height="100" alt="Landscape"><p>${words}</p>`);
    const image = prose(page).locator("img");
    await image.click();
    const actions = page.getByRole("toolbar", { name: "Image actions" });
    const firstCharacter = () => prose(page).locator("p").last().evaluate(element => {
      const range = document.createRange(); range.setStart(element.firstChild!, 0); range.setEnd(element.firstChild!, 1);
      const rect = range.getBoundingClientRect(); return { x: rect.x, y: rect.y };
    });
    await actions.getByRole("button", { name: "Wrap text to the right" }).click();
    await until(firstCharacter, point => point.x >= 200 && point.y < 180, "left float allows text beside it");
    const left = (await image.boundingBox())!;
    await actions.getByRole("button", { name: "Wrap text to the left" }).click();
    await until(async () => (await image.boundingBox())!.x, x => x > left.x + 100, "right float moves image");
    const right = (await image.boundingBox())!;
    const character = await firstCharacter();
    assert.ok(character.x < right.x && character.y < right.y + right.height);
    await actions.getByRole("button", { name: "Center image", exact: true }).click();
    await until(async () => (await image.boundingBox())!.x, x => x > left.x && x < right.x, "center placement");
    await actions.getByRole("button", { name: "Image in line", exact: true }).click();
    await until(firstCharacter, point => point.y > left.y + left.height, "block placement puts text below");
    await page.route("https://example.test/tall.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="900"><rect width="200" height="900" fill="#569d86"/></svg>' }));
    await page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.commands.setContent('<img src="https://example.test/tall.svg" width="200" height="900" data-placement="wrap-left" alt="Tall">'));
    await image.waitFor();
    await image.evaluate(async element => { await (element as HTMLImageElement).decode(); });
    const media = (await image.boundingBox())!;
    const boundary = (await page.locator(".looma-editor").boundingBox())!;
    assert.ok(boundary.y + boundary.height >= media.y + media.height, "editor contains the float");
    await page.close();
  });

  it("projects rendition attributes onto the image and falls back without changing saved content", async () => {
    const page = await openEditor('<img src="https://example.test/image.svg" width="320" height="160" alt="Landscape" data-looma-responsive>', "sticky", false, {}, "rendition");
    const image = prose(page).locator("img");
    await equals(() => image.getAttribute("src"), "https://example.test/rendition.svg", "delivery source");
    assert.equal(await image.getAttribute("srcset"), "https://example.test/rendition.svg 2x");
    assert.equal(await prose(page).locator("figure").getAttribute("srcset"), null);
    const saved = await page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.getJSON());
    await image.dispatchEvent("error");
    await equals(() => image.getAttribute("src"), "https://example.test/image.svg", "durable source fallback");
    assert.equal(await image.getAttribute("srcset"), null);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.getJSON()), saved);
    const errors = await page.evaluate(() => (window as unknown as { fixtureRenditionErrors: { src: string }[] }).fixtureRenditionErrors);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].src, "https://example.test/image.svg");
    assert.doesNotMatch(await page.evaluate(() => (window as unknown as { fixtureEditor: import("@tiptap/core").Editor }).fixtureEditor.getHTML()), /rendition|srcset|tabindex/);
    await page.close();
  });
});


describe("responsive image wrapping", () => {
  it("defaults to one-third of the column, stacks full-width on phones, and permits custom dragging", async () => {
    const page = await openEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Landscape"><p>Following text wraps around the image.</p>');
    const image = prose(page).locator("img");
    await image.click();
    const bar = page.getByRole("toolbar", { name: "Image actions" });
    await bar.getByRole("button", { name: "Wrap text to the right" }).click();
    const columnWidth = await prose(page).evaluate(el => {
      const css = getComputedStyle(el); return el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    });
    await until(async () => (await image.boundingBox())!.width, width => Math.abs(width - columnWidth / 3) < 2, "one-third column width");
    assert.equal(await image.getAttribute("width"), null, "responsive sizing is not a hardcoded pixel width");
    await page.setViewportSize({ width: 375, height: 800 });
    await page.locator("#app").evaluate(el => { (el as HTMLElement).style.width = "100%"; });
    const phoneColumn = await prose(page).evaluate(el => {
      const css = getComputedStyle(el); return el.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    });
    await until(async () => (await image.boundingBox())!.width, width => Math.abs(width - phoneColumn) < 2, "phone full width");
    assert.equal(await style(prose(page).locator("figure"), "float")(), "none");
    const media = (await image.boundingBox())!;
    assert.ok((await prose(page).locator("p").last().boundingBox())!.y >= media.y + media.height, "phone text follows image");
    await page.evaluate(() => (window as unknown as { fixtureSetEditable(value: boolean): void }).fixtureSetEditable(false));
    await equals(() => image.getAttribute("tabindex"), "0", "reader image");
    assert.ok(Math.abs((await image.boundingBox())!.width - phoneColumn) < 2);
    await page.evaluate(() => (window as unknown as { fixtureSetEditable(value: boolean): void }).fixtureSetEditable(true));
    await page.setViewportSize({ width: 1280, height: 800 });
    await image.click();
    const customStart = (await image.boundingBox())!.width;
    const handle = prose(page).getByRole("button", { name: "Resize image from bottom right" });
    const box = (await handle.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 30);
    await page.mouse.up();
    await until(() => image.getAttribute("width"), value => Number(value) > 0 && Number(value) < customStart - 40, "custom drag overrides desktop default");
    await page.setViewportSize({ width: 375, height: 800 });
    await until(async () => (await image.boundingBox())!.width, width => Math.abs(width - phoneColumn) < 2, "custom image still fills phone column");
    await page.close();
  });
});

describe("image controls tooltips", () => {
  it("uses standard tooltips for every icon on hover and keyboard focus", async () => {
    const page = await openEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Landscape"><p>After</p>');
    await prose(page).locator("img").click();
    const bar = page.getByRole("toolbar", { name: "Image actions" });
    await bar.waitFor();
    const buttons = bar.getByRole("button");
    for (let index = 0; index < await buttons.count(); index++) {
      const button = buttons.nth(index);
      const name = await button.getAttribute("aria-label");
      assert.equal(await button.getAttribute("title"), null, "no native tooltip");
      await button.hover();
      const tooltip = page.locator('[data-component="ui-tooltip"]').filter({ hasText: name! });
      await tooltip.waitFor();
      assert.ok((await button.getAttribute("aria-describedby"))?.split(/\s+/).includes((await tooltip.getAttribute("id"))!), "standard described tooltip");
      await page.mouse.move(700, 700);
      await tooltip.waitFor({ state: "hidden" });
      await button.focus();
      await tooltip.waitFor();
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
      await tooltip.waitFor({ state: "hidden" });
    }
    await page.close();
  });
});

describe("image controls layout", () => {
  it("shows one correctly typed bar on click at desktop and phone widths", async () => {
    for (const phone of [false, true]) {
      const page = await openEditor('<p>Before</p><img src="https://example.test/image.svg" width="320" height="160" alt="Landscape"><p>After</p>', "sticky", false, { viewport: { width: phone ? 375 : 1280, height: 800 }, hasTouch: phone });
      await page.locator("#app").evaluate(el => { (el as HTMLElement).style.width = "100%"; });
      const image = prose(page).locator("img");
      if (phone) await image.tap(); else await image.click();
      const bar = page.getByRole("toolbar", { name: "Image actions" });
      await bar.waitFor();
      const rect = (await bar.boundingBox())!;
      assert.ok(rect.x >= 0 && rect.x + rect.width <= (phone ? 375 : 1280), JSON.stringify(rect));
      assert.equal(await style(bar, "font-family")(), await style(page.locator(".looma-editor"), "font-family")());
      assert.ok((await image.boundingBox())!.width <= (phone ? 375 : 1280));
      await mkdir(join(root, "../../.context"), { recursive: true });
      await page.screenshot({ path: join(root, `../../.context/image-bar-${phone ? 375 : 1280}.png`) });
      await page.screenshot({ path: join(root, `../../.context/image-bar-detail-${phone ? 375 : 1280}.png`), clip: { x: 0, y: phone ? 0 : 72, width: phone ? 375 : 420, height: 290 } });
      const descriptionButton = bar.getByRole("button", { name: "Image description", exact: true });
      if (phone) await descriptionButton.tap(); else await descriptionButton.click();
      const form = page.getByRole("form", { name: "Image description" });
      await form.waitFor();
      assert.equal(await style(form, "font-family")(), await style(page.locator(".looma-editor"), "font-family")());
      const popup = (await form.boundingBox())!;
      assert.ok(popup.x >= 0 && popup.x + popup.width <= (phone ? 375 : 1280), JSON.stringify(popup));
      await page.close();
    }
  });
});
