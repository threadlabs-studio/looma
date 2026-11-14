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


it("uses a paragraph whitespace policy without rewriting breaks or moving the selection", async () => {
  const host = document.createElement("div");
  host.style.width = "550px";
  document.body.append(host);
  const editable = createState(false);
  const content = { type: "doc", content: [
    { type: "paragraph", content: [
      { type: "text", text: "First line.\nSoft   line." },
      { type: "hardBreak" },
      { type: "text", text: "Hard line." },
    ] },
    { type: "codeBlock", content: [{ type: "text", text: "literal\n  spaces" }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Quoted\nline." }] }] },
  ] };
  const app = createScene({ render: () => sceneNode(LoomaEditor, { editable: editable.value, content }) });
  try {
    app.mount(host);
    const paragraph = () => host.querySelector(".ProseMirror > p")!;
    await expect.poll(() => paragraph()).toBeTruthy();
    expect(getComputedStyle(paragraph()).whiteSpace).toBe("break-spaces");
    const visible = (element: Element) => (element as HTMLElement).innerText;
    const code = host.querySelector(".ProseMirror pre")!;
    expect(visible(paragraph())).toMatch(/^First line\.\nSoft {3}line\.\nHard line\./u);
    expect(visible(code)).toContain("literal\n  spaces");
    for (const mode of [false, true]) {
      editable.value = mode;
      await expect.poll(() => host.querySelector(".ProseMirror")?.getAttribute("contenteditable")).toBe(String(mode));
      host.style.setProperty("--ui-editor-paragraph-white-space", "normal");
      expect(visible(paragraph())).toMatch(/^First line\. Soft line\.\nHard line\./u);
      expect(visible(code)).toContain("literal\n  spaces");
      expect(visible(host.querySelector(".ProseMirror blockquote p")!)).toContain("Quoted\nline.");
      expect(paragraph().firstChild?.textContent).toBe("First line.\nSoft   line.");
      host.style.removeProperty("--ui-editor-paragraph-white-space");
    }
    const text = paragraph().firstChild!;
    const arm = document.getSelection()!;
    arm.collapse(text, 14);
    host.style.setProperty("--ui-editor-paragraph-white-space", "normal");
    expect(visible(paragraph())).toContain("First line. Soft line.");
    expect(arm.anchorNode).toBe(text);
    expect(arm.anchorOffset).toBe(14);
    expect(paragraph().querySelectorAll("br")).toHaveLength(1);
  } finally {
    app.unmount();
    host.remove();
  }
});
