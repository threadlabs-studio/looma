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
    await Promise.all([customElements.whenDefined("ui-chip"), customElements.whenDefined("ui-callout")]);
    document.body.innerHTML = `
      <ui-chip id="tag" appearance="tag" style="--ui-chip-surface: rgb(1, 2, 3); --ui-chip-text: rgb(4, 5, 6); --ui-chip-border: rgb(7, 8, 9)">Research</ui-chip>
      <ui-chip id="pill" appearance="pill">Research</ui-chip>
      <ui-callout tone="warning">Review this before publishing.</ui-callout>
    `;
    await flushStencil();

    const tag = document.querySelector<HTMLElement>("#tag")!;
    const pill = document.querySelector<HTMLElement>("#pill")!;
    const callout = document.querySelector<HTMLElement>("ui-callout")!;

    await expect.poll(() => tag.dataset.appearance).toBe("tag");
    await expect.poll(() => callout.shadowRoot?.querySelector('[data-looma-icon="triangle-alert"]')).toBeTruthy();
    expect(getComputedStyle(tag).clipPath).toContain("polygon");
    expect(getComputedStyle(tag).fontSize).toBe("12px");
    expect(getComputedStyle(tag).fontWeight).toBe("400");
    expect(getComputedStyle(tag).paddingTop).toBe("2px");
    expect(getComputedStyle(tag).paddingLeft).toBe("4px");
    expect(tag.getBoundingClientRect().height).toBeGreaterThanOrEqual(20);
    expect(tag.getBoundingClientRect().height).toBeLessThanOrEqual(21);
    expect(getComputedStyle(tag).backgroundColor).toBe("rgb(1, 2, 3)");
    expect(getComputedStyle(tag).color).toBe("rgb(4, 5, 6)");
    expect(getComputedStyle(tag).borderColor).toBe("rgb(7, 8, 9)");
    expect(getComputedStyle(pill).borderTopLeftRadius).toBe("999px");
    expect(getComputedStyle(callout).gridTemplateColumns).toContain("16px");
    expect(getComputedStyle(callout).gap).toBe("8px");
    expect(getComputedStyle(callout).paddingTop).toBe("8px");
    expect(getComputedStyle(callout).paddingLeft).toBe("12px");
    expect(getComputedStyle(callout).borderTopWidth).toBe("1px");
    expect(getComputedStyle(callout).borderInlineStartWidth).toBe("4px");
  });
});
