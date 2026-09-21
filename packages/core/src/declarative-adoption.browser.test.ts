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
  it("keeps a selected combobox label current when its options change", async () => {
    document.body.innerHTML = `<ui-combobox label="Stop" value="north"><option value="north">North terminal</option><option value="south">South pier</option></ui-combobox>`;
    await settle();
    const root = document.querySelector<HTMLElement>('[data-component-root~="ui-combobox"]')!;
    const input = root.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    await vi.waitFor(() => expect(input.value).toBe("North terminal"));

    root.querySelector<HTMLOptionElement>('option[value="north"]')!.textContent = "North terminal (renamed)";
    await vi.waitFor(() => expect(input.value).toBe("North terminal (renamed)"));

    root.querySelector(".authored-options")!.replaceChildren(
      Object.assign(document.createElement("option"), { value: "north", textContent: "Harbor North" }),
    );
    await vi.waitFor(() => expect(input.value).toBe("Harbor North"));
  });

  it("resolves a strict combobox's typed text to a valid option when focus leaves", async () => {
    document.body.innerHTML = `<ui-combobox label="Stop" required><option value="north">North terminal</option><option value="south">South pier</option></ui-combobox><button id="after">After</button>`;
    await settle();
    const input = document.querySelector<HTMLInputElement>('[data-component-root~="ui-combobox"] input[role="combobox"]')!;
    input.focus();
    input.value = "North";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    document.getElementById("after")!.focus();
    await vi.waitFor(() => expect(input.value).toBe("North terminal"));

    // Text that matches no option does not stand as the value.
    input.focus();
    input.value = "Nowhere";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
    document.getElementById("after")!.focus();
    await vi.waitFor(() => expect(input.value).toBe("North terminal"));
  });

  it("does not pull focus back to an editor committed by a click elsewhere", async () => {
    document.body.innerHTML = `<ui-editable value="First"></ui-editable><ui-editable value="Second"></ui-editable>`;
    await settle();
    const [first, second] = [...document.querySelectorAll<HTMLElement>('[data-component-root~="ui-editable"]')];
    first!.querySelector<HTMLButtonElement>(".editable__preview")!.click();
    await vi.waitFor(() => expect(document.activeElement).toBe(first!.querySelector("input")));
    second!.querySelector(".editable__preview")!.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    second!.querySelector<HTMLButtonElement>(".editable__preview")!.click();
    await vi.waitFor(() => expect(document.activeElement).toBe(second!.querySelector("input")));
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(document.activeElement).toBe(second!.querySelector("input"));
  });

  it("reads public tokens a consumer sets on an ancestor", async () => {
    // Components read their public --ui-* tokens with fallbacks instead of redeclaring them on the
    // root, so an app-level override (here an edge-to-edge mobile dialog) reaches the component.
    document.body.innerHTML = `
      <div style="--ui-dialog-max-width: 100vw; --ui-dialog-viewport-gap: 0px; --ui-badge-surface: rgb(1, 2, 3);">
        <ui-dialog open modal label="Document comparison"><p>Body</p></ui-dialog>
        <ui-badge tone="danger">New</ui-badge>
      </div>
    `;
    await settle();
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    const dialog = document.querySelector<HTMLElement>('[data-component-root~="ui-dialog"]')!;
    const bounds = dialog.getBoundingClientRect();
    expect(bounds.left).toBe(0);
    expect(bounds.width).toBe(document.documentElement.clientWidth);
    const badge = document.querySelector('[data-component-root~="ui-badge"] .badge__surface')!;
    expect(getComputedStyle(badge).backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("lowers live HTML to native roots without registering custom elements", async () => {
    document.body.innerHTML = '<ui-button variant="solid">Save</ui-button>';
    await settle();

    const root = document.querySelector<HTMLElement>('[data-component-root="ui-button"]');
    expect(root?.localName).toBe("button");
    expect(root?.dataset.variant).toBe("solid");
    expect(root?.textContent).toBe("Save");
    expect(root?.querySelector("button")).toBeNull();
    expect(document.querySelector("ui-button")).toBeNull();
    expect(customElements.get("ui-button")).toBeUndefined();
  });

  it("keeps server-rendered slot content when observation hydrates a root", async () => {
    const root = document.createElement("div");
    root.dataset.component = "ui-switcher";
    root.dataset.componentRoot = "ui-switcher";
    root.textContent = "Framework content";
    document.body.append(root);
    await settle();

    expect(root.textContent).toBe("Framework content");
    expect(root.isConnected).toBe(true);
  });

  it("does not rewrite server-rendered roots while registering another package", async () => {
    const root = document.createElement("button");
    root.dataset.component = "ui-button";
    root.dataset.componentRoot = "ui-button";
    const marker = document.createElement("span");
    marker.textContent = "Server-rendered Vue content";
    root.append(marker);
    document.body.append(root);

    const { registerLoomaPackage } = await import("./declarative");
    registerLoomaPackage("ssr-registration-regression", [], "");
    await settle();

    expect(root.firstElementChild).toBe(marker);
    expect(root.textContent).toBe("Server-rendered Vue content");
  });

  it("uses canonical declarative attribute names instead of legacy source aliases", async () => {
    document.body.innerHTML = '<ui-input readonly></ui-input>';
    await settle();

    const root = document.querySelector<HTMLInputElement>('[data-component-root="ui-input"]');
    expect(root?.readOnly).toBe(true);
    expect(root?.hasAttribute("data-read-only")).toBe(false);
  });

  it("coerces an explicit false HTML attribute through the declared boolean type", async () => {
    document.body.innerHTML = '<ui-button disabled="false">Available action</ui-button>';
    await settle();

    const root = document.querySelector<HTMLButtonElement>('[data-component-root="ui-button"]');
    expect(root?.disabled).toBe(false);
    expect(root?.textContent).toBe("Available action");
  });

  it("attaches controllers, JSON-attribute props, and public methods to lowered roots", async () => {
    const onChange = vi.fn();
    const checkbox = document.createElement("ui-checkbox");
    checkbox.textContent = "Subscribe";
    // Structured props are JSON attributes; options are authored <option> children.
    const combobox = document.createElement("ui-combobox");
    combobox.setAttribute("token-separators", '[","]');
    combobox.innerHTML = `<option value="one">One</option>`;
    document.body.append(checkbox, combobox);
    await settle();

    const checkboxRoot = document.querySelector<HTMLElement>('[data-component-root="ui-checkbox"]');
    checkboxRoot?.addEventListener("change", onChange);
    const input = checkboxRoot?.querySelector<HTMLInputElement>("input");
    input?.click();
    await settle();
    expect(onChange).toHaveBeenCalled();

    const root = document.querySelector<HTMLElement & {
      validate: () => Promise<unknown>;
      focusInput: () => Promise<void>;
    }>('[data-component-root="ui-combobox"]');
    expect(root?.getAttribute("data-token-separators")).toBe('[","]');
    expect(root !== null && Object.hasOwn(root, "tokenSeparators")).toBe(false);
    expect(typeof root?.validate).toBe("function");
    expect(typeof root?.focusInput).toBe("function");
  });
});
