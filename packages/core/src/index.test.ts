import { afterEach, describe, expect, it } from "vitest";
import { LOOMA_ICONS, loomaIconMarkup } from "./icons";

async function flushDeclarative(): Promise<void> {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

async function render(markup: string): Promise<HTMLElement> {
  document.body.innerHTML = markup;
  await flushDeclarative();
  const root = document.body.querySelector<HTMLElement>("[data-component-root]");
  if (!root) throw new Error("Declarative invocation did not lower to a native root.");
  return root;
}

afterEach(async () => {
  document.body.replaceChildren();
  await flushDeclarative();
});

describe("@threadlabs/looma-core declarative graph", () => {
  it("does not register legacy custom elements", () => {
    expect(customElements.get("ui-button")).toBeUndefined();
    expect(customElements.get("ui-combobox")).toBeUndefined();
  });

  it("lowers live HTML to a native root and keeps scalar props reactive", async () => {
    const button = await render(`<ui-button disabled><button type="button">Save</button></ui-button>`);
    const nativeButton = button.querySelector("button");

    expect(button.tagName).toBe("SPAN");
    expect(button.dataset.componentRoot).toBe("ui-button");
    expect(button.dataset.variant).toBe("outline");
    expect(nativeButton?.disabled).toBe(true);

    (button as HTMLElement & { disabled: boolean; variant: string }).disabled = false;
    (button as HTMLElement & { disabled: boolean; variant: string }).variant = "solid";
    await flushDeclarative();

    expect(nativeButton?.disabled).toBe(false);
    expect(button.dataset.variant).toBe("solid");
  });

  it("preserves property-only structured inputs and exported methods", async () => {
    const config = { options: [{ id: "one", value: "one", label: "One" }] };
    const invocation = document.createElement("ui-combobox") as HTMLElement & { config: unknown };
    invocation.config = config;
    document.body.append(invocation);
    await flushDeclarative();

    const combobox = document.body.querySelector<HTMLElement & {
      config: unknown;
      validate: () => Promise<unknown>;
      focusInput: () => Promise<void>;
    }>(`[data-component-root="ui-combobox"]`);

    expect(combobox?.tagName).toBe("DIV");
    expect(combobox?.config).toStrictEqual(config);
    expect(typeof combobox?.validate).toBe("function");
    expect(typeof combobox?.focusInput).toBe("function");
    expect(combobox?.hasAttribute("config")).toBe(false);
  });

  it("lowers nested component invocations through the same graph", async () => {
    const contextMenu = await render(`<ui-context-menu><ui-menu-item value="edit">Edit</ui-menu-item></ui-context-menu>`);

    expect(contextMenu.tagName).toBe("SPAN");
    expect(contextMenu.querySelector("ui-menu")).toBeNull();
    expect(contextMenu.querySelector("ui-menu-item")).toBeNull();
    expect(contextMenu.querySelector(`[data-component-root="ui-menu"]`)).toBeTruthy();
    expect(contextMenu.querySelector(`[data-component-root="ui-menu-item"]`)).toBeTruthy();
  });

  it("routes DOM behavior through controllers on native roots", async () => {
    const checkbox = await render(`<ui-checkbox value="newsletter"><input type="checkbox"></ui-checkbox>`);
    const input = checkbox.querySelector<HTMLInputElement>("input");
    const changes: unknown[] = [];
    checkbox.addEventListener("change", (event) => {
      if (event instanceof CustomEvent) changes.push(event.detail);
    });

    input?.click();
    await flushDeclarative();

    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(changes).toEqual([{ checked: true, value: "newsletter", trigger: "programmatic" }]);
  });

  it("provides the shared Lucide registry as accessible SVG markup", () => {
    expect(LOOMA_ICONS["chevron-down"]).toBeTruthy();
    const markup = loomaIconMarkup("chevron-down");
    expect(markup).toContain('<svg class="looma-icon"');
    expect(markup).toContain('data-looma-icon="chevron-down"');
    expect(markup).toContain('aria-hidden="true"');
  });
});
