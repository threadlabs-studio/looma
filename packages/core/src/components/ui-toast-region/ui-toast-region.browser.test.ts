import { beforeEach, describe, expect, it } from "vitest";

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("ui-toast-region viewport surface (real browser)", () => {
  it("renders notifications in the top layer outside clipping ancestors", async () => {
    document.body.innerHTML = `
      <div style="overflow:hidden;max-height:20px">
        <ui-toast-region>
          <div data-ui-toast>Saved draft</div>
        </ui-toast-region>
      </div>
    `;
    await flushStencil();

    const region = document.querySelector<HTMLElement>("ui-toast-region")!;
    const clippingParent = region.parentElement!;
    expect(region.getAttribute("popover")).toBe("manual");
    expect(region.dataset.uiPositioning).toBe("viewport");
    expect(region.matches(":popover-open")).toBe(true);
    expect(getComputedStyle(region).position).toBe("fixed");
    expect(region.getBoundingClientRect().bottom)
      .toBeGreaterThan(clippingParent.getBoundingClientRect().bottom);
  });
});
