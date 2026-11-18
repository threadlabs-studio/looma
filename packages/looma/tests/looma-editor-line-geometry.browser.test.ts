import type { Editor } from "@tiptap/core";
import { afterEach, expect, it } from "vitest";
import { createScene, sceneNode } from "@looma-test/scene";
import { UiEditor } from "@looma-test/components";
import { measureEditorLine } from "../src/editor";
import { mapEditorMarkdownPositions, markdownToEditorDocument } from "../src/editor/expressmark";
import { captureEditor } from "./editor-test-extensions";
import { editorUnderTest } from "./editor-test-target";
import "../tokens.css";

const LoomaEditor = await editorUnderTest(UiEditor);
const dispose: (() => void)[] = [];
afterEach(() => { for (const cleanup of dispose.splice(0)) cleanup(); });

async function mountEditor() {
  const source = "The night was still and the old stone road turned into a narrow path where the trees bent overhead. " +
    "Mara kept walking until she found **the hidden gate** and stepped through it. " +
    "The path ran beside the river and disappeared under the trees. ".repeat(5);
  const host = document.createElement("div");
  Object.assign(host.style, { overflow: "auto", height: "64px", width: "190px", border: "4px solid transparent" });
  document.body.append(host);
  let editor!: Editor;
  const scene = createScene({
    render: () => sceneNode(LoomaEditor, {
      content: markdownToEditorDocument(source),
      extensions: captureEditor(instance => { editor = instance; }),
    }),
  });
  dispose.push(() => { scene.unmount(); host.remove(); });
  scene.mount(host);
  await expect.poll(() => editor?.view.dom.isConnected).toBe(true);
  return { editor, host, source };
}

it("measures a wrapped marked passage and clips it to the supplied scrollport", async () => {
  const { editor, host, source } = await mountEditor();
  const doc = editor.state.doc;
  const map = mapEditorMarkdownPositions(source, doc);
  const start = source.indexOf("the hidden gate");
  const range = map.toEditorRange(start, start + "the hidden gate".length)!;
  const anchor = { document: doc, position: range.start };
  const initialSelection = editor.state.selection;
  const first = measureEditorLine(editor.view, { document: doc, position: 1 })!;
  const unclipped = measureEditorLine(editor.view, anchor)!;
  expect(editor.view.dom.querySelector("strong")?.textContent).toBe("the hidden gate");
  expect(doc.textBetween(range.start, range.end)).toBe("the hidden gate");
  expect(unclipped.rect.top).toBeGreaterThan(first.rect.bottom);
  expect(unclipped.visible).toBe(true);
  expect(measureEditorLine(editor.view, anchor, { scrollport: host })).toEqual({ ...unclipped, visible: false });

  const top = host.getBoundingClientRect().top + host.clientTop;
  host.scrollTop = unclipped.rect.top - top - 8;
  const inView = measureEditorLine(editor.view, anchor, { scrollport: host })!;
  expect(inView.visible).toBe(true);
  expect(inView.rect.top).toBeGreaterThan(top);

  host.scrollTop += inView.rect.top - top + Math.floor(inView.rect.height / 2);
  const partiallyClipped = measureEditorLine(editor.view, anchor, { scrollport: host })!;
  expect(partiallyClipped.rect.top).toBeLessThan(top);
  expect(partiallyClipped.rect.bottom).toBeGreaterThan(top);
  expect(partiallyClipped.visible).toBe(true);

  host.scrollTop += partiallyClipped.rect.bottom - top + 8;
  expect(measureEditorLine(editor.view, anchor, { scrollport: host })?.visible).toBe(false);
  expect(editor.state.selection.eq(initialSelection)).toBe(true);
});

it("rejects invalid, outdated, and detached document positions", async () => {
  const { editor, host } = await mountEditor();
  const doc = editor.state.doc;
  for (const position of [-1, 0, 1.5, Number.NaN, doc.content.size, doc.content.size + 1]) {
    expect(measureEditorLine(editor.view, { document: doc, position })).toBeNull();
  }
  const anchor = { document: doc, position: 1 };
  expect(measureEditorLine(editor.view, anchor)).not.toBeNull();
  editor.view.dispatch(editor.state.tr.insertText("Still ", 1));
  expect(measureEditorLine(editor.view, anchor)).toBeNull();
  const current = { document: editor.state.doc, position: 1 };
  expect(measureEditorLine(editor.view, current, { scrollport: document.createElement("div") })).toBeNull();
  host.remove();
  expect(measureEditorLine(editor.view, current)).toBeNull();
});
