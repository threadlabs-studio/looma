import { afterEach, describe, expect, it, vi } from "vitest";

async function settle(): Promise<void> {
  await Promise.resolve();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await Promise.resolve();
}

afterEach(async () => {
  document.body.replaceChildren();
  await settle();
});

describe("shipped declarative component graph", () => {
  it("lets dialog consumers opt into an edge-to-edge viewport surface", async () => {
    document.body.innerHTML = `
      <ui-dialog
        open
        label="Document comparison"
        style="--ui-dialog-max-width: 100vw; --ui-dialog-viewport-gap: 0px;"
      >
        <h2>Document comparison</h2>
      </ui-dialog>
    `;
    await settle();

    const root = document.querySelector<HTMLElement>('[data-component-root="ui-dialog"]')!;
    const dialog = root.querySelector("dialog")!;
    const bounds = dialog.getBoundingClientRect();

    expect(bounds.left).toBe(0);
    expect(bounds.width).toBe(window.innerWidth);
  });

  it("lowers live HTML to native roots without registering custom elements", async () => {
    document.body.innerHTML = '<ui-button variant="solid"><button type="button">Save</button></ui-button>';
    await settle();

    const root = document.querySelector<HTMLElement>('[data-component-root="ui-button"]');
    expect(root?.localName).toBe("span");
    expect(root?.dataset.variant).toBe("solid");
    expect(root?.querySelector("button")?.textContent).toBe("Save");
    expect(document.querySelector("ui-button")).toBeNull();
    expect(customElements.get("ui-button")).toBeUndefined();
  });

  it("keeps framework-owned native roots outside live observation", async () => {
    const root = document.createElement("div");
    root.dataset.componentRoot = "ui-switcher";
    root.dataset.loomaManaged = "framework";
    root.textContent = "Framework content";
    document.body.append(root);
    await settle();

    expect(root.textContent).toBe("Framework content");
    expect(root.isConnected).toBe(true);
  });

  it("uses canonical declarative attribute names instead of legacy source aliases", async () => {
    document.body.innerHTML = '<ui-input read-only><input type="text"></ui-input>';
    await settle();

    const root = document.querySelector<HTMLElement>('[data-component-root="ui-input"]');
    expect(root?.dataset.readOnly).toBe("true");
    expect(root?.querySelector<HTMLInputElement>("input")?.readOnly).toBe(true);
  });

  it("attaches controllers, structured props, and public methods to lowered roots", async () => {
    const onChange = vi.fn();
    const checkbox = document.createElement("ui-checkbox");
    checkbox.innerHTML = '<input type="checkbox">';
    const config = { options: [{ id: "one", value: "one", label: "One" }] };
    const combobox = document.createElement("ui-combobox") as HTMLElement & { config: unknown };
    combobox.config = config;
    document.body.append(checkbox, combobox);
    await settle();

    const checkboxRoot = document.querySelector<HTMLElement>('[data-component-root="ui-checkbox"]');
    checkboxRoot?.addEventListener("change", onChange);
    const input = checkboxRoot?.querySelector<HTMLInputElement>("input");
    input?.click();
    await settle();
    expect(onChange).toHaveBeenCalled();

    const root = document.querySelector<HTMLElement & {
      config: unknown;
      validate: () => Promise<unknown>;
      focusInput: () => Promise<void>;
    }>('[data-component-root="ui-combobox"]');
    expect(root?.config).toStrictEqual(config);
    expect(root?.hasAttribute("config")).toBe(false);
    expect(typeof root?.validate).toBe("function");
    expect(typeof root?.focusInput).toBe("function");
  });
});
