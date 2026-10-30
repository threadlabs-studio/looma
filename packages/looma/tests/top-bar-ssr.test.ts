import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import TopBar from "../vue/UiTopBar.js";

describe("TopBar before upgrade", () => {
  const render = (titleFor?: string) => renderToString(createSSRApp({ render: () => h(TopBar, { titleFor }, {
    leading: () => h("button", "Back"),
    default: () => "Document title",
    actions: () => h("button", "Save"),
  }) }));

  it("keeps the ordinary title visible without an observed heading", async () => {
    const html = await render();
    expect(html).toContain('aria-hidden="false"');
    expect(html).not.toMatch(/\sinert(?:[\s=>])/);
    expect(html).toContain("Document title");
  });

  it("conceals only the duplicate title until the heading can be observed", async () => {
    const html = await render("document-heading");
    expect(html).toMatch(/class="[^"]*title[^"]*concealed[^"]*"[^>]*aria-hidden="true"/);
    expect(html).toMatch(/\sinert(?:[\s=>])/);
    expect(html).toContain(">Back</button>");
    expect(html).toContain(">Save</button>");
  });
});
