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

async function openEditor(html = "<p>Hello</p>", mode: "sticky" | "popover" = "sticky", links = false): Promise<Page> {
  const page = await open(editorBundle, `<div id="app" style="width: 720px"></div><button id="outside">Outside</button>`, [
    join(root, "tokens.css"),
    join(root, "vue/components.css"),
  ]);
  await page.evaluate(({ value, mode, links }) => (window as unknown as { mountEditor(html: string, mode: string, links: boolean): void }).mountEditor(value, mode, links), { value: html, mode, links });
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
    window.mountEditor = (html, mode = "sticky", links = false) => {
      const content = ref(html);
      const toolbarOpen = ref(false);
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

describe("LoomaEditor column resize hints", () => {
  it("shows a standard tooltip without widening a fitting phone table", async () => {
    const page = await openEditor("<table><tr><td>First</td><td>Second</td></tr></table>");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator("#app").evaluate((element) => {
      element.style.width = "303px";
      element.style.setProperty("--ui-font-size-xs", "16px");
    });
    const first = cell(page, 0, 0);
    const bounds = (await first.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width - 2, bounds.y + bounds.height / 2);
    const handle = prose(page).locator(".column-resize-handle");
    await handle.waitFor();
    await handle.hover();
    const hint = page.getByRole("tooltip").filter({ hasText: "Drag to resize column" });
    await hint.waitFor();
    assert.equal(await hint.evaluate((element) => element.matches(":popover-open")), true);
    assert.equal(await prose(page).locator(".tableWrapper").evaluate((element) => element.scrollWidth - element.clientWidth), 0);
    await page.locator("#outside").hover();
    await hint.waitFor({ state: "hidden" });
    await page.close();
  });
});

describe("LoomaEditor links", () => {
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
