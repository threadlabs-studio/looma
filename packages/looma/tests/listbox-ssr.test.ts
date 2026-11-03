import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneBody } from "./renderers/server-assertions";
import { describe, it } from "vitest";
import { UiListbox as Listbox } from "@looma-test/components";

describe("Listbox server render", () => {
  it("keeps authored options in a usable native control before upgrade", async () => {
    const html = await renderSceneBody(createHydratedScene({
      render: () => sceneNode(Listbox, { name: "region", multiple: true, required: true }, () => [
        sceneNode("option", { value: "north", selected: true }, "North"),
        sceneNode("option", { value: "south" }, "South"),
      ]),
    }));

    expect(html).toMatch(/<select\b[^>]*\bname="region"/);
    const select = new JSDOM(html).window.document.querySelector("select")!;
    expect(select.classList.contains("fallback")).toBe(true);
    expect([...select.selectedOptions].map(option => option.value)).toEqual(["north"]);
    expect(html).toContain("North");
    expect(html).toContain("South");
    expect(html).not.toContain("data-enhanced");
  });
});
