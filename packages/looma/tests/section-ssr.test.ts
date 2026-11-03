import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiSection as Section } from "@looma-test/components";

describe("Section before upgrade", () => {
  it("names a native fieldset through its legend and keeps actions and description inside", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Section, { variant: "fieldset", heading: "Profile" }, {
      description: () => "How other people see you.", actions: () => sceneNode("button", "Reset"),
      default: () => sceneNode("input", { "aria-label": "Display name" }),
    }) }));
    const doc = new JSDOM(html).window.document;
    const frame = doc.querySelector("fieldset")!;
    expect(frame.querySelector(":scope > legend h2")?.textContent).toBe("Profile");
    expect(frame.querySelector(".description")?.textContent).toBe("How other people see you.");
    expect(frame.querySelector(".actions button")?.textContent).toBe("Reset");
    expect(frame.querySelector(".body input")?.getAttribute("aria-label")).toBe("Display name");
    expect(frame.querySelector("legend button")).toBeNull();
  });
  it.each(["plain", "card", "divided"] as const)("preserves the %s section's native heading", async variant => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Section, { variant, heading: "Profile" }, () => "Content") }));
    const doc = new JSDOM(html).window.document;
    expect(doc.querySelector("section h2")?.textContent).toBe("Profile");
    expect(doc.querySelector("fieldset")).toBeNull();
  });
});
