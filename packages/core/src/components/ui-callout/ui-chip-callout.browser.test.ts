import { afterEach, describe, expect, it } from "vitest";

import "../../styles.css";
import "../../../../tokens/src/tokens.css";

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("ui-chip and ui-callout visual contracts (real browser)", () => {
  it("keeps the tag edge, pill shape, semantic chip colors, and compact callout density", async () => {
    await Promise.all([
      customElements.whenDefined("ui-chip"),
      customElements.whenDefined("ui-badge"),
      customElements.whenDefined("ui-callout"),
    ]);
    document.body.innerHTML = `
      <style>ui-chip, ui-badge, ui-callout { padding: 0; border: 0; background: transparent; }</style>
      <ui-chip id="tag" appearance="tag" style="--ui-chip-surface: rgb(1, 2, 3); --ui-chip-text: rgb(4, 5, 6); --ui-chip-border: rgb(7, 8, 9)">Research</ui-chip>
      <ui-chip id="pill" appearance="pill">Research</ui-chip>
      <ui-badge id="badge" variant="subtle" tone="accent">Beta</ui-badge>
      <ui-callout tone="warning">Review this before publishing.</ui-callout>
    `;
    await flushStencil();

    const tag = document.querySelector<HTMLElement>("#tag")!;
    const pill = document.querySelector<HTMLElement>("#pill")!;
    const badge = document.querySelector<HTMLElement>("#badge")!;
    const callout = document.querySelector<HTMLElement>("ui-callout")!;
    const tagSurface = tag.shadowRoot?.querySelector<HTMLElement>(".chip__surface")!;
    const pillSurface = pill.shadowRoot?.querySelector<HTMLElement>(".chip__surface")!;
    const badgeSurface = badge.shadowRoot?.querySelector<HTMLElement>(".badge__surface")!;
    const calloutSurface = callout.shadowRoot?.querySelector<HTMLElement>(".callout__surface")!;

    await expect.poll(() => tag.dataset.appearance).toBe("tag");
    await expect.poll(() => callout.shadowRoot?.querySelector('[data-looma-icon="triangle-alert"]')).toBeTruthy();
    expect(getComputedStyle(tag).paddingLeft).toBe("0px");
    expect(getComputedStyle(tagSurface).clipPath).toContain("polygon");
    expect(getComputedStyle(tagSurface).fontSize).toBe("12px");
    expect(getComputedStyle(tagSurface).fontWeight).toBe("400");
    expect(getComputedStyle(tagSurface).paddingTop).toBe("2px");
    expect(getComputedStyle(tagSurface).paddingLeft).toBe("8px");
    expect(getComputedStyle(tagSurface).paddingRight).toBe("12px");
    expect(tag.getBoundingClientRect().height).toBeGreaterThanOrEqual(18);
    expect(tag.getBoundingClientRect().height).toBeLessThanOrEqual(19);
    expect(getComputedStyle(tagSurface).backgroundColor).toBe("rgb(1, 2, 3)");
    expect(getComputedStyle(tagSurface).color).toBe("rgb(4, 5, 6)");
    expect(getComputedStyle(tagSurface).borderTopWidth).toBe("0px");
    expect(getComputedStyle(tagSurface).borderBottomWidth).toBe("0px");
    expect(getComputedStyle(pillSurface).borderTopLeftRadius).toBe("999px");
    expect(getComputedStyle(badge).paddingLeft).toBe("0px");
    expect(getComputedStyle(badgeSurface).paddingTop).toBe("2px");
    expect(getComputedStyle(badgeSurface).paddingLeft).toBe("8px");
    expect(getComputedStyle(badgeSurface).paddingRight).toBe("8px");
    expect(getComputedStyle(callout).paddingLeft).toBe("0px");
    expect(getComputedStyle(calloutSurface).gridTemplateColumns).toContain("16px");
    expect(getComputedStyle(calloutSurface).gap).toBe("8px");
    expect(getComputedStyle(calloutSurface).paddingTop).toBe("8px");
    expect(getComputedStyle(calloutSurface).paddingLeft).toBe("12px");
    expect(getComputedStyle(calloutSurface).borderTopWidth).toBe("1px");
    expect(getComputedStyle(calloutSurface).borderInlineStartWidth).toBe("4px");
  });
});
