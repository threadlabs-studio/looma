import { beforeEach, afterEach, describe, expect, it } from "vitest";
// The global light-DOM fallback is what actually paints slotted buttons (document
// rules override the shadow ::slotted rules). This test loads it and drives the
// client-render path that broke in Knit: variant set as a *property*, no attribute.
import globalStyles from "../../styles.css?raw";

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

const ACCENT = "rgb(91, 85, 214)";
const NEUTRAL = "rgb(255, 255, 255)";
let styleEl: HTMLStyleElement;

beforeEach(() => {
  document.body.innerHTML = "";
  styleEl = document.createElement("style");
  // Minimal token surface the button fallback resolves against.
  styleEl.textContent = `
    :root {
      --ui-action-primary-surface: ${ACCENT};
      --ui-accent-solid: ${ACCENT};
      --ui-action-primary-text: #ffffff;
      --ui-action-secondary-surface: ${NEUTRAL};
      --ui-surface-default: ${NEUTRAL};
      --ui-control-border: #e4e4e0;
    }
  ` + globalStyles;
  document.head.appendChild(styleEl);
});

afterEach(() => {
  styleEl?.remove();
});

const bgOf = (button: HTMLElement) => getComputedStyle(button).backgroundColor;

describe("ui-button light-DOM variant fallback", () => {
  it("applies the solid surface when variant is set as a property (the client-render path)", async () => {
    // Regression: Vue/framework client renders set `variant` as a property, so the
    // element carries only Stencil's data-variant, never a `variant` attribute. The
    // fallback used to key on [variant="solid"] and missed, leaving the button on the
    // neutral base — every dialog/client-only CTA rendered as a white box.
    document.body.innerHTML = `<ui-button><button type="button">Send</button></ui-button>`;
    const el = document.querySelector<HTMLElement & { variant: string }>("ui-button")!;
    el.variant = "solid"; // property, NOT attribute
    await flushStencil();

    const button = el.querySelector("button")!;
    expect(el.hasAttribute("variant")).toBe(false);
    expect(el.getAttribute("data-variant")).toBe("solid");
    expect(bgOf(button)).toBe(ACCENT);
    expect(bgOf(button)).not.toBe(NEUTRAL);
  });

  it("still applies the solid surface when variant is a server-rendered attribute", async () => {
    document.body.innerHTML = `<ui-button variant="solid"><button type="button">Send</button></ui-button>`;
    await flushStencil();
    const el = document.querySelector<HTMLElement>("ui-button")!;
    expect(bgOf(el.querySelector("button")!)).toBe(ACCENT);
  });

  it("keeps ghost transparent on the client-render path", async () => {
    document.body.innerHTML = `<ui-button><button type="button">Cancel</button></ui-button>`;
    const el = document.querySelector<HTMLElement & { variant: string }>("ui-button")!;
    el.variant = "ghost";
    await flushStencil();
    expect(bgOf(el.querySelector("button")!)).toBe("rgba(0, 0, 0, 0)");
  });
});
