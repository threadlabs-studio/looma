import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import SiteHeader from "../vue/UiSiteHeader.js";

describe("SiteHeader before upgrade", () => {
  it("renders inline navigation once without an open dialog before upgrade", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(SiteHeader, {
      label: "Explore", menuLabel: "Browse pages", closeLabel: "Close pages",
    }, {
      brand: () => h("a", { href: "/" }, "Folio"),
      navigation: () => h("a", { href: "/guide" }, "Guide"),
    }) }));
    expect(html.match(/href="\/guide"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<dialog[^>]*\bopen(?:[ =>])/);
    expect(html).not.toContain('role="none"');
    expect(html).toMatch(/<nav[^>]*aria-label="Explore"/);
    expect(html).toContain('aria-label="Browse pages"');
    expect(html).toContain('aria-label="Close pages"');
    expect(html).toContain('<path d="M4 12h16"');
    expect(html).not.toMatch(/data-ui-site-header-state="[^"]*\benhanced\b/);
  });
});
