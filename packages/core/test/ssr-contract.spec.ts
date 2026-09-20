// @vitest-environment node

import { describe, expect, it } from "vitest";

describe("@threadlabs/looma-core SSR entry contract", () => {
  it("imports public ESM entry points without browser globals", async () => {
    expect(typeof globalThis.window).toBe("undefined");
    expect(typeof globalThis.document).toBe("undefined");
    expect(typeof globalThis.customElements).toBe("undefined");

    const core = await import("../dist/index.js");
    const loader = await import("../dist/loader.js");
    const declarative = await import("../dist/declarative.js");

    expect(typeof core.openOverlay).toBe("function");
    expect(typeof loader.defineCustomElements).toBe("function");
    expect(typeof declarative.attachLoomaComponent).toBe("function");
  });
});
