import { afterEach, describe, expect, it } from "vitest";

import "../styles.css";
import "../../../tokens/src/tokens.css";

const flushStencil = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("visible surfaces under consumer resets (real browser)", () => {
  it("keeps avatar and menu-item geometry inside their shadow-owned surfaces", async () => {
    await Promise.all([
      customElements.whenDefined("ui-avatar"),
      customElements.whenDefined("ui-menu-item"),
    ]);
    document.body.innerHTML = `
      <style>
        * {
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          font-size: inherit;
          font-weight: inherit;
        }
      </style>
      <ui-avatar name="Ada Lovelace"></ui-avatar>
      <ui-menu-item value="rename">Rename</ui-menu-item>
    `;
    await flushStencil();

    const avatarHost = document.querySelector<HTMLElement>("ui-avatar")!;
    const avatarSurface = avatarHost.shadowRoot!.querySelector<HTMLElement>(".avatar")!;
    const menuItemHost = document.querySelector<HTMLElement>("ui-menu-item")!;
    const menuItemSurface = menuItemHost.shadowRoot!.querySelector<HTMLElement>(".menu-item__surface")!;

    expect(getComputedStyle(avatarHost).borderTopWidth).toBe("0px");
    expect(getComputedStyle(avatarSurface).inlineSize).toBe("40px");
    expect(getComputedStyle(avatarSurface).borderTopWidth).toBe("1px");
    expect(getComputedStyle(avatarSurface).borderTopLeftRadius).toBe("999px");
    expect(getComputedStyle(avatarSurface).fontSize).toBe("14px");
    expect(getComputedStyle(avatarSurface).fontWeight).toBe("600");
    expect(getComputedStyle(avatarSurface).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

    expect(getComputedStyle(menuItemHost).paddingLeft).toBe("0px");
    expect(getComputedStyle(menuItemSurface).paddingTop).toBe("8px");
    expect(getComputedStyle(menuItemSurface).paddingLeft).toBe("12px");
    expect(getComputedStyle(menuItemSurface).borderTopLeftRadius).toBe("8px");
    expect(getComputedStyle(menuItemSurface).fontSize).toBe("16px");
    expect(getComputedStyle(menuItemSurface).fontWeight).toBe("500");
  });
});
