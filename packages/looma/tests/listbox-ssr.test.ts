import { expect } from "./renderers/test-context";
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

    expect(html).toContain('class="fallback"');
    expect(html).toMatch(/<select\b[^>]*\bname="region"/);
    expect(html).toContain('value="north" selected');
    expect(html).toContain("North");
    expect(html).toContain("South");
    expect(html).not.toContain("data-enhanced");
  });
});
