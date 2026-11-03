import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiMeter as Meter } from "@looma-test/components";

// A distribution is a categorical image, not a reading of one progress value.
describe("Meter distribution server render", () => {
  it("renders proportional parts and their complete description before JavaScript", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Meter, {
      variant: "distribution", label: "Requests by outcome", valueText: "2 waiting, 5 accepted, 2 declined",
      parts: [{ value: 2, color: "#789168" }, { value: 5, color: "#b97731" }, { value: 2, color: "#533b29" }],
    }) }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Requests by outcome: 2 waiting, 5 accepted, 2 declined"');
    expect(html).not.toContain("aria-valuenow");
    const parts = new JSDOM(html).window.document.querySelectorAll<HTMLElement>(".part");
    expect(Array.from(parts, part => part.style.flexGrow)).toEqual(["2", "5", "2"]);
    expect(parts[1]!.style.backgroundColor).toBe("rgb(185, 119, 49)");
  });
  it("keeps empty distributions empty and omits nonpositive parts", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Meter, {
      variant: "distribution", label: "No requests", parts: [{ value: 0, color: "red" }, { value: -1, color: "blue" }],
    }) }));
    expect(html).toContain('role="img"');
    expect(html).not.toContain('class="part"');
    expect(html).not.toContain('class="fill"');
  });
});
