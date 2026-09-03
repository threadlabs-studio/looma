import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import "../src/index";

describe("@threadlabs/looma-layout primitives", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reflects ui-stack gap property to attribute and back", () => {
    const stack = document.createElement("ui-stack") as HTMLElement & { gap: string };

    stack.gap = "l";
    expect(stack.getAttribute("gap")).toBe("l");

    stack.setAttribute("gap", "s");
    expect(stack.gap).toBe("s");

    stack.gap = "";
    expect(stack.hasAttribute("gap")).toBe(false);
  });

  it("reflects ui-inline wrap property to attribute and back", () => {
    const inline = document.createElement("ui-inline") as HTMLElement & { wrap: string };

    inline.wrap = "nowrap";
    expect(inline.getAttribute("wrap")).toBe("nowrap");

    inline.setAttribute("wrap", "wrap");
    expect(inline.wrap).toBe("wrap");
  });

  it.each([
    ["ui-switcher", "threshold", "threshold", "lg"],
    ["ui-sidebar", "side", "side", "end"],
    ["ui-reel", "itemWidth", "item-width", "md"]
  ])("reflects the %s responsive attribute", (tag, property, attribute, value) => {
    const element = document.createElement(tag) as HTMLElement & Record<string, string>;

    element[property] = value;
    expect(element.getAttribute(attribute)).toBe(value);

    element[property] = "";
    expect(element.hasAttribute(attribute)).toBe(false);
  });

  it("makes reels keyboard-focusable scroll regions without overwriting consumer labels", () => {
    const reel = document.createElement("ui-reel");
    reel.setAttribute("aria-label", "Recent pages");
    document.body.append(reel);

    expect(reel.getAttribute("role")).toBe("region");
    expect(reel.getAttribute("tabindex")).toBe("0");
    expect(reel.getAttribute("aria-label")).toBe("Recent pages");
  });

  it("applies sensible separator accessibility defaults", () => {
    const separator = document.createElement("ui-separator") as HTMLElement & { orientation: string };
    document.body.append(separator);

    expect(separator.getAttribute("role")).toBe("separator");
    expect(separator.orientation).toBe("horizontal");
    expect(separator.getAttribute("aria-orientation")).toBe("horizontal");

    separator.orientation = "vertical";
    expect(separator.getAttribute("orientation")).toBe("vertical");
    expect(separator.getAttribute("aria-orientation")).toBe("vertical");

    separator.setAttribute("role", "presentation");
    expect(separator.hasAttribute("aria-orientation")).toBe(false);
  });
});

describe("@threadlabs/looma-layout css policy", () => {
  it("preserves component-layer display declarations through the light-DOM reset", () => {
    const css = readFileSync("src/layout.css", "utf8");

    expect(css).toContain("all: revert-layer;");
    expect(css).not.toMatch(/all:\s*revert;/);
  });

  it("keeps grid columns and centered content inside narrow containers", () => {
    const css = readFileSync("src/layout.css", "utf8");

    expect(css).toContain("minmax(min(var(--ui-grid-min), 100%), 1fr)");
    expect(css).toMatch(/ui-center\s*{[\s\S]*?inline-size:\s*100%;/);
    expect(css).toMatch(/ui-center\s*{[\s\S]*?max-inline-size:\s*var\(--ui-center-measure\);/);
  });

  it("provides intrinsic switcher, sidebar, and reel layout contracts", () => {
    const css = readFileSync("src/layout.css", "utf8");

    expect(css).toMatch(/ui-switcher\s*>\s*\*\s*{[\s\S]*?flex-basis:\s*calc\(/);
    expect(css).toMatch(/ui-sidebar\s*>\s*:\s*first-child/);
    expect(css).toMatch(/ui-sidebar\[side="end"\]\s*>\s*:\s*last-child/);
    expect(css).toMatch(/ui-reel\s*{[\s\S]*?overflow-x:\s*auto;/);
    expect(css).toMatch(/ui-reel\[snap="start"\]\s*>\s*\*/);
  });

  it("does not introduce external margins for spacing", () => {
    const css = readFileSync("src/layout.css", "utf8");
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
