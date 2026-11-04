import { JSDOM } from "jsdom";
import { describe, it } from "vitest";
import { expect } from "./renderers/test-context";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneBody } from "./renderers/server-assertions";
import { UiSegmentedControl as SegmentedControl } from "@looma-test/components";

const items = [{ value: "active", label: "Active" }, { value: "archived", label: "Archived", disabled: true }];
const render = (props = {}) => renderSceneBody(createHydratedScene({ render: () => sceneNode("form", { id: "filters" }, [
  sceneNode(SegmentedControl, { name: "status", label: "Status", value: "active", items, required: true, ...props }),
]) }));

describe("Segmented Control before upgrade", () => {
  it("renders named native radios with the selected value, required state and unavailable choices", async () => {
    const document = new JSDOM(await render()).window.document;
    expect(document.querySelector('fieldset[role="radiogroup"] legend')?.textContent).toBe("Status");
    const radios = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    expect(radios.map(input => [input.name, input.value, input.checked, input.required, input.disabled])).toEqual([
      ["status", "active", true, true, false], ["status", "archived", false, true, true],
    ]);
    expect(radios.map(input => input.labels?.[0]?.textContent?.trim())).toEqual(["Active", "Archived"]);
    expect(document.querySelectorAll("button")).toHaveLength(0);
  });
  it("keeps an empty selection empty and supports native group disabling and a hidden legend", async () => {
    const document = new JSDOM(await render({ value: "", disabled: true, labelVisibility: "sr-only", invalid: true })).window.document;
    expect(document.querySelectorAll("input:checked")).toHaveLength(0);
    expect(document.querySelector("fieldset")?.disabled).toBe(true);
    expect(document.querySelector("fieldset")?.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("legend")?.classList.contains("sr-only")).toBe(true);
  });
});
