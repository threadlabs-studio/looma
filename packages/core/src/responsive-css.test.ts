import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readComponentCss = (component: string) =>
  readFileSync(`src/components/${component}/${component}.css`, "utf8");

describe("responsive core component CSS", () => {
  it("keeps dialogs inside both viewport axes", () => {
    const css = readComponentCss("ui-dialog");

    expect(css).toContain("calc(100% - (var(--ui-dialog-viewport-gap) * 2))");
    expect(css).toContain("calc(100dvh - (var(--ui-dialog-viewport-gap) * 2))");
  });

  it("makes mobile search a dynamic-viewport surface", () => {
    const css = readComponentCss("ui-search-shell");

    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?block-size:\s*100dvh;/);
    expect(css).toMatch(/@media \(max-width: 767px\)[\s\S]*?max-block-size:\s*none;/);
  });

  it("keeps fixed controls clear of safe-area insets", () => {
    expect(readComponentCss("ui-top-bar")).toContain("env(safe-area-inset-top)");
    expect(readComponentCss("ui-toast-region")).toContain("env(safe-area-inset-top)");
    expect(readComponentCss("ui-floating-action-button")).toContain("env(safe-area-inset-right)");
  });

  it("bounds overlay widths and lets horizontal tabs scroll", () => {
    expect(readComponentCss("ui-menu")).toContain("calc(100vw - (var(--ui-menu-viewport-gap) * 2))");
    expect(readComponentCss("ui-popover")).toContain("calc(100vw - (var(--ui-popover-viewport-gap) * 2))");
    expect(readComponentCss("ui-tabs")).toContain("overflow-x: auto;");
  });
});
