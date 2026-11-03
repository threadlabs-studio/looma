import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiEditor } from "@looma-test/components";
import { UiCompactEditor } from "@looma-test/components";
import { UiCompactContent } from "@looma-test/components";

const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Safe <script>text</script>", marks: [{ type: "bold" }] }] }] };

describe("editor definitions during SSR", () => {
  it("preserves the authored full-document fallback without starting an editor", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(UiEditor, { content, label: "Document" }, { fallback: () => sceneNode("p", "The authored document baseline.") }) }));
    expect(html).toContain("The authored document baseline.");
    expect(html).not.toContain("ProseMirror");
  });
  it.each([UiCompactEditor, UiCompactContent])("renders compact content as escaped semantic text", async Component => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Component, { content }) }));
    expect(html).toContain("Safe &lt;script&gt;text&lt;/script&gt;");
    expect(html).toContain("<strong");
    // This scene has one component root; renderer comments and CSS markers may differ.
    const root = new JSDOM(html).window.document.body.firstElementChild!;
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector("strong")?.textContent).toBe("Safe <script>text</script>");
    expect(html).not.toContain("ProseMirror");
  });
});
