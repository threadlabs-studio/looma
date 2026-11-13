import { expect, it } from "vitest";
import { createScene, createState, sceneNode } from "@looma-test/scene";
import { UiEditor } from "@looma-test/components";
import { editorUnderTest } from "./editor-test-target";
import "../tokens.css";

const LoomaEditor = await editorUnderTest(UiEditor);

it("shares paragraph formatting between reading and writing", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const editable = createState(false);
  const content = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Manuscript." }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "A quotation." }] }] },
  ] };
  const app = createScene({ render: () => sceneNode(LoomaEditor, { editable: editable.value, content }) });
  try {
    app.mount(host);
    const paragraph = () => host.querySelector(".ProseMirror > p")!;
    await expect.poll(() => paragraph()).toBeTruthy();
    expect(getComputedStyle(paragraph()).textIndent).toBe("0px");
    host.style.setProperty("--ui-editor-paragraph-indent", "22px");
    host.style.setProperty("--ui-editor-paragraph-gap", "0px");
    for (const mode of [false, true]) {
      editable.value = mode;
      await expect.poll(() => host.querySelector(".ProseMirror")?.getAttribute("contenteditable")).toBe(String(mode));
      expect(getComputedStyle(paragraph()).textIndent).toBe("22px");
      expect(getComputedStyle(paragraph()).marginBlockEnd).toBe("0px");
      expect(getComputedStyle(host.querySelector(".ProseMirror blockquote > p")!).textIndent).toBe("0px");
    }
    const surface = host.querySelector(".ProseMirror")!;
    const originalPadding = Number.parseFloat(getComputedStyle(surface).paddingBlockEnd);
    const originalContent = surface.innerHTML;
    host.style.setProperty("--ui-editor-trailing-scroll-space", "60px");
    expect(Number.parseFloat(getComputedStyle(surface).paddingBlockEnd)).toBeCloseTo(originalPadding + 60);
    expect(surface.innerHTML).toBe(originalContent);
  } finally {
    app.unmount();
    host.remove();
  }
});
