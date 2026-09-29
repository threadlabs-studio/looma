import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
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
  return { wrapper, element };
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

  it("retains deliberately wide saved column widths as a scrollable table", () => {
    const { wrapper, element } = mountTable(640, 2, "Sized column", 500);
    expect(element.getBoundingClientRect().width).toBeGreaterThan(wrapper.clientWidth);
    expect(wrapper.scrollWidth).toBeGreaterThan(wrapper.clientWidth);
  });
});
