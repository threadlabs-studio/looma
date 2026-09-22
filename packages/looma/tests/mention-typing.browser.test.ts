import { userEvent } from "@vitest/browser/context";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { afterEach, expect, it, vi } from "vitest";
import {
  createLoomaMentionExtension,
  type LoomaMentionMenuSnapshot,
} from "../src/editor/extensions";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

it("settles an async mention query typed character by character", async () => {
  const element = document.createElement("div");
  document.body.append(element);
  let snapshot: LoomaMentionMenuSnapshot | null = null;
  const provider = vi.fn(async () => [
    { id: "ada", label: "Ada Lovelace", detail: "ada@example.com" },
  ]);
  editor = new Editor({
    element,
    extensions: [
      Document,
      Paragraph,
      Text,
      createLoomaMentionExtension({
        items: provider,
        onStateChange: (value) => { snapshot = value; },
      }),
    ],
  });

  await userEvent.click(editor.view.dom);
  await userEvent.keyboard("@ad");

  await vi.waitFor(() => expect(snapshot).toMatchObject({
    active: true,
    loading: false,
    query: "ad",
    items: [{ id: "ada", label: "Ada Lovelace" }],
  }));
});
