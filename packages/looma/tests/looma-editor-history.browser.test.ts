import { page, userEvent } from "@vitest/browser/context";
import type { Editor, JSONContent } from "@tiptap/core";
import { common } from "lowlight";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
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

async function historyShortcut(direction: "undo" | "redo") {
  const modifier = navigator.userAgent.includes("Mac OS X") ? "Meta" : "Control";
  const shift = direction === "redo" ? "{Shift>}" : "";
  const releaseShift = direction === "redo" ? "{/Shift}" : "";
  await userEvent.keyboard(`{${modifier}>}${shift}z${releaseShift}{/${modifier}}`);
}

async function mountEditor(options: { controlled?: boolean; editable?: boolean; toolbarMode?: "bubble" | "sticky"; disableHighlight?: boolean; codeLanguages?: Record<string, typeof common.sql> } = {}) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
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
    await flushBrowser();

    const language = host.querySelector<HTMLInputElement>('pre [role="combobox"]');
    expect(language?.value).toBe("Auto (INI)");
    const blockBounds = host.querySelector("pre")!.getBoundingClientRect();
    const controlBounds = language!.getBoundingClientRect();
    expect(controlBounds.right).toBeLessThanOrEqual(blockBounds.right);
    expect(controlBounds.left).toBeGreaterThanOrEqual(blockBounds.left);
    await page.viewport(1280, 720);
    language!.focus();
    await userEvent.keyboard("{ArrowDown}");
    await flushBrowser();
    const sql = [...host.querySelectorAll<HTMLElement>('[role="option"]')]
      .find((option) => option.textContent?.trim() === "SQL");
    expect(sql).toBeTruthy();
    await userEvent.click(sql!);
    await flushBrowser();

    const saved = editor.getJSON();
    expect(saved.content?.[0]?.attrs).toEqual({ language: "sql" });
    expect(saved.content?.[0]?.content?.[0]?.text).toBe("SELECT id, name FROM users WHERE active = true;");
    expect(host.querySelector('pre .hljs-keyword')?.textContent).toBe("SELECT");

    const selected = host.querySelector<HTMLInputElement>('pre [role="combobox"]')!;
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
    await flushBrowser();
    expect(host.querySelector<HTMLInputElement>('pre [role="combobox"]')?.value).toBe("SQL");

    editor.commands.setContent('<pre><code class="language-rust">fn main() {}</code></pre>');
    await flushBrowser();
    expect(host.querySelector<HTMLInputElement>('pre [role="combobox"]')?.value).toBe("RUST (unavailable)");
    expect(editor.getJSON().content?.[0]?.attrs).toEqual({ language: "rust" });
  });

  it("turns three typed backticks into a code block with the cursor inside", async () => {
    const { editor, host } = await mountEditor();
    editor.commands.focus("start");
    await userEvent.type(editor.view.dom, "```");
    await flushBrowser();

    expect(editor.getJSON().content?.[0]).toMatchObject({ type: "codeBlock", attrs: { language: null } });
    expect(editor.state.selection.$head.parent.type.name).toBe("codeBlock");
    expect(host.querySelector('pre [role="combobox"]')).toBeNull();
    await userEvent.keyboard("SELECT 1");
    expect(editor.getJSON().content?.[0]?.content?.[0]?.text).toBe("SELECT 1");
  });

  it("hides the code language control when the editor becomes read-only", async () => {
    const { editor, host, editable } = await mountEditor({ codeLanguages: { sql: common.sql } });
    editor.commands.setContent('<pre><code>SELECT 1</code></pre>');
    await flushBrowser();
    expect(host.querySelector('pre [role="combobox"]')).toBeTruthy();

    editable.value = false;
    await flushBrowser();
    expect(host.querySelector('pre [role="combobox"]')).toBeNull();
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
