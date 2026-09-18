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

describe("ui-button disabled reflection (real browser)", () => {
  it("reflects the disabled prop to the attribute so a stale attribute never outlives the enabled state", async () => {
    // Regression: ui-button used to declare `@Prop() disabled` without reflection.
    // A `disabled` attribute rendered during SSR for a disabled-until-valid CTA then
    // lingered after hydration flipped the prop to enabled, so consumer themes and
    // Looma's own :host([disabled]) styles kept fading a fully working button.
    document.body.innerHTML = `
      <ui-button variant="solid" disabled><button type="button">Send</button></ui-button>
    `;
    await flushStencil();

    const el = document.querySelector<HTMLElement & { disabled: boolean }>("ui-button")!;
    const nativeButton = el.querySelector("button")!;

    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.getAttribute("data-disabled")).toBe("true");
    expect(nativeButton.disabled).toBe(true);

    // Hydration flips the prop to enabled (user typed a valid email). The attribute
    // must follow, or the button stays styled disabled while being fully clickable.
    el.disabled = false;
    await flushStencil();

    expect(el.hasAttribute("disabled")).toBe(false);
    expect(el.hasAttribute("data-disabled")).toBe(false);
    expect(nativeButton.disabled).toBe(false);

    // And back again keeps the attribute in sync.
    el.disabled = true;
    await flushStencil();
    expect(el.hasAttribute("disabled")).toBe(true);
    expect(el.getAttribute("data-disabled")).toBe("true");
  });
});
