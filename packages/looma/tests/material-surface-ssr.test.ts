import { JSDOM } from "jsdom";
import { expect } from "./renderers/test-context";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiCard as Card } from "@looma-test/components";
import { UiButton as Button } from "@looma-test/components";
import { UiActionBar as ActionBar } from "@looma-test/components";
import { UiRadio as Radio } from "@looma-test/components";
import { UiSwitch as Switch } from "@looma-test/components";
import { UiCheckbox as Checkbox } from "@looma-test/components";

describe("material surfaces before upgrade", () => {
  it.each(["standard", "expressive"])("retains semantic content and controls with %s treatment", async treatment => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Card, {
      as: "article", treatment, variant: "elevated", "aria-label": "Briefing",
    }, () => [sceneNode("h2", "A readable plan"), sceneNode("p", "Content stays on its own plane."), sceneNode(Button, { preset: "primary" }, () => "Send")]) }));
    expect(html).toMatch(/<article\b/);
    expect(html).toContain(`treatment="${treatment}"`);
    expect(html).toContain('aria-label="Briefing"');
    expect(html).toContain("A readable plan");
    expect(html).toContain("Content stays on its own plane.");
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('data-appearance="solid"');
    expect(html).toContain('data-tone="accent"');
  });
});


describe("material action composition before upgrade", () => {
  it.each(["ltr", "rtl"])("keeps native ActionBar roles and reading order in %s", async dir => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(ActionBar, { dir }, {
      secondary: () => sceneNode(Button, { preset: "standard" }, () => "Keep draft"),
      primary: () => sceneNode(Button, { preset: "primary" }, () => "Send briefing"),
    }) }));
    expect(html).toContain(`dir="${dir}"`);
    expect(new JSDOM(html).window.document.querySelector(".secondary")?.textContent?.trim()).toBe("Keep draft");
    expect(new JSDOM(html).window.document.querySelector(".primary")?.textContent?.trim()).toBe("Send briefing");
    expect(html.indexOf("Keep draft")).toBeLessThan(html.indexOf("Send briefing"));
    expect(html.match(/<button\b/g)).toHaveLength(2);
  });
});


describe("material choices preserve native inputs before upgrade", () => {
  it.each([["Radio", Radio, "radio"], ["Switch", Switch, "checkbox"], ["Checkbox", Checkbox, "checkbox"]] as const)("retains %s semantics, required and disabled state", async (_name, Component, type) => {
    for (const disabled of [false, true]) {
      const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Component, { name: "delivery", value: "digest", required: true, checked: true, disabled }, () => "Email digest") }));
      const dom = new JSDOM(html);
      const inputs = dom.window.document.querySelectorAll("input");
      expect(inputs).toHaveLength(1);
      expect(inputs[0]!.type).toBe(type);
      expect(inputs[0]!.name).toBe("delivery");
      expect(inputs[0]!.getAttribute("value")).toBe("digest");
      expect(inputs[0]!.value).toBe("digest");
      expect(inputs[0]!.required).toBe(true);
      expect(inputs[0]!.disabled).toBe(disabled);
      dom.window.close();
      expect(html).toContain("Email digest");
    }
  });
});
