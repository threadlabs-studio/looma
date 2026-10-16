// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { createImageUploads, type LoomaImageUploader } from "../src/editor/image-uploads";

const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function setup(upload: LoomaImageUploader | undefined) {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: "<p>Hello</p>" });
  editors.push(editor);
  const onError = vi.fn();
  const uploads = createImageUploads({ editor, upload: () => upload, onError });
  const states: string[] = [];
  uploads.subscribe(() => states.push(`${uploads.state.uploading ? "uploading" : "idle"}${uploads.state.failed ? `:${uploads.state.failed.name}` : ""}`));
  return { editor, uploads, onError, states };
}

const file = (name: string) => new File(["x"], name, { type: "image/png" });
const images = (editor: Editor) => (editor.getJSON().content ?? []).flatMap((node) => [node, ...(node.content ?? [])]).filter((node) => node.type === "image").map((node) => node.attrs);

describe("image uploads", () => {
  it("uploads each file in turn and inserts its image, with the file name as the default description and only valid dimensions", async () => {
    const upload = vi.fn(async (input: File) => input.name === "a.png"
      ? "https://cdn.example.com/a.png"
      : { url: "https://cdn.example.com/b.png", alt: "Bee", width: 640, height: -1, responsive: true });
    const { editor, uploads, states } = setup(upload);
    await uploads.insert([file("a.png"), file("b.png")]);
    expect(upload.mock.calls.map(([input]) => input.name)).toEqual(["a.png", "b.png"]);
    expect(images(editor)).toEqual([
      expect.objectContaining({ src: "https://cdn.example.com/a.png", alt: "a.png" }),
      expect.objectContaining({ src: "https://cdn.example.com/b.png", alt: "Bee", width: 640, responsive: true }),
    ]);
    expect(images(editor)[1]).toHaveProperty("height", null);
    expect(states).toEqual(["uploading", "uploading", "idle", "uploading", "uploading", "idle"]);
  });

  it("keeps the document on a failed upload, reports it, and sends the file again on retry", async () => {
    let fail = true;
    const { editor, uploads, onError, states } = setup(async () => {
      if (fail) throw new Error("offline");
      return "https://cdn.example.com/c.png";
    });
    const before = editor.getJSON();
    await uploads.insert([file("c.png")]);
    expect(editor.getJSON()).toEqual(before);
    expect(onError).toHaveBeenCalledWith(new Error("offline"), expect.objectContaining({ name: "c.png" }));
    expect(uploads.state).toEqual({ uploading: false, failed: expect.objectContaining({ name: "c.png" }) });
    fail = false;
    await uploads.retry();
    expect(images(editor)).toEqual([expect.objectContaining({ src: "https://cdn.example.com/c.png" })]);
    expect(uploads.state.failed).toBeNull();
    expect(states.at(-1)).toBe("idle");
  });

  it("does nothing without an uploader", async () => {
    const { editor, uploads, states } = setup(undefined);
    await uploads.insert([file("d.png")]);
    expect(images(editor)).toEqual([]);
    expect(states).toEqual([]);
  });
});
