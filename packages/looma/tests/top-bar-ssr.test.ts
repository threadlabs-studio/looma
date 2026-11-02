import { expect } from "./renderers/test-context";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { JSDOM } from "jsdom";
import { UiTopBar as TopBar } from "@looma-test/components";

describe("TopBar before upgrade", () => {
  const render = (titleFor?: string) => renderSceneToString(createHydratedScene({ render: () => sceneNode(TopBar, { titleFor }, {
    leading: () => sceneNode("button", "Back"),
    default: () => "Document title",
    actions: () => sceneNode("button", "Save"),
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
    expect(Array.from(document.querySelectorAll("button"), button => button.textContent)).toEqual(["Back", "Save"]);
  });
});
