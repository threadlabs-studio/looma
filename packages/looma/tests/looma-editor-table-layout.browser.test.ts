import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultEditorExtensions, normalizeActiveTableColumnWidths } from "../src/editor/extensions";
import "../src/vue/editor/looma-editor.css";
import "../tokens.css";
import "../theme-light.css";

const editors: Editor[] = [];

function table(columns: number, text: string, columnWidth?: number): JSONContent {
  return {
    type: "table",
    content: [{
      type: "tableRow",
      content: Array.from({ length: columns }, () => ({
        type: "tableCell",
        ...(columnWidth ? { attrs: { colspan: 1, rowspan: 1, colwidth: [columnWidth] } } : {}),
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    }],
  };
}

function mountTable(width: number, columns: number, text: string, columnWidth?: number) {
  const host = document.createElement("div");
  host.style.width = `${width}px`;
  document.body.append(host);
  const editor = new Editor({
    element: host,
    extensions: getDefaultEditorExtensions(),
    content: { type: "doc", content: [table(columns, text, columnWidth)] },
  });
  editors.push(editor);
  const wrapper = host.querySelector<HTMLElement>(".tableWrapper")!;
  const element = wrapper.querySelector<HTMLTableElement>("table")!;
  return { editor, wrapper, element };
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
  document.body.innerHTML = "";
});

describe("LoomaEditor table layout (real browser)", () => {
  it("fits a two-column table to the page and wraps long cell text", () => {
    const { wrapper, element } = mountTable(640, 2,
      "This is a deliberately long explanation that should wrap inside its cell rather than make the whole table wider than the page.");
    expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(wrapper.clientWidth + 1);
    expect(element.getBoundingClientRect().width).toBeGreaterThanOrEqual(wrapper.clientWidth - 1);
  });

  it("keeps a many-column table scrollable instead of squeezing its cells", () => {
    const { wrapper, element } = mountTable(375, 6, "A choice");
    expect(element.getBoundingClientRect().width).toBeGreaterThan(wrapper.clientWidth);
    expect(wrapper.scrollWidth).toBeGreaterThan(wrapper.clientWidth);
  });

  it.each<[number, number, number]>([[375, 2, 1], [640, 3, 1], [641, 3, 2], [640.5, 3, 1]])(
    "keeps a fitting %spx table inside its wrapper after saving column widths (columns=%s, border=%s)",
    (width, columns, border) => {
      const { editor, wrapper, element } = mountTable(width, columns, "Sized column");
      for (const cell of Array.from(element.rows[0]!.cells)) cell.style.borderWidth = `${border}px`;
      editor.commands.setTextSelection(3);
      const before = element.getBoundingClientRect().width;
      expect(wrapper.scrollWidth).toBe(wrapper.clientWidth);
      for (let iteration = 0; iteration < 3; iteration += 1) {
        normalizeActiveTableColumnWidths(editor, element);
        expect(wrapper.scrollWidth).toBe(wrapper.clientWidth);
        expect(element.getBoundingClientRect().width).toBeLessThanOrEqual(before);
      }
    }
  );

  it("retains deliberately wide saved column widths as a scrollable table", () => {
    const { editor, wrapper, element } = mountTable(640, 2, "Sized column", 500);
    editor.commands.setTextSelection(3);
    const before = element.getBoundingClientRect().width;
    normalizeActiveTableColumnWidths(editor, element);
    expect(element.getBoundingClientRect().width).toBe(before);
    expect(element.getBoundingClientRect().width).toBeGreaterThan(wrapper.clientWidth);
    expect(wrapper.scrollWidth).toBeGreaterThan(wrapper.clientWidth);
  });
});
