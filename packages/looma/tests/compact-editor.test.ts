// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { getCompactEditorExtensions } from "../src/vue/editor/compact/extensions";

describe("compact editing schema", () => {
  it("keeps inline marks while reducing pasted document structure", () => {
    const editor = new Editor({ extensions: getCompactEditorExtensions(), content: "<h1><strong>Title</strong></h1><p><em>word</em> <code>run()</code></p><img src='x'>" });
    try {
      expect(editor.getJSON().content?.map(node => node.type)).toEqual(["paragraph", "paragraph"]);
      expect(editor.getHTML()).toBe("<p><strong>Title</strong></p><p><em>word</em> <code>run()</code></p>");
      expect(editor.schema.nodes.heading).toBeUndefined();
      expect(editor.schema.nodes.image).toBeUndefined();
      expect(Object.keys(editor.schema.marks).sort()).toEqual(["bold", "code", "italic"]);
    } finally { editor.destroy(); }
  });
});
