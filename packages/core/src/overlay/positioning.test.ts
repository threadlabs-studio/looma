import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clampRectToViewport,
  createProximityCoordinator,
  getVisualViewportRect,
} from "./positioning";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("shared overlay geometry", () => {
  it("normalizes the visual viewport and clamps floating content", () => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        width: 320,
        height: 420,
        offsetLeft: 8,
        offsetTop: 96,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as VisualViewport,
    });

    const viewport = getVisualViewportRect(window);
    expect(viewport).toEqual({
      left: 8,
      top: 96,
      right: 328,
      bottom: 516,
      width: 320,
      height: 420,
    });
    expect(clampRectToViewport(
      { left: 300, top: 500, right: 420, bottom: 600, width: 120, height: 100 },
      viewport,
      12,
    )).toEqual({ x: -104, y: -96 });
  });

  it("marks every nearby affordance from one scoped pointer listener", async () => {
    const scope = document.createElement("div");
    const first = document.createElement("button");
    const second = document.createElement("button");
    const far = document.createElement("button");
    for (const anchor of [first, second, far]) {
      anchor.setAttribute("data-ui-affordance", "");
      scope.append(anchor);
    }
    document.body.append(scope);

    vi.spyOn(first, "getBoundingClientRect").mockReturnValue(new DOMRect(40, 40, 20, 20));
    vi.spyOn(second, "getBoundingClientRect").mockReturnValue(new DOMRect(64, 40, 20, 20));
    vi.spyOn(far, "getBoundingClientRect").mockReturnValue(new DOMRect(200, 200, 20, 20));
    const addListener = vi.spyOn(document, "addEventListener");

    const coordinator = createProximityCoordinator(scope, {
      pointerTarget: document,
      nearRadius: 24,
    });
    document.dispatchEvent(new MouseEvent("pointermove", {
      bubbles: true,
      clientX: 62,
      clientY: 50,
    }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(first.getAttribute("data-ui-proximity")).toBe("near");
    expect(second.getAttribute("data-ui-proximity")).toBe("near");
    expect(far.hasAttribute("data-ui-proximity")).toBe(false);
    expect(scope.getAttribute("data-ui-interaction")).toBe("engaged");
    expect(addListener.mock.calls.filter(([name]) => name === "pointermove")).toHaveLength(1);

    vi.mocked(first.getBoundingClientRect).mockReturnValue(new DOMRect(240, 240, 20, 20));
    vi.mocked(second.getBoundingClientRect).mockReturnValue(new DOMRect(264, 240, 20, 20));
    coordinator.refresh();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(first.hasAttribute("data-ui-proximity")).toBe(false);
    expect(second.hasAttribute("data-ui-proximity")).toBe(false);
    expect(scope.hasAttribute("data-ui-interaction")).toBe(false);

    coordinator.destroy();
    expect(first.hasAttribute("data-ui-proximity")).toBe(false);
    expect(scope.hasAttribute("data-ui-interaction")).toBe(false);
  });
});
