// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";

import { bindAdapter, createAdapterElement } from "./index";

describe("Svelte declarative adapters", () => {
  it("creates native roots and reflects scalar props without custom elements", async () => {
    const child = document.createElement("span");
    child.textContent = "Content";
    const element = createAdapterElement("ui-switcher", {
      props: { gap: "l" },
      children: [child],
    });
    document.body.append(element);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.localName).toBe("div");
    expect(element.dataset.componentRoot).toBe("ui-switcher");
    expect(element.dataset.gap).toBe("l");
    expect(element.textContent).toBe("Content");
    expect(customElements.get("ui-switcher")).toBeUndefined();
  });

  it("passes structured props as JSON attributes and manages action listeners", async () => {
    const items = [{ title: "Paragraph", description: "Plain text", icon: "pilcrow" }];
    const anchorRect = { x: 12, y: 24, width: 1, height: 18 };
    const element = createAdapterElement("ui-editor-slash-menu", {
      props: { items, anchorRect, open: true },
    });
    document.body.append(element);
    await Promise.resolve();

    // Props are attributes: explicit structured values are reflected as JSON, never as properties.
    expect(JSON.parse(element.getAttribute("data-items") ?? "null")).toStrictEqual(items);
    expect(JSON.parse(element.getAttribute("data-anchor-rect") ?? "null")).toStrictEqual(anchorRect);
    expect(Object.hasOwn(element, "items")).toBe(false);

    const first = vi.fn();
    const second = vi.fn();
    const action = bindAdapter(element, { onSelect: first });
    element.dispatchEvent(new CustomEvent("select", { detail: { value: "one" } }));
    action.update({ onSelect: second });
    element.dispatchEvent(new CustomEvent("select", { detail: { value: "two" } }));
    action.destroy();
    element.dispatchEvent(new CustomEvent("select", { detail: { value: "three" } }));

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    element.remove();
  });
});
