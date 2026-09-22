import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick, ref, type App } from "vue";
import { renderToString } from "@vue/server-renderer";
import { page } from "@vitest/browser/context";
import { controllerFor } from "@threadlabs/looma-core/declarative";

import {
  Editable,
  Input,
  Select,
  Textarea,
  MenuItem,
  SearchShell,
  Sidebar,
  Switcher,
  ToastRegion,
  TopBar,
  Tree,
  TreeItem,
} from "./index";

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

  it("keeps false-default Boolean state locally interactive when the prop is omitted", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(Editable, { label: "Page tags", value: "Add tag" }),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const editable = host.querySelector<HTMLElement>('[data-component-root="ui-editable"]')!;
    host.querySelector<HTMLButtonElement>(".editable__preview")!.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(editable.hasAttribute("data-state-edit")).toBe(true);
    // The in-place input is enabled only while editing (it shares the value's layout cell).
    expect(host.querySelector<HTMLInputElement>(".editable__input")?.disabled).toBe(false);
  });

  it("applies reactive Boolean property updates to owned component state", async () => {
    const edit = ref(false);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(Editable, { edit: edit.value, label: "Page tags", value: "Add tag" }),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    edit.value = true;
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(host.querySelector<HTMLElement>('[data-component-root="ui-editable"]')?.hasAttribute("data-state-edit")).toBe(true);
    // The in-place input is enabled only while editing (it shares the value's layout cell).
    expect(host.querySelector<HTMLInputElement>(".editable__input")?.disabled).toBe(false);

    edit.value = false;
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(host.querySelector<HTMLElement>('[data-component-root="ui-editable"]')?.hasAttribute("data-state-edit")).toBe(false);
  });

  it("renders the sidebar panel with its width and resize handle", async () => {
    // Above the default 48rem breakpoint, so the panel is docked rather than a drawer.
    await page.viewport(1200, 800);
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", { style: "display: flex; inline-size: 900px" }, [
        h(Sidebar, { resizable: true, width: 256 }, () => [h("nav", "Navigation")]),
        h("main", "Content"),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const sidebar = host.querySelector<HTMLElement>('[data-component-root="ui-sidebar"]')!;
    expect(sidebar.localName).toBe("aside");
    expect(sidebar.querySelector("nav")?.textContent).toBe("Navigation");
    expect(Math.round(sidebar.getBoundingClientRect().width)).toBe(256);
    expect(sidebar.querySelector('[data-ui-sidebar-resizer]')?.getAttribute("aria-valuenow")).toBe("256");
  });

  it("hydrates conditional tree-item structure without dropping framework slot regions", async () => {
    const FolderIcon = defineComponent({
      name: "FolderIcon",
      render: () => h("svg", { class: "folder-icon", "aria-hidden": "true" }),
    });
    const component = {
      render: () => h(TreeItem, {
        container: true,
        itemId: "docs",
        sortable: true,
      }, {
        leading: () => h(FolderIcon),
        default: () => h("span", { class: "folder-name" }, "Docs"),
        actions: () => h("div", { class: "folder-actions" }, [
          h("button", { type: "button" }, "More"),
        ]),
        children: () => h("span", "Child page"),
      }),
    };
    const host = document.createElement("div");
    host.innerHTML = await renderToString(createSSRApp(component));
    document.body.append(host);
    const serverRoot = host.firstElementChild;
    expect(host.querySelector(".folder-icon")).not.toBeNull();
    expect(host.querySelector(".folder-name")?.textContent).toBe("Docs");
    expect(host.querySelector(".folder-actions button")?.textContent).toBe("More");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const app = createSSRApp(component);
      apps.push(app);
      app.mount(host);
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      expect(host.firstElementChild).toBe(serverRoot);
      expect(host.querySelector(".folder-icon")).not.toBeNull();
      expect(host.querySelector(".folder-name")?.textContent).toBe("Docs");
      expect(host.querySelector(".folder-actions button")?.textContent).toBe("More");
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
        h(SearchShell, { open: true }, {
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
      }, () => h("div", [
          h(TreeItem, { itemId: "child", label: "Child" }, () => "Child"),
        ]))),
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
      }, () => expanded.value
          ? h("div", [h(TreeItem, { itemId: "child", label: "Child" }, () => "Child")])
          : null)),
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

  it("keeps reactive default-slot content in its original region", async () => {
    const label = ref("First title");
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(TreeItem, {
        itemId: "page",
        label: label.value,
      }, {
        default: () => h("span", { class: "child" }, "Child"),
        actions: () => h("button", { type: "button" }, "More"),
      }),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    label.value = "Updated title";
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    expect(host.querySelector('[part="label"]')?.textContent).toBe("Updated title");
    expect(host.querySelector('[part="children"] .child')?.textContent).toBe("Child");
    expect(host.querySelector('[part="actions"] button')?.textContent).toBe("More");
  });

  it("renders authored options inside Select", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h(Select, { id: "topic", value: "question", required: true }, () => [
        h("option", { value: "problem" }, "Problem"),
        h("option", { value: "question" }, "Question"),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const select = host.querySelector<HTMLSelectElement>("select")!;
    expect(select.id).toBe("topic");
    expect(select.required).toBe(true);
    expect(Array.from(select.options, (option) => option.value)).toEqual(["problem", "question"]);
    expect(select.value).toBe("question");
    expect(select.querySelector("span")).toBeNull();
  });

  it("passes native input and change events to handlers and supports v-model", async () => {
    const email = ref("");
    const notes = ref("");
    const topic = ref("problem");
    const inputEvents: unknown[] = [];
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () => h("div", [
        h(Input, {
          modelValue: email.value,
          "onUpdate:modelValue": (value: string) => { email.value = value; },
          onInput: (event: unknown) => inputEvents.push(event),
        }),
        h(Textarea, { modelValue: notes.value, "onUpdate:modelValue": (value: string) => { notes.value = value; } }),
        h(Select, { modelValue: topic.value, "onUpdate:modelValue": (value: string) => { topic.value = value; } }, () => [
          h("option", { value: "problem" }, "Problem"),
          h("option", { value: "question" }, "Question"),
        ]),
      ]),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const input = host.querySelector<HTMLInputElement>("input")!;
    input.value = "a@b.c";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(email.value).toBe("a@b.c");
    expect(inputEvents[0]).toBeInstanceOf(Event);
    expect((inputEvents[0] as Event).target).toBe(input);

    const textarea = host.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Notes";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    expect(notes.value).toBe("Notes");

    const select = host.querySelector<HTMLSelectElement>("select")!;
    select.value = "question";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(topic.value).toBe("question");

    // The model drives the control.
    email.value = "x@y.z";
    await nextTick();
    expect(input.value).toBe("x@y.z");
  });

  it("shows label slot content in place of the label text and keeps label as the name", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const expands: unknown[] = [];
    const app = createApp({
      render: () => h(TreeItem, {
        container: true,
        itemId: "page",
        label: "Getting started",
        onExpand: (detail: unknown) => expands.push(detail),
      }, {
        label: () => h("a", { href: "#getting-started" }, "Getting started"),
        default: () => h("span", "Child"),
      }),
    });
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const item = host.querySelector<HTMLElement>('[data-component-root="ui-tree-item"]')!;
    const link = host.querySelector<HTMLAnchorElement>('[part="label"] a')!;
    expect(host.querySelector('[part="label"]')?.textContent).toBe("Getting started");
    expect(item.getAttribute("aria-label")).toBe("Getting started");
    expect(host.querySelector('[part="disclosure"]')?.getAttribute("aria-label")).toBe("Expand Getting started");

    // The link navigates; it does not also toggle the row.
    link.click();
    expect(location.hash).toBe("#getting-started");
    expect(expands).toEqual([]);
    history.replaceState(null, "", location.pathname + location.search);
  });

  it("keeps projected regions across reactive updates after SSR hydration", async () => {
    const label = ref("First title");
    const expanded = ref(false);
    const sortable = ref(false);
    const component = {
      render: () => h(TreeItem, {
        container: true,
        expanded: expanded.value,
        itemId: "page",
        label: label.value,
        sortable: sortable.value,
      }, {
        leading: () => h("span", { class: "icon" }, "Icon"),
        default: () => expanded.value ? h("span", "Child") : null,
        actions: () => h("button", { type: "button" }, "More"),
      }),
    };
    const host = document.createElement("div");
    host.innerHTML = await renderToString(createSSRApp(component));
    document.body.append(host);
    const app = createSSRApp(component);
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    label.value = "Updated title";
    expanded.value = true;
    sortable.value = true;
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    expect(host.querySelector('[part="leading"] .icon')?.textContent).toBe("Icon");
    expect(host.querySelector('[part="label"]')?.textContent).toBe("Updated title");
    expect(host.querySelector('[part="actions"] button')?.textContent).toBe("More");
    expect(host.querySelector('[part="children"]')?.textContent).toContain("Child");
  });

  it("keeps item regions when a hydrated tree receives parent list updates", async () => {
    const items = ref([{ id: "general", label: "General", depth: 0 }]);
    const component = {
      render: () => h(Tree, { label: "Pages" }, () => items.value.map((item) => h(TreeItem, {
        key: item.id,
        container: true,
        itemId: item.id,
        label: item.label,
        subtreeDepth: item.depth,
      }, {
        leading: () => h("span", { class: "icon" }, "Icon"),
        default: () => h("span", "Child"),
        actions: () => h("button", { type: "button" }, "More"),
      }))),
    };
    const host = document.createElement("div");
    host.innerHTML = await renderToString(createSSRApp(component));
    document.body.append(host);
    const app = createSSRApp(component);
    apps.push(app);
    app.mount(host);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    items.value = [
      { id: "general", label: "General", depth: 1 },
      { id: "source", label: "Depth source", depth: 0 },
    ];
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const roots = Array.from(host.querySelectorAll<HTMLElement>('[data-component-root="ui-tree-item"]'));
    expect(roots).toHaveLength(2);
    for (const root of roots) {
      const title = root.querySelector<HTMLElement>('[part="label"]');
      expect(root.querySelector('[part="leading"] .icon')).not.toBeNull();
      expect(title).not.toBeNull();
      expect(title?.textContent).toBe(root.getAttribute("aria-label"));
      expect(root.querySelector('[part="actions"] button')?.textContent).toBe("More");
    }
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
