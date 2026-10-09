import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Button from "../vue/UiButton.js";

describe("CardButton before upgrade", () => {
  it("uses one native Button, its tone and arbitrary icon content", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant: "card", tone: "accent", "aria-controls": "details" }, {
      default: () => "Read changes", icon: () => h("span", "Custom icon and divider"),
    }) }));
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toMatch(/<button class="ui-button"/);
    expect(html).toMatch(/data-ui-button-state="[^"]*variant=card/);
    expect(html).toMatch(/data-ui-button-state="[^"]*tone=accent/);
    expect(html).toContain('aria-controls="details"');
    expect(html).toContain("Custom icon and divider");
    expect(html).toContain("chevron-right");
  });
  it("lets the caller replace the default action and keeps loading focusable", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant: "card", loading: true }, {
      default: () => "Read changes", action: () => h("span", "Custom action"),
    }) }));
    expect(html).toContain("Custom action");
    expect(html).not.toContain("chevron-right");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/<button[^>]*\sdisabled(?:[= >])/);
  });
  it("retains Button's disabled link contract", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant: "card", as: "a", href: "/guide", disabled: true }, () => "Guide") }));
    expect(html).toMatch(/<a\b/);
    expect(html).not.toMatch(/<a[^>]*\shref="\/guide"/);
    expect(html).toContain('aria-disabled="true"');
  });
});
