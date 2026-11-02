import { expect } from "./renderers/test-context";
// Renders ui-icon on the server through the selected server renderer. An icon is
// static data: the server's HTML carries its whole drawing, with no JavaScript needed to show it.
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiIcon as Icon } from "@looma-test/components";
import { UiSpinner as Spinner } from "@looma-test/components";

const render = (...nodes: ReturnType<typeof sceneNode>[]) => renderSceneToString(createHydratedScene({ render: () => nodes }));
const shapes = (html: string) => Array.from(new JSDOM(html).window.document.querySelectorAll("svg path, svg circle, svg rect, svg line")).map(element => ({
  tag: element.localName,
  geometry: Object.fromEntries(Array.from(element.attributes).filter(attribute => ["class", "d", "cx", "cy", "r", "x", "y", "width", "height", "rx", "x1", "y1", "x2", "y2"].includes(attribute.name)).map(attribute => [attribute.name, attribute.value])),
}));

describe("Icon server render", () => {
  it("draws the named icon's shapes", async () => {
    expect(shapes(await render(sceneNode(Icon, { name: "circle-check" })))).toEqual(shapes("<svg>" + [
      '<circle cx="12" cy="12" r="10">',
      '<path d="m9 12 2 2 4-4">',
    ].join("") + "</svg>"));
    expect(shapes(await render(sceneNode(Icon, { name: "columns" })))).toEqual(shapes("<svg>" + [
      '<rect x="3" y="3" width="18" height="18" rx="2">',
      '<path d="M9 3v18">',
      '<path d="M15 3v18">',
    ].join("") + "</svg>"));
    expect(shapes(await render(sceneNode(Icon, { name: "underline" })))).toEqual(shapes("<svg>" + [
      '<path d="M6 4v6a6 6 0 0 0 12 0V4">',
      '<line x1="4" y1="20" x2="20" y2="20">',
    ].join("") + "</svg>"));
  });

  it("preserves a supporting icon tone without adding text layout", async () => {
    const html = await render(sceneNode(Icon, { name: "settings", tone: "secondary" }));
    expect(html).toContain('data-ui-icon-prop-tone="secondary"');
    expect(shapes(html).length).toBeGreaterThan(0);
  });

  it("draws a notification bell before JavaScript runs", async () => {
    const html = await render(sceneNode(Icon, { name: "bell" }));
    expect(shapes(html).length).toBeGreaterThan(0);
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders the spinner's SVG track and arc without requiring an external asset", async () => {
    const html = await render(sceneNode(Spinner));
    expect(html).toMatch(/class="[^"]*\bring\b/);
    expect(html).toContain('aria-hidden="true"');
    expect(shapes(html)).toEqual(shapes("<svg>" + [
      '<circle class="track" cx="25" cy="25" r="20">',
      '<circle class="arc" cx="25" cy="25" r="20">',
    ].join("") + "</svg>"));
  });

  it("draws nothing for an unknown or empty name, and stays hidden from assistive technology", async () => {
    for (const name of ["not-an-icon", ""]) {
      const html = await render(sceneNode(Icon, { name }));
      expect(shapes(html)).toEqual([]);
      expect(html).toContain('aria-hidden="true"');
    }
  });
});
