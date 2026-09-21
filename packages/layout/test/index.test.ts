import { describe, expect, it } from "vitest";

import { records, styles } from "../src/declarative/registry.js";

describe("@threadlabs/looma-layout canonical declarative graph", () => {
  it("contains every maintained layout definition without registering custom elements", () => {
    expect(records.map(({ tag }) => tag)).toEqual([
      "ui-center",
      "ui-cluster",
      "ui-grid",
      "ui-reel",
      "ui-separator",
      "ui-sidebar",
      "ui-stack",
      "ui-switcher",
    ]);
    expect(customElements.get("ui-stack")).toBeUndefined();
    expect(customElements.get("ui-sidebar")).toBeUndefined();
  });

  it("ships an always-wrapping cluster without wrap or justify props", () => {
    const cluster = records.find(({ tag }) => tag === "ui-cluster");

    expect(cluster?.source).not.toMatch(/<prop name="(?:wrap|justify)"/);
    expect(styles).toMatch(/data-component-root~="ui-cluster"\][^{]*\{[^}]*flex-wrap:\s*wrap;/);
    expect(styles).not.toContain('[data-component-root~="ui-cluster"][data-wrap');
    expect(styles).not.toContain('[data-component-root~="ui-cluster"][data-justify');
  });

  it("ships sidebar behavior through its declarative controller", () => {
    const sidebar = records.find(({ tag }) => tag === "ui-sidebar");

    expect(sidebar?.source).toContain('<event name="resize"');
    expect(sidebar?.controller?.default).toBeTypeOf("function");
    expect(styles).toContain('[data-component-root~="ui-sidebar"] > [data-ui-sidebar-resizer]');
  });
});

// jsdom cannot resolve cascade layers or intrinsic layout, so these assert the shipped CSS contract directly.
describe("@threadlabs/looma-layout css policy", () => {
  it("preserves component-layer display declarations through the light-DOM reset", () => {
    const css = styles;

    expect(css).toContain("all: revert-layer;");
    expect(css).not.toMatch(/all:\s*revert;/);
  });

  it("keeps grid columns and centered content inside narrow containers", () => {
    const css = styles;

    expect(css).toContain("minmax(min(var(--ui-grid-min), 100%), 1fr)");
    expect(css).toMatch(/data-component-root~="ui-center"\][^{]*{[\s\S]*?inline-size:\s*100%;/);
    expect(css).toMatch(/data-component-root~="ui-center"\][^{]*{[\s\S]*?max-inline-size:\s*var\(--ui-center-measure\);/);
  });

  it("provides intrinsic switcher, sidebar, and reel layout contracts", () => {
    const css = styles;

    expect(css).toMatch(/data-component-root~="ui-switcher"\]\s*>\s*\*\s*{[\s\S]*?flex-basis:\s*calc\(/);
    expect(css).toMatch(/data-component-root~="ui-sidebar"\]\s*>\s*:first-child/);
    expect(css).toMatch(/data-component-root~="ui-sidebar"\]\[data-side="end"\]\s*>\s*:last-child/);
    expect(css).toMatch(/data-component-root~="ui-reel"\][^{]*{[\s\S]*?overflow-x:\s*auto;/);
    expect(css).toMatch(/data-component-root~="ui-reel"\]\[data-snap="start"\]\s*>\s*\*/);
  });

  it("maps every declared cluster alignment and gap value", () => {
    const css = styles;

    for (const component of ["ui-cluster"]) {
      for (const gap of ["xs", "s", "m", "l", "xl"]) {
        expect(css).toContain(`[data-component-root~="${component}"][data-gap="${gap}"]`);
      }
      for (const align of ["start", "center", "end", "stretch"]) {
        expect(css).toContain(`[data-component-root~="${component}"][data-align="${align}"]`);
      }
    }
  });

  it("does not introduce external margins for spacing", () => {
    const css = styles;
    const marginDeclarations = Array.from(css.matchAll(/\bmargin\s*:\s*([^;]+);/g)).map((match) =>
      match[1].trim().toLowerCase()
    );
    const invalidMarginShorthand = marginDeclarations.filter(
      (value) => value !== "0" && value !== "0px" && value !== "0rem"
    );
    expect(invalidMarginShorthand).toEqual([]);

    const marginInlineDeclarations = Array.from(
      css.matchAll(/\bmargin-inline\s*:\s*([^;]+);/g)
    ).map((match) => match[1].trim().toLowerCase());
    const invalidMarginInline = marginInlineDeclarations.filter((value) => value !== "auto");
    expect(invalidMarginInline).toEqual([]);

    const disallowedEdgeMargins = css.match(
      /\bmargin-(top|right|bottom|left|block|block-start|block-end|inline-start|inline-end)\s*:\s*[^;]+;/g
    );
    expect(disallowedEdgeMargins ?? []).toEqual([]);
  });
});
