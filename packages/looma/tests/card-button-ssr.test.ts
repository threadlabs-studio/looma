import { JSDOM } from "jsdom";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { UiButton as Button } from "@threadlabs/looma";

describe("CardButton before upgrade", () => {
  it("uses one native Button, its tone and arbitrary icon content", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant: "card", tone: "accent", "aria-controls": "details" }, {
      default: () => "Read changes", icon: () => h("span", "Custom icon and divider"),
    }) }));
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toMatch(/<button class="ui-button"/);
    expect(html).toContain('data-appearance="card"');
    expect(html).toContain('data-tone="accent"');
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
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant: "card", href: "/guide", disabled: true }, () => "Guide") }));
    expect(html).toMatch(/<a\b/);
    expect(html).not.toMatch(/<a[^>]*\shref="\/guide"/);
    expect(html).toContain('aria-disabled="true"');
  });
});


describe("Button semantic presets before upgrade", () => {
  it("keeps interaction settings optional and preserves preset, link and loading semantics", async () => {
    const defaults = await renderToString(createSSRApp({ render: () => h(Button, { preset: "standard" }, () => "Choose project") }));
    expect(defaults).not.toMatch(/data-interaction-(?:tone|appearance)=/);
    const inherited = await renderToString(createSSRApp({ render: () => h(Button, { preset: "standard", interactionTone: "accent" }, () => "Choose project") }));
    expect(inherited).toContain('data-interaction-appearance="solid"');
    expect(inherited).toContain('data-tone="neutral"');
    const configured = await renderToString(createSSRApp({ render: () => h(Button, { preset: "standard", interactionTone: "accent", interactionVariant: "ghost", href: "/projects", loading: true }, () => "Choose project") }));
    expect(configured).toMatch(/<a\b/);
    expect(configured).toContain('data-appearance="solid"');
    expect(configured).toContain('data-tone="neutral"');
    expect(configured).toContain('data-interaction-tone="accent"');
    expect(configured).toContain('data-interaction-appearance="ghost"');
    expect(configured).toContain('aria-disabled="true"');
    expect(configured).not.toMatch(/<a[^>]*\shref=/);
  });

  it.each([
    ["primary", "solid", "accent"],
    ["standard", "solid", "neutral"],
    ["quiet", "ghost", "neutral"],
    ["destructive", "solid", "danger"],
  ])("resolves %s into independent appearance and tone", async (preset, appearance, tone) => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { preset, variant: "outline", tone: "info" }, () => "Send Fellowship memo") }));
    expect(html).toContain(`data-appearance="${appearance}"`);
    expect(html).toContain(`data-tone="${tone}"`);
    expect(html).not.toContain("card-content");
  });
  it("retains explicit appearance and tone when no preset is selected", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant: "outline", tone: "success" }, () => "Approve Sam's leave") }));
    expect(html).toContain('data-appearance="outline"');
    expect(html).toContain('data-tone="success"');
  });
});

describe("Button link inference before upgrade", () => {
  it.each(["outline", "card"])("uses href alone to select the %s root", async (variant) => {
    for (const href of ["/guide", ""]) {
      const html = await renderToString(createSSRApp({ render: () => h(Button, { variant, href, target: "_blank", rel: "noreferrer" }, () => "Guide") }));
      expect(html).toMatch(/<a\b/);
      expect(new JSDOM(html).window.document.querySelector("a")?.getAttribute("href")).toBe(href);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noreferrer"');
      expect(html).not.toMatch(/<a[^>]*\stype=/);
    }
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant, type: "submit" }, () => "Send") }));
    expect(html).toMatch(/<button\b/);
    expect(html).toContain('type="submit"');
  });

  it.each(["outline", "card"])("keeps a loading %s link focusable without navigation", async (variant) => {
    const html = await renderToString(createSSRApp({ render: () => h(Button, { variant, href: "/guide", loading: true }, () => "Guide") }));
    expect(html).toMatch(/<a\b/);
    expect(html).not.toMatch(/<a[^>]*\shref=/);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('tabindex="0"');
  });
});
