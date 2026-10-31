import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { UiCard as Card } from "@threadlabs/looma";
import { UiButton as Button } from "@threadlabs/looma";
import { UiActionBar as ActionBar } from "@threadlabs/looma";
import { UiRadio as Radio } from "@threadlabs/looma";
import { UiSwitch as Switch } from "@threadlabs/looma";
import { UiCheckbox as Checkbox } from "@threadlabs/looma";

describe("material surfaces before upgrade", () => {
  it.each(["standard", "expressive"])("retains semantic content and controls with %s treatment", async treatment => {
    const html = await renderToString(createSSRApp({ render: () => h(Card, {
      as: "article", treatment, variant: "elevated", "aria-label": "Briefing",
    }, () => [h("h2", "A readable plan"), h("p", "Content stays on its own plane."), h(Button, { preset: "primary" }, () => "Send")]) }));
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
    const html = await renderToString(createSSRApp({ render: () => h(ActionBar, { dir }, {
      secondary: () => h(Button, { preset: "standard" }, () => "Keep draft"),
      primary: () => h(Button, { preset: "primary" }, () => "Send briefing"),
    }) }));
    expect(html).toContain(`dir="${dir}"`);
    expect(html).toMatch(/class="secondary"[\s\S]*Keep draft/);
    expect(html).toMatch(/class="primary"[\s\S]*Send briefing/);
    expect(html.indexOf("Keep draft")).toBeLessThan(html.indexOf("Send briefing"));
    expect(html.match(/<button\b/g)).toHaveLength(2);
  });
});


describe("material choices preserve native inputs before upgrade", () => {
  it.each([["Radio", Radio, "radio"], ["Switch", Switch, "checkbox"], ["Checkbox", Checkbox, "checkbox"]] as const)("retains %s semantics, required and disabled state", async (_name, Component, type) => {
    for (const disabled of [false, true]) {
      const html = await renderToString(createSSRApp({ render: () => h(Component, { name: "delivery", value: "digest", required: true, checked: true, disabled }, () => "Email digest") }));
      expect(html).toMatch(new RegExp(`<input[^>]*type="${type}"`));
      expect(html).toMatch(/<input[^>]*name="delivery"/);
      expect(html).toMatch(/<input[^>]*value="digest"/);
      expect(html).toMatch(/<input[^>]*required/);
      expect(/<input[^>]*\sdisabled(?:[\s=>])/.test(html)).toBe(disabled);
      expect(html).toContain("Email digest");
    }
  });
});
