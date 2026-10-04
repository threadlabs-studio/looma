import { page, userEvent } from "@vitest/browser/context";
import type { Editor, JSONContent } from "@tiptap/core";
import { common } from "lowlight";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import { Button } from "../vue/index";
import "../vue/components.css";
import "../tokens.css";
import "../theme-light.css";

const apps: App[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

async function expectFloatingToolbarHidden() {
  await vi.waitFor(() => {
    const popup = document.querySelector('[aria-label="Editor toolbar"]')?.closest<HTMLElement>("[data-tippy-root]");
    expect(popup?.style.visibility).not.toBe("visible");
  });
}

async function historyShortcut(direction: "undo" | "redo") {
  const modifier = navigator.userAgent.includes("Mac OS X") ? "Meta" : "Control";
  const shift = direction === "redo" ? "{Shift>}" : "";
  const releaseShift = direction === "redo" ? "{/Shift}" : "";
  await userEvent.keyboard(`{${modifier}>}${shift}z${releaseShift}{/${modifier}}`);
}

async function codeLanguageInput(host: HTMLElement) {
  const input = host.querySelector<HTMLInputElement>('.looma-editor__code-language [role="combobox"]')!;
  await vi.waitFor(() => expect(input.id).toMatch(/^ui-combobox-\d+-input$/));
  return input;
}

async function mountEditor(options: { controlled?: boolean; editable?: boolean; width?: number; toolbarMode?: "bubble" | "sticky" | "contextual" | "popover"; disableHighlight?: boolean; codeLanguages?: Record<string, typeof common.sql>; mentionItems?: Array<{ id: string; label: string }> } = {}) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(options.width ?? 1280);
  const modelValue = ref<JSONContent>({ type: "doc", content: [{ type: "paragraph" }] });
  const editable = ref(options.editable ?? true);
  const host = document.createElement("div");
  document.body.append(host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, {
      modelValue: modelValue.value,
      editable: editable.value,
      ...(options.toolbarMode ? { toolbarMode: options.toolbarMode } : {}),
      ...(options.disableHighlight ? { disableHighlight: true } : {}),
      ...(options.codeLanguages ? { codeLanguages: options.codeLanguages } : {}),
      ...(options.mentionItems ? { mentionItems: options.mentionItems } : {}),
      ...(options.controlled === false ? {} : {
        "onUpdate:modelValue": (value: JSONContent) => { modelValue.value = value; },
      }),
      onReady: (instance: Editor) => { editor = instance; },
    }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  return { editor: editor!, host, editable };
}

function pasteFromSourceEditor(editor: Editor, text: string, mode: string) {
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", text);
  clipboardData.setData("text/html", `<pre>${text}</pre>`);
  clipboardData.setData("vscode-editor-data", JSON.stringify({ mode }));
  editor.view.dom.dispatchEvent(new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData,
  }));
}

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  await flushBrowser();
});

