// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorSlashMenu, Switcher } from "./index";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount();
  });
  document.body.replaceChildren();
});

describe("React declarative adapters", () => {
  it("renders native roots and reflects scalar props without custom elements", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);

    await act(async () => {
      root.render(<Switcher gap="l">Content</Switcher>);
    });

    const element = host.querySelector<HTMLElement>('[data-component-root="ui-switcher"]');
    expect(element?.localName).toBe("div");
    expect(element?.getAttribute("data-gap")).toBe("l");
    expect(element?.textContent).toBe("Content");
    expect(customElements.get("ui-switcher")).toBeUndefined();

    await act(async () => {
      root.render(<Switcher>Content</Switcher>);
    });
    expect(element?.hasAttribute("data-gap")).toBe(false);
  });

  it("preserves structured property names and forwards declared events", async () => {
    const items = [{ title: "Paragraph", description: "Plain text", icon: "pilcrow" }];
    const anchorRect = { x: 12, y: 24, width: 1, height: 18 };
    const onSlashMenuSelect = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    roots.push(root);

    await act(async () => {
      root.render(
        <EditorSlashMenu
          items={items}
          anchorRect={anchorRect}
          open
          onLoomaEditorSlashMenuSelect={onSlashMenuSelect}
        />,
      );
    });

    const element = host.querySelector<HTMLElement>('[data-component-root="ui-editor-slash-menu"]') as
      | (HTMLElement & { items: unknown[]; anchorRect: typeof anchorRect })
      | null;
    expect(element?.items).toStrictEqual(items);
    expect(element?.anchorRect).toStrictEqual(anchorRect);

    const detail = { index: 0 };
    element?.dispatchEvent(new CustomEvent("looma-editor-slash-menu-select", { detail }));
    expect(onSlashMenuSelect).toHaveBeenCalledWith(detail, expect.any(CustomEvent));
  });
});
