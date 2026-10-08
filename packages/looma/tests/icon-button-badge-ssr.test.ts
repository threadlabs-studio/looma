import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import IconButton from "../vue/UiIconButton.js";
import Badge from "../vue/UiBadge.js";

const render = (node: ReturnType<typeof h>) => renderToString(createSSRApp({ render: () => node }));

describe("Icon Button and circular Badge before upgrade", () => {
  it("preserves a consumer-owned native pressed state and accessible name", async () => {
    const html = await render(h(IconButton, { label: "Notifications", variant: "outline", tone: "accent", "aria-pressed": true }));
    expect(html).toMatch(/<button\b/);
    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-tone="accent"');
    expect(html).not.toContain('disabled=""');
  });

  it("leaves the existing variant defaults intact when tone is omitted", async () => {
    const html = await render(h(IconButton, { label: "Add", variant: "solid" }));
    expect(html).toContain('data-variant="solid"');
    expect(html).not.toContain('data-tone=');
    expect(html).not.toContain('aria-pressed=');
  });

  it("keeps the pressed state and accessible name while loading", async () => {
    const html = await render(h(IconButton, { label: "Notifications", tone: "accent", variant: "outline", loading: true, "aria-pressed": true }));
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/<button[^>]*\sdisabled(?:[= >])/);
  });

  it("renders the circular glyph and its name without hiding the visible content", async () => {
    const html = await render(h(Badge, { shape: "circle", size: "xs", "aria-label": "Category A" }, () => "A"));
    expect(html).toContain('data-shape="circle"');
    expect(html).toContain('data-size="xs"');
    expect(html).toContain('aria-label="Category A"');
    expect(html).toMatch(/class="label"[^>]*>.*A/s);
    expect(await render(h(Badge, null, () => "Ready"))).toMatch(/data-ui-badge-state="[^"]*shape=pill/);
  });
});