describe("LoomaEditor history (real browser)", () => {
  it.each(["bubble", "contextual", "popover"] as const)("%s floating tools hide at a caret, dismiss with Escape, and reopen on a new selection", async (toolbarMode) => {
    await page.viewport(1280, 720);
    const { editor } = await mountEditor({ toolbarMode });
    editor.commands.setContent("<p>Select some text</p>");
    editor.commands.focus("start");
    const toolbar = page.getByRole("toolbar", { name: "Editor toolbar", exact: true });
    await expectFloatingToolbarHidden();
    editor.commands.setTextSelection({ from: 1, to: 7 });
    await expect.element(toolbar).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expectFloatingToolbarHidden();
    editor.commands.setTextSelection({ from: 1, to: 8 });
    await expect.element(toolbar).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "Bold", exact: true }));
    expect(editor.getHTML()).toContain("<strong>Select </strong>");
    editor.commands.setTextSelection(10);
    await expectFloatingToolbarHidden();
  });

  it("selection activation supports a held press and cancels moving or released presses", async () => {
    await page.viewport(1280, 720);
    const { editor } = await mountEditor({ toolbarMode: "contextual" });
    editor.commands.setContent("<p>Hold here</p>");
    editor.commands.focus("start");
    const toolbar = page.getByRole("toolbar", { name: "Editor toolbar", exact: true });
    const press = (type: string, x = 20) => editor.view.dom.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, isPrimary: true, clientX: x, clientY: 20,
    }));
    press("pointerdown");
    press("pointerup");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await expectFloatingToolbarHidden();
    press("pointerdown");
    press("pointercancel");
    await new Promise((resolve) => setTimeout(resolve, 600));
    await expectFloatingToolbarHidden();
    press("pointerdown");
    press("pointermove", 40);
    await new Promise((resolve) => setTimeout(resolve, 600));
    press("pointerup");
    await expectFloatingToolbarHidden();
    press("pointerdown");
    await new Promise((resolve) => setTimeout(resolve, 550));
    await expect.element(toolbar).toBeVisible();
    press("pointerup");
    window.dispatchEvent(new Event("resize"));
    await expect.element(toolbar).toBeVisible();
    editor.commands.setTextSelection(3);
    await expectFloatingToolbarHidden();
    press("pointerdown");
    await new Promise((resolve) => setTimeout(resolve, 550));
    await expect.element(toolbar).toBeVisible();
    press("pointerup");
    await userEvent.keyboard("{Escape}");
    await expectFloatingToolbarHidden();
  });

  it.each([375, 767])("selection activation keeps the formatting dock available at a caret on %ipx viewports", async (width) => {
    await page.viewport(width, 720);
    const { editor } = await mountEditor({ width, toolbarMode: "contextual" });
    editor.commands.focus("start");
    const dock = page.getByRole("toolbar", { name: "Text formatting", exact: true });
    await expect.element(dock).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect.element(dock).toBeVisible();
    editor.commands.insertContent("Writing");
    await expect.element(dock).toBeVisible();
  });

  it.each(["slash", "mention"])("gives %s suggestions priority over contextual formatting", async (kind) => {
    await page.viewport(1280, 720);
    const { editor } = await mountEditor({ toolbarMode: "contextual", mentionItems: [{ id: "ada", label: "Ada Lovelace" }] });
    editor.commands.focus("start");
    await flushBrowser();
    const toolbar = page.getByRole("toolbar", { name: "Editor toolbar", exact: true });
    await expectFloatingToolbarHidden();
    await userEvent.keyboard(kind === "slash" ? "Article /chip" : "Article @ada");
    const option = page.getByRole("option", { name: kind === "slash" ? /chip/i : /Ada Lovelace/ });
    await expect.element(option).toBeVisible();
    await vi.waitFor(() => {
      const popup = document.querySelector('[aria-label="Editor toolbar"]')?.closest<HTMLElement>("[data-tippy-root]");
      expect(popup?.style.visibility).not.toBe("visible");
    });
    await userEvent.click(option);
    if (kind === "slash") {
      await vi.waitFor(() => expect(document.activeElement).toBe(page.getByRole("textbox", { name: "Chip text" }).element()));
    } else {
      expect(editor.getJSON().content?.[0]?.content).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: "mention", attrs: expect.objectContaining({ id: "ada", label: "Ada Lovelace" }) }),
      ]));
      await expectFloatingToolbarHidden();
    }
  });

  it.each([768, 1280])("keeps contextual controls below document details at %ipx", async (width) => {
    await page.viewport(width, 720);
    const host = document.createElement("section");
    host.style.marginBlockStart = "180px";
    document.body.append(host);
    let editor: Editor | null = null;
    const detailsClicked = ref(false);
    const app = createApp({
      render: () => h("div", [
        h(Button, { onClick: () => { detailsClicked.value = true; } }, () => "Document details"),
        h(LoomaEditor, {
          modelValue: { type: "doc", content: [{ type: "paragraph" }] },
          toolbarMode: "contextual",
          onReady: (instance: Editor) => { editor = instance; },
        }),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await flushBrowser();
    editor!.commands.focus("start");
    editor!.commands.insertContent("A first paragraph.");
    editor!.commands.setTextSelection({ from: 1, to: 6 });
    await flushBrowser();
    const toolbar = page.getByRole("toolbar", { name: "Editor toolbar", exact: true });
    await expect.element(toolbar).toBeVisible();
    await vi.waitFor(() => {
      const bounds = toolbar.element().getBoundingClientRect();
      const content = host.querySelector<HTMLElement>(".looma-editor")!.getBoundingClientRect();
      expect(bounds.top).toBeGreaterThanOrEqual(content.top);
      expect(bounds.bottom).toBeLessThanOrEqual(content.bottom);
    });
    await userEvent.click(page.getByRole("button", { name: "Document details", exact: true }));
    expect(detailsClicked.value).toBe(true);
    await vi.waitFor(() => {
      const popup = document.querySelector('[aria-label="Editor toolbar"]')?.closest<HTMLElement>("[data-tippy-root]");
      expect(popup?.style.visibility).not.toBe("visible");
    });
  });

  it("offers full contextual commands on selection and held press at a link caret", async () => {
    await page.viewport(768, 720);
    const { editor } = await mountEditor({ toolbarMode: "contextual" });
    editor.commands.focus("start");
    await flushBrowser();
    editor.view.dom.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, pointerId: 2, pointerType: "mouse", button: 0, isPrimary: true,
    }));
    await new Promise((resolve) => setTimeout(resolve, 550));
    await expect.element(page.getByRole("toolbar", { name: "Editor toolbar", exact: true })).toBeVisible();
    editor.view.dom.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 2 }));
    for (const label of ["Bold", "Heading 1", "Insert table", "Undo", "Redo"]) {
      expect(document.querySelector(`[aria-label="${label}"]`)).toBeTruthy();
    }
    editor.commands.setContent("<p>Select some text</p>");
    editor.commands.setTextSelection({ from: 1, to: 7 });
    await flushBrowser();
    expect(document.querySelector('[aria-label="Heading 1"]')).toBeTruthy();
    const toolbar = document.querySelector<HTMLElement>('[role="toolbar"]')!;
    const bounds = toolbar.getBoundingClientRect();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
    await userEvent.click(document.querySelector<HTMLElement>('[aria-label="Bold"]')!);
    expect(editor.getHTML()).toContain("<strong>Select</strong>");
    editor.commands.setLink({ href: "https://example.com" });
    editor.commands.setTextSelection(3);
    await flushBrowser();
    await expectFloatingToolbarHidden();
    editor.view.dom.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, pointerId: 2, pointerType: "mouse", button: 0, isPrimary: true,
    }));
    await new Promise((resolve) => setTimeout(resolve, 550));
    await expect.element(page.getByRole("toolbar", { name: "Editor toolbar", exact: true })).toBeVisible();
    editor.view.dom.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 2 }));
    expect(document.querySelector('.looma-editor__link-context')?.closest('[data-tippy-root]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Open link"]')?.getAttribute("href")).toBe("https://example.com");
    expect(document.querySelector('[aria-label="Edit link"]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Remove link"]')).toBeTruthy();
    const heading = page.getByRole("button", { name: "Heading 1", exact: true }).element();
    await vi.waitFor(() => {
      const headingBounds = heading.getBoundingClientRect();
      expect(document.elementFromPoint(headingBounds.x + headingBounds.width / 2,
        headingBounds.y + headingBounds.height / 2)?.closest("button")).toBe(heading);
    });
    await userEvent.click(page.getByRole("button", { name: "Edit link", exact: true }));
    await expect.element(page.getByRole("form", { name: "Edit link" })).toBeVisible();
    await userEvent.click(page.getByRole("button", { name: "Cancel", exact: true }));
    await expect.element(page.getByRole("group", { name: "Link actions", exact: true })).toBeVisible();
    expect(editor.isActive("link")).toBe(true);
  });

  it("lazily offers HTML and highlights markup in a default editor", async () => {
    const { editor, host } = await mountEditor();
    const lowlight = editor.extensionManager.extensions.find((extension) => extension.name === "codeBlock")!
      .options.lowlight as { listLanguages(): string[] };
    expect(lowlight.listLanguages()).toEqual([]);
    editor.commands.setContent('<pre><code></code></pre>');
    editor.commands.focus("start");
    await flushBrowser();

    const language = await codeLanguageInput(host);
    expect(language).toBeTruthy();
    language.focus();
    await userEvent.keyboard("{ArrowDown}");
    await flushBrowser();
    const html = [...host.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === "HTML");
    expect(html).toBeTruthy();
    await userEvent.click(html!);
    await flushBrowser();
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: "html" });
    await vi.waitFor(() => expect(lowlight.listLanguages()).toEqual(["html"]));
    editor.commands.setContent('<pre><code class="language-html">&lt;main class="card"&gt;Hello&lt;/main&gt;</code></pre>');
    await flushBrowser();
    expect(host.querySelector("pre .hljs-tag")).toBeTruthy();
  });

  it("offers languages outside Auto without loading their grammars until selected", async () => {
    const { editor, host } = await mountEditor();
    const lowlight = editor.extensionManager.extensions.find((extension) => extension.name === "codeBlock")!
      .options.lowlight as { listLanguages(): string[]; highlightAuto(value: string): { data?: { language?: string } } };
    editor.commands.setContent('<pre><code></code></pre>');
    editor.commands.focus("start");
    await flushBrowser();

    const language = await codeLanguageInput(host);
    language.focus();
    language.select();
    await userEvent.keyboard("dockerfile");
    await flushBrowser();
    expect([...host.querySelectorAll<HTMLElement>('[role="option"]')].map((option) => option.textContent?.trim()))
      .toEqual(["DOCKERFILE"]);
    expect(lowlight.listLanguages()).toEqual([]);
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await vi.waitFor(() => expect(lowlight.listLanguages()).toEqual(["dockerfile"]));
    expect(lowlight.highlightAuto("FROM node:20").data?.language).not.toBe("dockerfile");
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: "dockerfile" });
    editor.commands.setContent('<pre><code class="language-dockerfile">FROM node:20</code></pre>');
    await flushBrowser();
    expect(host.querySelector("pre .hljs-keyword")?.textContent).toBe("FROM");
  });

  it("does not spell-check code blocks while leaving prose spell-check available", async () => {
    const { editor, host } = await mountEditor({ codeLanguages: { sql: common.sql } });
    editor.commands.setContent('<p>Some prose</p><pre><code>SELECT colum FROM records</code></pre>');
    await flushBrowser();

    const prose = host.querySelector<HTMLElement>("p")!;
    const code = host.querySelector<HTMLElement>("pre code")!;
    expect(prose.spellcheck).toBe(true);
    expect(code.spellcheck).toBe(false);
    expect(host.querySelector("pre")?.getAttribute("spellcheck")).toBe("false");

    const plain = await mountEditor();
    plain.editor.commands.setContent('<pre><code>const colum = 1</code></pre>');
    await flushBrowser();
    expect(plain.host.querySelector<HTMLElement>("pre code")?.spellcheck).toBe(false);
    expect(plain.host.querySelector('pre [role="combobox"]')).toBeNull();
  });

  it("shows SQL tokens with theme colors when the SQL grammar is configured", async () => {
    const { editor, host } = await mountEditor({ codeLanguages: { sql: common.sql } });
    editor.commands.setContent('<pre><code></code></pre>');
    editor.commands.focus("start");
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", "SELECT name FROM people");
    editor.view.dom.dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    }));
    await flushBrowser();

    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: null });
    const keyword = host.querySelector<HTMLElement>("pre .hljs-keyword");
    const code = host.querySelector<HTMLElement>("pre code");
    expect(keyword?.textContent).toBe("SELECT");
    expect(getComputedStyle(keyword!).color).not.toBe(getComputedStyle(code!).color);
  });

  it("lets a person override a code block's detected language and saves the choice", async () => {
    await page.viewport(375, 700);
    const { editor, host } = await mountEditor({ codeLanguages: { ini: common.ini, sql: common.sql } });
    host.style.width = "375px";
    editor.commands.setContent('<pre><code>SELECT id, name FROM users WHERE active = true;</code></pre>');
    editor.commands.focus("start");
    await flushBrowser();

    const language = host.querySelector<HTMLInputElement>('.looma-editor__code-language [role="combobox"]');
    expect(language?.value).toBe("Auto (INI)");
    await page.viewport(1280, 720);
    language!.focus();
    language!.select();
    await userEvent.keyboard("sq");
    await flushBrowser();
    expect(language!.value).toBe("sq");
    expect([...host.querySelectorAll<HTMLElement>('[role="option"]')].map((option) => option.textContent?.trim())).toEqual(["SQL"]);
    await userEvent.keyboard("{ArrowDown}");
    await flushBrowser();
    const sql = [...host.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === "SQL");
    expect(sql).toBeTruthy();
    await userEvent.keyboard("{End}{Enter}");
    await flushBrowser();

    const saved = editor.getJSON();
    expect(saved.content?.[0]?.attrs).toEqual({ language: "sql" });
    expect(saved.content?.[0]?.content?.[0]?.text).toBe("SELECT id, name FROM users WHERE active = true;");
    expect(host.querySelector('pre .hljs-keyword')?.textContent).toBe("SELECT");

    const selected = host.querySelector<HTMLInputElement>('.looma-editor__code-language [role="combobox"]')!;
    selected.focus();
    await userEvent.keyboard("{ArrowDown}");
    await flushBrowser();
    const auto = [...host.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === "Auto (INI)");
    expect(auto).toBeTruthy();
    await userEvent.click(auto!);
    await flushBrowser();
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: null });
    editor.commands.undo();
    await flushBrowser();
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: "sql" });
    editor.commands.redo();
    await flushBrowser();
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: null });

    editor.commands.setContent(saved);
    editor.commands.focus("start");
    await flushBrowser();
    expect(host.querySelector<HTMLInputElement>('.looma-editor__code-language [role="combobox"]')?.value).toBe("SQL");

    editor.commands.setContent('<pre><code class="language-rust">fn main() {}</code></pre>');
    editor.commands.focus("start");
    await flushBrowser();
    expect(host.querySelector<HTMLInputElement>('.looma-editor__code-language [role="combobox"]')?.value).toBe("RUST (unavailable)");
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: "rust" });
  });

  it("floats the code language picker above the code block holding the cursor", async () => {
    const { editor, host } = await mountEditor({ codeLanguages: { sql: common.sql } });
    editor.commands.setContent('<p>Intro</p><p>More</p><p>Even more</p><pre><code>SELECT 1;</code></pre><p>After</p>');
    editor.commands.focus("start");
    await flushBrowser();
    expect(host.querySelector(".looma-editor__code-language")).toBeNull();

    let codePos = 0;
    editor.state.doc.forEach((node, offset) => { if (node.type.name === "codeBlock") codePos = offset + 1; });
    editor.commands.setTextSelection(codePos);
    await flushBrowser();
    const pre = host.querySelector("pre")!;
    const block = pre.getBoundingClientRect();
    const picker = host.querySelector(".looma-editor__code-language")!.getBoundingClientRect();
    expect(picker.bottom).toBeLessThanOrEqual(block.top);
    expect(Math.abs((picker.left + picker.right) / 2 - (block.left + block.right) / 2)).toBeLessThan(1);
    // No space is reserved inside the block for the picker.
    expect(getComputedStyle(pre).paddingTop).toBe(getComputedStyle(pre).paddingBottom);

    editor.commands.setTextSelection(1);
    await flushBrowser();
    expect(host.querySelector(".looma-editor__code-language")).toBeNull();
  });

  it("opens the full toolbar from an app button in popover mode, with a text-only selection bubble", async () => {
    await page.viewport(1280, 720);
    vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
    const open = ref(false);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h("button", { id: "format-trigger", type: "button" }, "Format"),
        h(LoomaEditor, {
          modelValue: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }] },
          toolbarMode: "popover",
          toolbarTriggerId: "format-trigger",
          toolbarOpen: open.value,
          "onUpdate:toolbarOpen": (value: boolean) => { open.value = value; },
        }),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await flushBrowser();

    // The selection bubble offers only text formatting; the rest lives in the app-opened popover.
    await userEvent.click(host.querySelector(".ProseMirror p")!);
    await userEvent.keyboard("{Home}{Shift>}{End}{/Shift}");
    const bubbleToolbar = () => [...document.querySelectorAll('[aria-label="Bold"]')]
      .find((button) => !button.closest(".looma-editor__formatting-popover"))?.closest('[role="toolbar"]');
    await expect.poll(bubbleToolbar, { timeout: 3000 }).toBeTruthy();
    expect(bubbleToolbar()?.querySelector('[aria-label="Heading 1"]')).toBeNull();

    await userEvent.click(host.querySelector("#format-trigger")!);
    const popover = () => host.querySelector<HTMLElement>(".looma-editor__formatting-popover");
    await expect.poll(() => popover()?.matches(":popover-open")).toBe(true);
    expect(popover()?.querySelector('[aria-label="Heading 1"]')).toBeTruthy();
    expect(open.value).toBe(true);

    await userEvent.click(host.querySelector("#format-trigger")!);
    await expect.poll(() => open.value).toBe(false);
    expect(popover()?.matches(":popover-open")).toBe(false);
  });

  it("turns three typed backticks into a code block with the cursor inside", async () => {
    const { editor, host } = await mountEditor();
    editor.commands.focus("start");
    await userEvent.type(editor.view.dom, "```");
    await flushBrowser();

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "codeBlock", attrs: { language: null } });
    expect(editor.state.selection.$head.parent.type.name).toBe("codeBlock");
    expect(host.querySelector<HTMLInputElement>('.looma-editor__code-language [role="combobox"]')?.value).toBe("Auto");
    await userEvent.keyboard("SELECT 1");
    expect(editor.getJSON().content?.[0]?.content?.[0]?.text).toBe("SELECT 1");
    const lowlight = editor.extensionManager.extensions.find((extension) => extension.name === "codeBlock")!
      .options.lowlight as { listLanguages(): string[] };
    await vi.waitFor(() => expect(lowlight.listLanguages()).toHaveLength(20));
  });

  it("hides the code language control when the editor becomes read-only", async () => {
    const { editor, host, editable } = await mountEditor({ codeLanguages: { sql: common.sql } });
    editor.commands.setContent('<pre><code>SELECT 1</code></pre>');
    editor.commands.focus("start");
    await flushBrowser();
    expect(host.querySelector('.looma-editor__code-language [role="combobox"]')).toBeTruthy();

    editable.value = false;
    await flushBrowser();
    expect(host.querySelector('.looma-editor__code-language [role="combobox"]')).toBeNull();
    expect(host.querySelector('pre code')?.textContent).toBe('SELECT 1');
  });

  it("omits inline display-none source content from a formatted paste", async () => {
    const { editor } = await mountEditor();
    editor.commands.focus("start");
    pasteFromSourceEditor(editor,
      '<p>Visible <span style="display   :   none">Hidden</span>text</p>',
      "html");
    await flushBrowser();

    expect(editor.getText()).toBe("Visible text");
    expect(editor.getHTML()).not.toContain("Hidden");

    editor.commands.selectAll();
    pasteFromSourceEditor(editor, '<p style="display:none">Not inserted</p>', "html");
    await flushBrowser();
    expect(editor.getText()).toBe("Visible text");
  });

  it("undoes and redoes a structured document paste with keyboard shortcuts", async () => {
    const { editor } = await mountEditor();
    editor.commands.focus("start");
    pasteFromSourceEditor(
      editor,
      "<!doctype html><html><body><h1>Imported title</h1><p>Imported body</p></body></html>",
      "html",
    );
    await flushBrowser();
    expect(editor.getJSON().content?.[0]?.type).toBe("heading");

    await historyShortcut("undo");
    await flushBrowser();
    expect(editor.getText()).toBe("");

    await historyShortcut("redo");
    await flushBrowser();
    expect(editor.getText()).toContain("Imported title");
  });

  it("keeps sticky Undo and Redo controls current for uncontrolled transactions", async () => {
    const { editor, host } = await mountEditor({ controlled: false, toolbarMode: "sticky" });
    const toolbar = host.querySelector<HTMLElement>(".looma-editor__sticky-toolbar-shell");
    expect(toolbar).toBeTruthy();

    editor.chain().focus("start").insertContent("Undo me").run();
    await flushBrowser();
    const undo = toolbar!.querySelector<HTMLButtonElement>(
      '[data-component~="ui-icon-button"][aria-label="Undo"]',
    )!;
    expect(editor.can().undo()).toBe(true);
    expect(undo.disabled).toBe(false);
    expect(undo.querySelector("button")).toBeNull();
    undo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushBrowser();
    expect(editor.getText()).toBe("");

    const redo = toolbar!.querySelector<HTMLButtonElement>(
      '[data-component~="ui-icon-button"][aria-label="Redo"]',
    )!;
    expect(editor.can().redo()).toBe(true);
    expect(redo.disabled).toBe(false);
    expect(redo.querySelector("button")).toBeNull();
    redo.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await flushBrowser();
    expect(editor.getText()).toBe("Undo me");
  });

  it("offers a Highlight control only while authors may highlight", async () => {
    const control = (host: HTMLElement, label: string) => host.querySelector(
      `.looma-editor__sticky-toolbar-shell [aria-label="${label}"]`,
    );
    const modifier = navigator.userAgent.includes("Mac OS X") ? "Meta" : "Control";
    const highlightShortcut = async (editor: Editor) => {
      editor.commands.insertContent("word");
      editor.commands.focus();
      await flushBrowser();
      editor.commands.setTextSelection({ from: 1, to: 5 });
      expect(editor.isFocused).toBe(true);
      await userEvent.keyboard(`{${modifier}>}{Shift>}h{/Shift}{/${modifier}}`);
      await flushBrowser();
    };
    const editable = await mountEditor({ toolbarMode: "sticky" });
    expect(control(editable.host, "Highlight")).toBeTruthy();
    await highlightShortcut(editable.editor);
    expect(JSON.stringify(editable.editor.getJSON())).toContain("highlight");

    const disabled = await mountEditor({ toolbarMode: "sticky", disableHighlight: true });
    expect(control(disabled.host, "Bold")).toBeTruthy();
    expect(control(disabled.host, "Highlight")).toBeNull();
    await highlightShortcut(disabled.editor);
    expect(JSON.stringify(disabled.editor.getJSON())).not.toContain("highlight");
  });
});
