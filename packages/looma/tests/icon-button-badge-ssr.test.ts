import { JSDOM } from "jsdom";
import { expect } from "./renderers/test-context";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneBody } from "./renderers/server-assertions";
import { describe, it } from "vitest";
import { UiIconButton as IconButton } from "@looma-test/components";
import { UiBadge as Badge } from "@looma-test/components";
import { UiContainer as Container } from "@looma-test/components";

const render = (node: ReturnType<typeof sceneNode>) => renderSceneBody(createHydratedScene({ render: () => node }));

describe("Icon Button and circular Badge before upgrade", () => {
  it("exposes opt-in Container fill without changing its default", async () => {
    expect(await render(sceneNode(Container, { fill: true }, () => "Read"))).toMatch(/data-ui-container-state="[^"]*fill/);
    expect(await render(sceneNode(Container, null, () => "Read"))).not.toMatch(/data-ui-container-state="[^"]*fill/);
  });
  it("renders the opt-in rounded bar guide before upgrade", async () => {
    const html = await render(sceneNode(IconButton, { label: "Toggle panel", anticipatory: true, guide: "bar", tone: "neutral" }));
    expect(html).toContain('aria-label="Toggle panel"');
    expect(html).toMatch(/data-ui-icon-button-state="[^"]*guide=bar/);
    expect(html).toMatch(/data-ui-icon-button-state="[^"]*anticipatory/);
    expect(await render(sceneNode(IconButton, { label: "Add", anticipatory: true }))).toMatch(/data-ui-icon-button-state="[^"]*guide=dot/);
  });

  it("preserves a consumer-owned native pressed state and accessible name", async () => {
    const html = await render(sceneNode(IconButton, { label: "Notifications", variant: "outline", tone: "accent", "aria-pressed": true }));
    expect(html).toMatch(/<button\b/);
    expect(html).toContain('aria-label="Notifications"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-ui-icon-button-prop-tone="accent"');
    expect(html).not.toContain('disabled=""');
  });

  it("leaves the existing variant defaults intact when tone is omitted", async () => {
    const html = await render(sceneNode(IconButton, { label: "Add", variant: "solid" }));
    expect(html).toContain('data-ui-icon-button-prop-variant="solid"');
    expect(html).not.toContain('data-ui-icon-button-prop-tone=');
    expect(html).not.toContain('aria-pressed=');
  });

  it("keeps the pressed state and accessible name while loading", async () => {
    const html = await render(sceneNode(IconButton, { label: "Notifications", tone: "accent", variant: "outline", loading: true, "aria-pressed": true }));
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/<button[^>]*\sdisabled(?:[= >])/);
  });

  it("renders an opt-in overlay count without changing the default badge", async () => {
    const html = await render(sceneNode(Badge, { variant: "overlay", shape: "circle", size: "sm", "aria-hidden": true }, () => "12"));
    expect(html).toMatch(/data-ui-badge-state="[^"]*variant=overlay/);
    expect(html).toContain('aria-hidden="true"');
    expect(new JSDOM(html).window.document.querySelector(".label")?.textContent).toBe("12");
    expect(await render(sceneNode(Badge, null, () => "Ready"))).toMatch(/data-ui-badge-state="[^"]*variant=subtle/);
  });

  it("renders the circular glyph and its name without hiding the visible content", async () => {
    const html = await render(sceneNode(Badge, { shape: "circle", size: "xs", "aria-label": "Category A" }, () => "A"));
    expect(html).toContain('data-ui-badge-prop-shape="circle"');
    expect(html).toContain('data-ui-badge-prop-size="xs"');
    expect(html).toContain('aria-label="Category A"');
    expect(new JSDOM(html).window.document.querySelector(".label")?.textContent).toBe("A");
    expect(await render(sceneNode(Badge, null, () => "Ready"))).toMatch(/data-ui-badge-state="[^"]*shape=pill/);
  });
});


describe("Icon Button shared action semantics", () => {
  it.each([['primary', 'solid', 'accent'], ['standard', 'solid', 'neutral'], ['quiet', 'ghost', 'neutral'], ['destructive', 'solid', 'danger']])('resolves the %s preset before upgrade', async (preset, appearance, tone) => {
    const html = await render(sceneNode(IconButton, { preset, label: 'Fellowship action' }));
    expect(html).toContain(`data-appearance="${appearance}"`);
    expect(html).toContain(`data-tone="${tone}"`);
  });
});
