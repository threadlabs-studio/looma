import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

import "../src/index";

describe("@looma/layout primitives", () => {
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

describe("@looma/layout css policy", () => {
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
