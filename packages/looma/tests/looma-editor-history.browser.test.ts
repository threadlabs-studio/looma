import { userEvent } from "@vitest/browser/context";
import type { Editor, JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import "../vue/components.css";

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

async function mountEditor(options: { controlled?: boolean; toolbarMode?: "bubble" | "sticky" } = {}) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
  const modelValue = ref<JSONContent>({ type: "doc", content: [{ type: "paragraph" }] });
  const host = document.createElement("div");
  document.body.append(host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, {
      modelValue: modelValue.value,
      ...(options.toolbarMode ? { toolbarMode: options.toolbarMode } : {}),
      ...(options.controlled === false ? {} : {
        "onUpdate:modelValue": (value: JSONContent) => { modelValue.value = value; },
      }),
      onReady: (instance: Editor) => { editor = instance; },
    }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  return { editor: editor!, host };
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
});
