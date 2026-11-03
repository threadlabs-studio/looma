import { Editor, Node as EditorNode } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { expect, it } from "vitest";
import { createSelectionSurface } from "../src/editor/selection-surface";

it("shows a newly registered surface for an existing selection", () => {
  const mount = document.createElement("div");
  const parent = document.createElement("div");
  const element = document.createElement("div");
  element.setAttribute("role", "toolbar");
  element.textContent = "Selection actions";
  parent.append(element);
  document.body.append(mount, parent);
  const editor = new Editor({ element: mount, content: "<p>Selected words</p>", extensions: [
    EditorNode.create({ name: "doc", topNode: true, content: "paragraph+" }),
    EditorNode.create({ name: "paragraph", group: "block", content: "text*", parseHTML: () => [{ tag: "p" }], renderHTML: () => ["p", 0] }),
    EditorNode.create({ name: "text", group: "inline" }),
  ] });
  editor.commands.setTextSelection({ from: 1, to: 9 });
  const surface = createSelectionSurface({ editor, element, pluginKey: "late-selection", shouldShow: ({ from, to }) => from !== to });
  try {
    expect(element.matches(":popover-open")).toBe(true);
    expect(element.getBoundingClientRect().width).toBeGreaterThan(0);
    editor.registerPlugin(new Plugin({ key: new PluginKey("another-plugin") }));
    expect(element.matches(":popover-open")).toBe(true);
  } finally { surface.destroy(); editor.destroy(); mount.remove(); parent.remove(); }
});
