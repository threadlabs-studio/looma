import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiSiteHeader as SiteHeader } from "@looma-test/components";

describe("SiteHeader before upgrade", () => {
  it("renders inline navigation once without an open dialog before upgrade", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(SiteHeader, {
      label: "Explore", menuLabel: "Browse pages", closeLabel: "Close pages",
    }, {
      brand: () => sceneNode("a", { href: "/" }, "Folio"),
      navigation: () => sceneNode("a", { href: "/guide" }, "Guide"),
    }) }));
    expect(html.match(/href="\/guide"/g)).toHaveLength(1);
    expect(html).not.toMatch(/<dialog[^>]*\bopen(?:[ =>])/);
    expect(html).not.toContain('role="none"');
    expect(html).toMatch(/<nav[^>]*aria-label="Explore"/);
    expect(html).toContain('aria-label="Browse pages"');
    expect(html).toContain('aria-label="Close pages"');
    expect(new JSDOM(html).window.document.querySelector('svg path[d="M4 12h16"]')).not.toBeNull();
    expect(html).not.toMatch(/data-ui-site-header-state="[^"]*\benhanced\b/);
  });
});
