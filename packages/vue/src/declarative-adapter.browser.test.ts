import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, createSSRApp, h, type App } from "vue";
import { renderToString } from "@vue/server-renderer";

import { MenuItem, Switcher, TreeItem } from "./index";

const apps: App[] = [];

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
});

describe("Vue declarative adapters in a browser", () => {
  it("renders framework-owned native roots without a custom-element bridge", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(Switcher, { gap: "l" }, () => "Framework content"),
    });
    apps.push(app);
    app.mount(host);
    await Promise.resolve();

    const root = host.querySelector<HTMLElement>('[data-component-root="ui-switcher"]');
    expect(root?.localName).toBe("div");
    expect(root?.dataset.gap).toBe("l");
    expect(root?.textContent).toBe("Framework content");
    expect(customElements.get("ui-switcher")).toBeUndefined();
  });

  it("forwards declared DOM events from native roots", async () => {
    const onSelect = vi.fn();
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(MenuItem, { value: "rename", onSelect }, () => "Rename"),
    });
    apps.push(app);
    app.mount(host);
    await Promise.resolve();

    const root = host.querySelector<HTMLElement>('[data-component-root="ui-menu-item"]');
    const detail = { value: "rename", trigger: "keyboard" };
    root?.dispatchEvent(new CustomEvent("select", { detail }));
    expect(onSelect).toHaveBeenCalledWith(detail);
  });

  it("hydrates conditional tree-item structure without replacing server markup", async () => {
    const component = {
      render: () => h(TreeItem, {
        container: true,
        itemId: "docs",
        sortable: true,
      }, {
        default: () => "Docs",
        children: () => h("span", "Child page"),
      }),
    };
    const host = document.createElement("div");
    host.innerHTML = await renderToString(createSSRApp(component));
    document.body.append(host);
    const serverRoot = host.firstElementChild;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const app = createSSRApp(component);
      apps.push(app);
      app.mount(host);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      expect(host.firstElementChild).toBe(serverRoot);
      expect(consoleWarn.mock.calls.flat().join(" ")).not.toContain("Hydration");
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("Hydration");
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });
});
