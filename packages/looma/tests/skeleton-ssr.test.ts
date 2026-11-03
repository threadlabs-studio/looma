import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiSkeleton as Skeleton } from "@looma-test/components";
import { UiStatusMessage as StatusMessage } from "@looma-test/components";

describe("Skeleton before upgrade", () => {
  it("renders an empty decorative placeholder without a focus target or announcement", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Skeleton) }));
    const element = new JSDOM(html).window.document.body.firstElementChild!;
    expect(element.tagName).toBe("SPAN");
    expect(element.getAttribute("aria-hidden")).toBe("true");
    expect(element.textContent).toBe("");
    expect(html).toMatch(/data-ui-skeleton-state="[^"]*\banimated\b/);
    expect(element.hasAttribute("tabindex")).toBe(false);
    expect(element.hasAttribute("role")).toBe(false);
    expect(element.hasAttribute("aria-live")).toBe(false);
  });

  it("ships dimensions and shape with the server markup", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Skeleton, {
      shape: "rectangle", width: "75%", height: "6rem", animated: true,
    }) }));
    const element = new JSDOM(html).window.document.body.firstElementChild as HTMLElement;
    expect(element.style.getPropertyValue("--ui-skeleton-width")).toBe("75%");
    expect(element.style.getPropertyValue("--ui-skeleton-height")).toBe("6rem");
    expect(html).toContain("rectangle");
    expect(html).toContain("animated");
  });

  it("lets a single status describe a region containing several placeholders", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => [
      sceneNode(StatusMessage, { kind: "loading" }, () => "Loading a profile"),
      sceneNode("section", { "aria-busy": "true", "aria-label": "Profile" }, [
        sceneNode(Skeleton, { shape: "circle" }), sceneNode(Skeleton), sceneNode(Skeleton),
      ]),
    ] }));
    const document = new JSDOM(html).window.document;
    expect(document.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(document.querySelector('section[aria-busy="true"]')?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
    expect(document.querySelector('[role="status"]')?.textContent).toContain("Loading a profile");
  });
});
