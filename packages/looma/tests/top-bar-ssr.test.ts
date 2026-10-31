import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { UiTopBar as TopBar } from "@threadlabs/looma";

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
    const document = new JSDOM(html).window.document;
    const title = document.querySelector(".title")!;
    expect(title.classList.contains("concealed")).toBe(true);
    expect(title.getAttribute("aria-hidden")).toBe("true");
    expect(title.hasAttribute("inert")).toBe(true);
    for (const button of document.querySelectorAll("button")) expect(button.closest("[inert]")).toBeNull();
    expect(html).toContain(">Back</button>");
    expect(html).toContain(">Save</button>");
  });
});
