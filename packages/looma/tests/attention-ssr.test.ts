import { JSDOM } from "jsdom";
import { expect } from "./renderers/test-context";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiListItem as ListItem } from "@looma-test/components";
import { UiBadge as Badge } from "@looma-test/components";

describe("Attention presentation before upgrade", () => {
  it("highlights several rows without claiming a current or selected destination", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => [
      sceneNode(ListItem, { highlighted: true }, () => "New message"),
      sceneNode(ListItem, { highlighted: true }, () => "Another new message"),
    ] }));
    expect(html.match(/data-ui-list-item-state="[^"]*highlighted/g)).toHaveLength(2);
    expect(html).not.toContain('aria-current="true"');
    expect(html).not.toContain("aria-selected");
  });

  it("can wrap explanatory rows without changing the default one-line contract", async () => {
    const wrapped = await renderSceneToString(createHydratedScene({ render: () =>
      sceneNode(ListItem, { wrap: true }, () => "A person asked you to review a long document title") }));
    expect(wrapped).toMatch(/data-ui-list-item-state="[^"]*\bwrap\b/);
    const ordinary = await renderSceneToString(createHydratedScene({ render: () => sceneNode(ListItem, {}, () => "Document") }));
    expect(ordinary).not.toMatch(/data-ui-list-item-state="[^"]*\bwrap\b/);
  });

  it("renders a decorative square without introducing an action or live announcement", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () =>
      sceneNode(Badge, { shape: "square", tone: "success", "aria-hidden": "true" }, () => "P") }));
    expect(html).toContain("shape=square");
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain("tabindex");
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("button");
  });

  it("preserves a dot's state label in server-rendered markup", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () =>
      sceneNode(Badge, { shape: "dot", tone: "warning" }, () => "Waiting for your reply") }));
    expect(html).toContain("Waiting for your reply");
    expect(new JSDOM(html).window.document.querySelector(".label")?.textContent).toBe("Waiting for your reply");
    expect(html).toContain("shape=dot");
    expect(html).not.toContain("role=\"status\"");
  });
});
