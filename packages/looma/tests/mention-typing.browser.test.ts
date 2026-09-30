import { userEvent } from "@vitest/browser/context";
import { Editor } from "@tiptap/core";
import Code from "@tiptap/extension-code";
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

function mountMentionEditor(provider: () => Promise<{ id: string; label: string }[]>) {
  const element = document.createElement("div");
  document.body.append(element);
  editor = new Editor({
    element,
    extensions: [Document, Paragraph, Text, Code, createLoomaMentionExtension({ items: provider })],
  });
  return editor;
}

it("does not search for @ text that was inserted rather than typed, even when clicked into", async () => {
  const provider = vi.fn(async () => [{ id: "ada", label: "Ada Lovelace" }]);
  const instance = mountMentionEditor(provider);
  await userEvent.click(instance.view.dom);
  instance.commands.insertContent("See @ForceUpdate.");
  // Clicking into the word puts the cursor inside the would-be query.
  instance.commands.setTextSelection(9);
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(instance.getText()).toBe("See @ForceUpdate.");
  expect(provider).not.toHaveBeenCalled();
});

it("does not search for @ typed inside inline code", async () => {
  const provider = vi.fn(async () => [{ id: "ada", label: "Ada Lovelace" }]);
  const instance = mountMentionEditor(provider);
  instance.commands.setContent("<p><code>npm i pkg</code></p>");
  await userEvent.click(instance.view.dom);
  instance.commands.setTextSelection(5);
  await userEvent.keyboard("@ad");
  await new Promise((resolve) => setTimeout(resolve, 100));

  expect(instance.getText()).toContain("@ad");
  expect(provider).not.toHaveBeenCalled();
});
