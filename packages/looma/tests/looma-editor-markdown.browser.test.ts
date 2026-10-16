import type { Editor, JSONContent } from "@tiptap/core";
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

async function mountEditor() {
  const modelValue = ref<JSONContent>({ type: "doc", content: [{ type: "paragraph" }] });
  const host = document.createElement("div");
  document.body.append(host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, {
      modelValue: modelValue.value,
      "onUpdate:modelValue": (value: JSONContent) => { modelValue.value = value; },
      onReady: (instance: Editor) => { editor = instance; },
    }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
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
      "Status :chip[Ready]{tone=green}, owned by :mention[Ada]{id=u1}.", "",
      "- [x] Read the changelog", "- [ ] Run the migration", "",
      "::: details More", "::: warning", "Nested.", ":::", "```md", ":::", "```", ":::",
    ].join("\n"));
    await flushBrowser();

    expect(editor.getJSON().content?.map(node => node.type)).toEqual(["paragraph", "taskList", "loomaExpand"]);
    const chip = host.querySelector<HTMLElement>(".ProseMirror [data-looma-chip]");
    expect(chip?.dataset.color).toBe("green");
    expect(chip?.textContent).toBe("Ready");
    expect(host.querySelector(".ProseMirror [data-type='mention']")?.textContent).toBe("@Ada");
    const boxes = [...host.querySelectorAll<HTMLInputElement>(".ProseMirror [data-type='taskList'] input[type='checkbox']")];
    expect(boxes.map(box => box.checked)).toEqual([true, false]);
    // The inner `:::` closes the warning, and the `:::` inside the fence stays code.
    expect(editor.getJSON().content?.[2]).toMatchObject({
      attrs: { summary: "More" },
      content: [{ type: "loomaCallout", attrs: { tone: "warning" } }, { type: "codeBlock", content: [{ text: ":::" }] }],
    });
  });
});
