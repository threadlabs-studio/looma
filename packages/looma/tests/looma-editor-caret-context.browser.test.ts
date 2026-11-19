import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { createScene, sceneNode } from "@looma-test/scene";
import { UiEditor } from "@looma-test/components";
import { LoomaCaretContext } from "../src/editor/extensions";
import { captureEditor } from "./editor-test-extensions";
import { editorUnderTest } from "./editor-test-target";
import "../tokens.css";

const LoomaEditor = await editorUnderTest(UiEditor);
const dispose: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of dispose.splice(0)) cleanup();
});

const ready = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

async function mountEditor(lines = 0) {
  const host = document.createElement("div");
  Object.assign(host.style, { overflowY: "auto", height: "300px", width: "400px" });
  host.style.setProperty("--ui-editor-paragraph-gap", "0px");
  document.body.append(host);
  let editor!: Editor;
  const capture = captureEditor(instance => { editor = instance; });
  const content = {
    type: "doc",
    content: Array.from({ length: 36 }, (_, index) => ({
      type: "paragraph", content: [{
        type: "text",
        text: `Paragraph ${index + 1} with a place to write.` + (index === 13 ? " A paragraph continues into another rendered line with room for the story.".repeat(2) : ""),
      }],
    })),
  };
  const scene = createScene({
    render: () => sceneNode(LoomaEditor, {
      content,
      extensions: () => [...capture(), ...(lines ? [LoomaCaretContext.configure({ lines })] : [])],
    }),
  });
  dispose.push(() => { scene.unmount(); host.remove(); });
  scene.mount(host);
  await expect.poll(() => editor, { timeout: 5_000 }).toBeTruthy();
  editor.view.focus();
  await ready();
  const paragraph = (index: number) => editor.view.dom.querySelectorAll("p")[index]!;
  const lineHeight = Number.parseFloat(getComputedStyle(paragraph(0)).lineHeight);
  const clickNear = async (index: number, offset: number) => {
    const target = paragraph(index);
    const before = host.scrollTop + target.getBoundingClientRect().top - host.getBoundingClientRect().top - offset;
    host.scrollTo({ top: before, behavior: "instant" });
    const scrollTop = host.scrollTop;
    await userEvent.click(target, { position: { x: 10, y: lineHeight / 2 } });
    await ready();
    expect(editor.state.selection.$head.parent.textContent).toBe(target.textContent);
    return scrollTop;
  };
  return { editor, host, content, paragraph, lineHeight, clickNear };
}

it("repositions clicks near both edges of a nested scroller and leaves middle clicks in place", async () => {
  const { editor, host, content, lineHeight, clickNear } = await mountEditor(3);
  host.style.scrollBehavior = "smooth";
  const pageOffset = window.scrollY;
  const top = await clickNear(13, 8);
  expect(host.scrollTop).toBeLessThan(top);
  const caret = () => editor.view.coordsAtPos(editor.state.selection.head);
  expect(caret().top - host.getBoundingClientRect().top).toBeCloseTo(3 * lineHeight, -1);
  const selected = editor.state.selection.head;
  const sameLine = await clickNear(13, 8);
  expect(host.scrollTop).toBeLessThan(sameLine);
  expect(editor.state.selection.head).toBe(selected);

  const bottom = await clickNear(21, host.clientHeight - lineHeight - 8);
  expect(host.scrollTop).toBeGreaterThan(bottom);
  expect(host.getBoundingClientRect().bottom - caret().bottom).toBeCloseTo(3 * lineHeight, -1);

  const middle = await clickNear(21, 140);
  expect(host.scrollTop).toBe(middle);
  expect(window.scrollY).toBe(pageOffset);
  expect(editor.getJSON()).toEqual(content);
  expect(editor.state.selection.empty).toBe(true);
});

it("keeps caret context optional and honors the document bounds and trailing space", async () => {
  const plain = await mountEditor();
  const before = await plain.clickNear(13, 8);
  expect(plain.host.scrollTop).toBe(before);

  const { editor, host, lineHeight, paragraph, clickNear } = await mountEditor(3);
  host.scrollTo({ top: 0, behavior: "instant" });
  await userEvent.click(paragraph(0), { position: { x: 10, y: lineHeight / 2 } });
  await ready();
  expect(host.scrollTop).toBe(0);

  host.style.setProperty("--ui-editor-trailing-scroll-space", "3lh");
  const end = editor.state.doc.content.size - 1;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, end)));
  await ready();
  expect(editor.state.selection.head).toBe(end);
  expect(host.getBoundingClientRect().bottom - editor.view.coordsAtPos(end).bottom).toBeGreaterThan(2 * lineHeight);

  await clickNear(15, 140);
  const top = host.scrollTop;
  host.scrollTo({ top: top + 130, behavior: "instant" });
  await userEvent.keyboard("{ArrowRight}");
  await ready();
  expect(host.scrollTop).toBeLessThan(top + 130);
  const caretPosition = editor.state.selection.head;
  host.scrollTo({ top: host.scrollTop + 40, behavior: "instant" });
  const beforeTyping = host.scrollTop;
  await userEvent.keyboard("A");
  await ready();
  expect(editor.state.doc.textBetween(caretPosition, caretPosition + 1)).toBe("A");
  expect(host.scrollTop).toBeLessThan(beforeTyping);
});
