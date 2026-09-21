import { afterEach, describe, expect, it } from "vitest";

import "../src/ui";

async function settle(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await Promise.resolve();
}

afterEach(async () => {
  document.body.replaceChildren();
  await settle();
});

describe("shipped editor declarative graph", () => {
  it("lowers all seven editor surfaces without custom elements", async () => {
    document.body.innerHTML = [
      "ui-editor-toolbar",
      "ui-editor-slash-menu",
      "ui-editor-mention-menu",
      "ui-editor-table-context-menu",
      "ui-editor-table-toolbar",
      "ui-editor-insert-table-grid",
      "ui-editor-table-overlay",
    ].map((tag) => `<${tag}></${tag}>`).join("");
    await settle();

    expect(document.querySelectorAll('[data-component-root^="ui-editor-"]')).toHaveLength(7);
    expect(document.querySelector("ui-editor-toolbar")).toBeNull();
    expect(customElements.get("ui-editor-toolbar")).toBeUndefined();
  });

  it("takes structured editor geometry as a JSON attribute", async () => {
    const geometry = {
      rowBoundaries: [24, 204],
      columnBoundaries: [12, 332],
      activeCell: null,
    };
    const invocation = document.createElement("ui-editor-table-overlay");
    invocation.setAttribute("geometry", JSON.stringify(geometry));
    document.body.append(invocation);
    await settle();

    const root = document.querySelector<HTMLElement>('[data-component-root="ui-editor-table-overlay"]');
    // Explicit props are reflected as canonical JSON; nothing is exposed as a property.
    expect(JSON.parse(root?.getAttribute("data-geometry") ?? "null")).toMatchObject({
      rowBoundaries: [24, 204],
      columnBoundaries: [12, 332],
    });
    expect(root !== null && Object.hasOwn(root, "geometry")).toBe(false);
  });
});
