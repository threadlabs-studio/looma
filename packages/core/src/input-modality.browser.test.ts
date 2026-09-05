import { beforeEach, describe, expect, it } from "vitest";
import { initializeInputModality } from "./input-modality";

beforeEach(() => {
  document.documentElement.removeAttribute("data-ui-input-modality");
});

describe("shared input modality", () => {
  it("enables touch affordances only after an actual touch interaction", () => {
    initializeInputModality(document);

    document.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      pointerType: "mouse",
    }));
    expect(document.documentElement.hasAttribute("data-ui-input-modality")).toBe(false);

    document.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
      pointerType: "touch",
    }));
    expect(document.documentElement.getAttribute("data-ui-input-modality")).toBe("touch");
  });
});
