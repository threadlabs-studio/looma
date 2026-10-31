import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { UiEditor } from "../src/components/ui-editor/ui-editor.html";
import { UiCompactEditor } from "../src/components/ui-compact-editor/ui-compact-editor.html";
import { UiCompactContent } from "../src/components/ui-compact-content/ui-compact-content.html";

const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Safe <script>text</script>", marks: [{ type: "bold" }] }] }] };

describe("editor definitions during SSR", () => {
  it("preserves the authored full-document fallback without starting an editor", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(UiEditor, { content, label: "Document" }, { fallback: () => h("p", "The authored document baseline.") }) }));
    expect(html).toContain("The authored document baseline.");
    expect(html).not.toContain("ProseMirror");
  });
  it.each([UiCompactEditor, UiCompactContent])("renders compact content as escaped semantic text", async Component => {
    const html = await renderToString(createSSRApp({ render: () => h(Component, { content }) }));
    expect(html).toContain("Safe &lt;script&gt;text&lt;/script&gt;");
    expect(html).toContain("<strong");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("ProseMirror");
  });
});
