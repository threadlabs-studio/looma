import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, createSSRApp, h, nextTick, ref, type App } from "vue";
import { renderToString } from "@vue/server-renderer";
import { controllerFor } from "@threadlabs/looma-core/declarative";

import { MenuItem, SearchShell, Switcher, ToastRegion, TopBar, Tree, TreeItem } from "./index";

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

  it("installs native-root component styles and keeps populated named regions visible", async () => {
    expect(controllerFor("ui-top-bar")?.default).toBeTypeOf("function");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h(TopBar, {}, {
          default: () => h("span", "Page title"),
          leading: () => h("button", { type: "button" }, "Menu"),
        }),
        h(SearchShell, {}, {
          search: () => h("input", { type: "search", "aria-label": "Search" }),
        }),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const topBar = host.querySelector<HTMLElement>(".top-bar")!;
    const leading = host.querySelector<HTMLElement>(".top-bar__leading")!;
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(getComputedStyle(topBar).display).toBe("flex");
    expect(leading.textContent).toContain("Menu");
    expect(leading.hidden).toBe(false);
    expect(search.getClientRects().length).toBeGreaterThan(0);
  });

  it("preserves nested framework components projected through named slots", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(Tree, { label: "Pages" }, () => h(TreeItem, {
        container: true,
        expanded: true,
        itemId: "parent",
        label: "Parent",
      }, {
        default: () => "Parent",
        children: () => h("div", [
          h(TreeItem, { itemId: "child", label: "Child" }, () => "Child"),
        ]),
      })),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    expect(host.querySelectorAll('[data-component-root="ui-tree-item"]')).toHaveLength(2);
    expect(host.querySelector('[role="group"] [data-component-root="ui-tree-item"]')).not.toBeNull();
    expect(host.textContent).toContain("Child");
  });

  it("preserves reactive framework content added to named slots", async () => {
    const expanded = ref(false);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(Tree, { label: "Pages" }, () => h(TreeItem, {
        container: true,
        expanded: expanded.value,
        itemId: "parent",
        label: "Parent",
      }, {
        default: () => "Parent",
        children: () => expanded.value
          ? h("div", [h(TreeItem, { itemId: "child", label: "Child" }, () => "Child")])
          : null,
      })),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    expanded.value = true;
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    expect(host.querySelectorAll('[data-component-root="ui-tree-item"]')).toHaveLength(2);
    expect(host.querySelector('[role="group"] [data-component-root="ui-tree-item"]')).not.toBeNull();
    expect(host.textContent).toContain("Child");
  });

  it("keeps hidden native roots out of layout", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(ToastRegion, { hidden: true }, () => "Saved"),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const region = host.querySelector<HTMLElement>('[data-component-root="ui-toast-region"]')!;
    expect(region.hidden).toBe(true);
    expect(region.getClientRects()).toHaveLength(0);
  });
});
