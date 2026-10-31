import type { Editor, JSONContent } from "@tiptap/core";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import { editorDocumentToMarkdown, markdownToEditorDocument } from "../src/editor/expressmark";
import { UiEditor } from "../src/components/ui-editor/ui-editor.html";
import { editorUnderTest } from "./editor-test-target";
const LoomaEditor = await editorUnderTest(UiEditor);
import { captureEditor } from "./editor-test-extensions";
import "../tokens.css";
import "../theme-light.css";

const apps: App[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

async function mountEditor() {
  const modelValue = ref<JSONContent>({ type: "doc", content: [{ type: "paragraph" }] });
  const host = document.createElement("div");
  document.body.append(host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, {
      content: modelValue.value,
      onChange: (event: CustomEvent<{ content: JSONContent }>) => { modelValue.value = event.detail.content; },
      extensions: captureEditor(instance => { editor = instance; }),
    }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  await expect.poll(() => editor).toBeTruthy();
  return { editor: editor!, host };
}

// A source editor's clipboard: the Markdown as plain text, wrapped in <pre> as its HTML.
function pasteSource(editor: Editor, text: string) {
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", text);
  clipboardData.setData("text/html", `<pre>${text}</pre>`);
  editor.view.dom.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData }));
}

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  await flushBrowser();
});

describe("LoomaEditor pastes Looma Markdown (real browser)", () => {
  it("turns directives, task lists and nested containers into editor blocks", async () => {
    const { editor, host } = await mountEditor();
    editor.commands.focus("start");
    pasteSource(editor, [
      "Status :chip[Ready]{tone=green}, owned by @[Ada]#u1.", "",
      "- [x] Read the changelog", "- [ ] Run the migration", "",
      ":::: details More", "::: warning", "Nested.", ":::", "```md", ":::", "```", "::::",
    ].join("\n"));
    await flushBrowser();

    expect(editor.getJSON().content?.map(node => node.type)).toEqual(["paragraph", "taskList", "loomaExpand"]);
    const chip = host.querySelector<HTMLElement>(".ProseMirror [data-looma-chip]");
    expect(chip?.dataset.color).toBe("green");
    expect(chip?.textContent).toBe("Ready");
    expect(host.querySelector(".ProseMirror [data-type='mention']")?.textContent).toBe("@Ada");
    const boxes = [...host.querySelectorAll<HTMLInputElement>(".ProseMirror [data-type='taskList'] input[type='checkbox']")];
    expect(boxes.map(box => box.checked)).toEqual([true, false]);
    // The outer fence is longer, the inner `:::` closes the warning, and the `:::` inside the fence stays code.
    expect(editor.getJSON().content?.[2]).toMatchObject({
      attrs: { summary: "More" },
      content: [{ type: "loomaCallout", attrs: { tone: "warning" } }, { type: "codeBlock", content: [{ text: ":::" }] }],
    });
  });

  it("edits tabs panel by panel and a figure's caption in place, then writes them back", async () => {
    const { editor, host } = await mountEditor();
    const fence = "```";
    const markdown = [
      ":::: tabs {group=install}", "::: tab [npm]", `${fence}sh`, "npm install @threadlabs/looma", fence, ":::", "",
      "::: tab [pnpm]", `${fence}sh`, "pnpm add @threadlabs/looma", fence, ":::", "::::", "",
      "::: figure The build", "![Pipeline](/pipeline.svg){width=320}", ":::",
    ].join("\n");
    editor.commands.setContent(markdownToEditorDocument(markdown));
    await flushBrowser();

    // Editing draws plain panels under their labels rather than the Tabs component.
    expect(host.querySelector(".ProseMirror ui-tabs")).toBeNull();
    const labels = [...host.querySelectorAll<HTMLElement>(".ProseMirror [data-looma-tabs] [data-looma-tab-label]")];
    expect(labels.map(label => [label.textContent, label.isContentEditable])).toEqual([["npm", false], ["pnpm", false]]);
    expect([...host.querySelectorAll(".ProseMirror [data-looma-tabs] pre")].map(pre => pre.textContent)).toEqual([
      "npm install @threadlabs/looma", "pnpm add @threadlabs/looma",
    ]);

    const caption = host.querySelector<HTMLElement>(".ProseMirror figure figcaption")!;
    expect(host.querySelector(".ProseMirror figure img")).toBeTruthy();
    let end = 0;
    editor.state.doc.descendants((node, position) => { if (node.type.name === "loomaFigcaption") end = position + node.nodeSize - 1; });
    editor.chain().focus().setTextSelection(end).run();
    await flushBrowser();
    await userEvent.keyboard(" pipeline");
    await flushBrowser();
    expect(caption.textContent).toBe("The build pipeline");
    expect(editorDocumentToMarkdown(editor.getJSON(), { original: markdown })).toBe(markdown.replace("::: figure The build", "::: figure The build pipeline"));
  });
});


it("pastes a source document with front matter and a quoted pipe table as editable blocks", async () => {
  const { editor, host } = await mountEditor();
  editor.commands.focus("start");
  pasteSource(editor, [
    "---", "date: 2026-01-01", "---", "", "# Field guide", "",
    "> | Name | Status |", "> | --- | --- |", "> | Example | Ready |", "",
    "## Details", "", "Body.",
  ].join("\n"));
  await flushBrowser();
  expect(editor.getJSON().content?.map(node => node.type)).toEqual(["codeBlock", "heading", "blockquote", "heading", "paragraph"]);
  expect(host.querySelector(".ProseMirror h1")?.textContent).toBe("Field guide");
  expect(host.querySelector(".ProseMirror blockquote table")?.textContent).toContain("Example");
  expect(host.querySelector(".ProseMirror pre")?.textContent).toContain("date: 2026-01-01");
});
