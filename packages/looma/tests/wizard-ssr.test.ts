import { JSDOM } from "jsdom";
import { describe, it } from "vitest";
import { expect } from "./renderers/test-context";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { componentRoot } from "./renderers/selectors";
import { renderSceneBody } from "./renderers/server-assertions";
import { UiWizard as Wizard, UiButton as Button } from "@looma-test/components";

const steps = [
  { value: "start", label: "Start", complete: true, href: "#start" },
  { value: "details", label: "Details", href: "#details" },
  { value: "review", label: "Review", disabled: true, href: "#review" },
];
const render = (props = {}) => renderSceneBody(createHydratedScene({ render: () => sceneNode(Wizard, { value: "details", steps, ...props }, {
  default: () => sceneNode("h2", "Current stage content"),
  secondary: () => sceneNode(Button, {}, "Back"),
  primary: () => sceneNode(Button, { preset: "primary" }, "Continue"),
}) }));

describe("Wizard before upgrade", () => {
  it("renders ordered named navigation, current semantics, completed status and disabled future destinations", async () => {
    const document = new JSDOM(await render({ label: "Setup stages" })).window.document;
    expect(document.querySelector('nav[aria-label="Setup stages"] ol')?.children).toHaveLength(3);
    expect(document.querySelector('a[aria-current="step"]')?.getAttribute("href")).toBe("#details");
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(document.querySelector('[data-wizard-value="start"]')?.textContent).toMatch(/Completed:\s*Start/);
    expect(document.querySelector('[data-wizard-value="start"] svg')).not.toBeNull();
    expect(document.querySelector('[data-wizard-value="details"]')?.textContent).toContain("2");
    expect(document.querySelector('[data-wizard-value="review"]')?.getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector('[data-wizard-value="review"]')?.hasAttribute("href")).toBe(false);
    expect(document.querySelector("h2")?.textContent).toBe("Current stage content");
    const buttons = [...document.querySelectorAll("button")];
    expect(buttons.map(button => button.textContent?.trim())).toEqual(["Back", "Continue"]);
    expect(buttons[0]?.closest(componentRoot("ui-action-bar"))).not.toBeNull();
  });

  it("removes every destination when disabled while retaining the current stage", async () => {
    const document = new JSDOM(await render({ disabled: true })).window.document;
    expect(document.querySelectorAll("nav a[href]")).toHaveLength(0);
    expect(document.querySelectorAll('nav [aria-disabled="true"]')).toHaveLength(3);
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain("Details");
    expect(document.querySelectorAll("button:disabled")).toHaveLength(0);
  });
});
