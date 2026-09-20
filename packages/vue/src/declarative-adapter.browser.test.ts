import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, type App } from "vue";

import { MenuItem, Switcher } from "./index";

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
});
