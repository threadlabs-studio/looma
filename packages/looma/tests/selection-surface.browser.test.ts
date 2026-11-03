import { Editor, Node as EditorNode } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { expect, it, vi } from "vitest";
import { createSelectionSurface } from "../src/editor/selection-surface";
import { createAnchoredSurface } from "../src/components/shared/overlay.js";

it("waits for a virtual anchor before exposing a floating surface", async () => {
  const element = document.createElement("div");
  element.textContent = "Floating actions";
  document.body.append(element);
  let anchor: DOMRect | null = null;
  const surface = createAnchoredSurface(element, { anchor: () => anchor, bare: true, maxWidth: 200 });
  try {
    surface.show();
    expect(element.matches(":popover-open")).toBe(false);
    expect(element.hidden).toBe(true);
    anchor = new DOMRect(20, 100, 50, 20);
    await vi.waitFor(() => expect(element.matches(":popover-open")).toBe(true));
    const box = element.getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
  } finally { surface.destroy(); element.remove(); }
});

it("contains a resized anchored surface before the resize is painted", async () => {
  const element = document.createElement("div");
  Object.assign(element.style, { width: "40px", height: "20px" });
  document.body.append(element);
  const width = document.documentElement.clientWidth;
  const surface = createAnchoredSurface(element, {
    anchor: () => new DOMRect(width - 50, 100, 10, 10), placement: "bottom-start", bare: true, maxWidth: 240,
  });
  let observer: ResizeObserver | undefined;
  try {
    surface.show();
    const resized = new Promise<DOMRect>(resolve => {
      observer = new ResizeObserver(() => {
        const box = element.getBoundingClientRect();
        if (box.width === 240) resolve(box);
      });
      observer.observe(element);
    });
    element.style.width = "240px";
    const box = await resized;
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
  } finally { observer?.disconnect(); surface.destroy(); element.remove(); }
});

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
