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

  it("preserves structured editor geometry as a property-only input", async () => {
    const geometry = { left: 12, top: 24, width: 320, height: 180 };
    const invocation = document.createElement("ui-editor-table-overlay") as HTMLElement & {
      geometry: unknown;
    };
    invocation.geometry = geometry;
    document.body.append(invocation);
    await settle();

    const root = document.querySelector<HTMLElement & { geometry: unknown }>(
      '[data-component-root="ui-editor-table-overlay"]',
    );
    expect(root?.geometry).toStrictEqual(geometry);
    expect(root?.hasAttribute("geometry")).toBe(false);
  });
});
