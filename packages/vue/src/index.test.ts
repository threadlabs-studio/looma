import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, type App } from "vue";

import {
  ADAPTER_COMPONENT_TAG_MAP,
  Avatar,
  AvatarGroup,
  Badge,
  Callout,
  Button,
  ContextMenu,
  Switcher,
  Sidebar,
  Reel,
  Menu,
  MenuItem,
  Radio,
  RadioGroup,
  Tree,
  TreeItem,
  Editable,
} from "./index";

type MountedApp = {
  app: App;
  host: HTMLDivElement;
};

const mountedApps: MountedApp[] = [];

function mount(render: () => ReturnType<typeof h>): MountedApp {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  const mounted = { app, host };
  mountedApps.push(mounted);
  return mounted;
}

afterEach(() => {
  for (const mounted of mountedApps.splice(0)) {
    mounted.app.unmount();
    mounted.host.remove();
  }
  document.body.innerHTML = "";
});

describe("@threadlabs/looma-vue adapter", () => {
  it("includes parity exports for display primitive tags", () => {
    expect(ADAPTER_COMPONENT_TAG_MAP.RadioGroup).toBe("ui-radio-group");
    expect(ADAPTER_COMPONENT_TAG_MAP.Radio).toBe("ui-radio");
    expect(ADAPTER_COMPONENT_TAG_MAP.Badge).toBe("ui-badge");
    expect(ADAPTER_COMPONENT_TAG_MAP.Callout).toBe("ui-callout");
    expect(ADAPTER_COMPONENT_TAG_MAP.Avatar).toBe("ui-avatar");
    expect(ADAPTER_COMPONENT_TAG_MAP.AvatarGroup).toBe("ui-avatar-group");
    expect(ADAPTER_COMPONENT_TAG_MAP.ContextMenu).toBe("ui-context-menu");
    expect(ADAPTER_COMPONENT_TAG_MAP.Switcher).toBe("ui-switcher");
    expect(ADAPTER_COMPONENT_TAG_MAP.Sidebar).toBe("ui-sidebar");
    expect(ADAPTER_COMPONENT_TAG_MAP.Reel).toBe("ui-reel");
    expect(ADAPTER_COMPONENT_TAG_MAP.Tree).toBe("ui-tree");
    expect(ADAPTER_COMPONENT_TAG_MAP.TreeItem).toBe("ui-tree-item");
    expect(ADAPTER_COMPONENT_TAG_MAP.Editable).toBe("ui-editable");
    expect(Editable).toBeTruthy();
  });

  it("forwards callout tone with slot content", () => {
    const { host } = mount(() =>
      h(Callout, { tone: "warning" }, () => "Review this before publishing.")
    );

    expect(host.querySelector(`[data-component-root="ui-callout"]`)?.getAttribute("data-tone")).toBe("warning");
    expect(host.querySelector(`[data-component-root="ui-callout"]`)?.textContent).toContain("Review this before publishing.");
  });

  it("maps tree reorder and expansion events to typed callbacks", () => {
    const onReorder = vi.fn();
    const onExpand = vi.fn();
    const { host } = mount(() =>
      h(Tree, { label: "Pages", onReorder }, () =>
        h(TreeItem, { "item-id": "folder", label: "Folder", container: true, onExpand }, () => "Folder")
      )
    );

    const tree = host.querySelector(`[data-component-root="ui-tree"]`)!;
    const item = host.querySelector(`[data-component-root="ui-tree-item"]`)!;
    tree.dispatchEvent(new CustomEvent("reorder", {
      detail: {
        sourceId: "a",
        targetId: "folder",
        position: "inside",
        sourceType: "page",
        targetType: "folder",
        sourceScope: "root",
        targetScope: "root",
        trigger: "pointer",
      },
    }));
    item.dispatchEvent(new CustomEvent("expand", {
      detail: { id: "folder", expanded: true, trigger: "keyboard" },
    }));

    expect(onReorder).toHaveBeenCalledWith({
      sourceId: "a",
      targetId: "folder",
      position: "inside",
      sourceType: "page",
      targetType: "folder",
      sourceScope: "root",
      targetScope: "root",
      trigger: "pointer",
    });
    expect(onExpand).toHaveBeenCalledWith({ id: "folder", expanded: true, trigger: "keyboard" });
  });

  it("forwards a controlled tree expansion value as a component property", async () => {
    const { host } = mount(() =>
      h(Tree, { label: "Pages" }, () =>
        h(TreeItem, { "item-id": "folder", label: "Folder", container: true, expanded: false }, () => "Folder")
      )
    );

    const item = host.querySelector<HTMLElement & { expanded?: boolean }>(`[data-component-root="ui-tree-item"]`)!;
    await Promise.resolve();
    expect(item.expanded).toBe(false);
  });

  it("renders intrinsic layout wrappers as native tags", () => {
    const { host } = mount(() =>
      h(Switcher, { threshold: "sm" }, () => [
        h(Sidebar, { side: "start" }, () => "Sidebar"),
        h(Reel, { "item-width": "md" }, () => "Reel")
      ])
    );

    expect(host.querySelector(`[data-component-root="ui-switcher"][data-threshold="sm"]`)).toBeTruthy();
    expect(host.querySelector(`[data-component-root="ui-sidebar"][data-side="start"]`)).toBeTruthy();
    expect(host.querySelector(`[data-component-root="ui-reel"][data-item-width="md"]`)).toBeTruthy();
  });

  it("allows the resizable sidebar to progressively enhance its light DOM during hydration", () => {
    const { host } = mount(() => h(Sidebar, { resizable: true }, () => h("main", "Content")));

    expect(host.querySelector(`[data-component-root="ui-sidebar"]`)?.getAttribute("data-allow-mismatch")).toBe("");
  });

  it("renders a button as the native control with forwarded attrs and content", () => {
    const { host } = mount(() =>
      h(Button, { variant: "solid", size: "sm", type: "button" }, () => "Save page")
    );

    const button = host.querySelector(`[data-component-root="ui-button"]`);

    expect(button?.tagName).toBe("BUTTON");
    expect(button?.getAttribute("data-variant")).toBe("solid");
    expect(button?.getAttribute("data-size")).toBe("sm");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.getAttribute("data-allow-mismatch")).toBe("class");
    expect(button?.textContent).toBe("Save page");
    expect(button?.querySelector("button")).toBeNull();
  });

  it("lets consumers override the expected custom-element hydration mismatch", () => {
    const { host } = mount(() =>
      h(Button, { "data-allow-mismatch": "children" }, () => "Save page")
    );

    expect(host.querySelector(`[data-component-root="ui-button"]`)?.getAttribute("data-allow-mismatch")).toBe("children");
  });

  it("maps custom events to typed Vue callbacks", () => {
    const onSelect = vi.fn();
    const { host } = mount(() =>
      h(Menu, { onSelect }, () => [
        h(MenuItem, { value: "rename" }, () => "Rename"),
        h(MenuItem, { value: "delete" }, () => "Delete")
      ])
    );

    const menu = host.querySelector(`[data-component-root="ui-menu"]`);
    menu?.dispatchEvent(
      new CustomEvent("select", {
        detail: { value: "rename", trigger: "keyboard" },
        bubbles: true,
        composed: true
      })
    );

    expect(onSelect).toHaveBeenCalledWith({ value: "rename", trigger: "keyboard" });
  });

  it("renders the context-menu named export and forwards selection details", () => {
    const onSelect = vi.fn();
    const { host } = mount(() =>
      h(ContextMenu, { onSelect }, () => h(MenuItem, { value: "rename" }, () => "Rename"))
    );

    const contextMenu = host.querySelector(`[data-component-root="ui-context-menu"]`);
    expect(contextMenu).toBeTruthy();
    expect(contextMenu?.querySelector(`[data-component-root="ui-menu-item"]`)?.textContent).toContain("Rename");

    contextMenu?.dispatchEvent(
      new CustomEvent("select", {
        detail: { value: "rename", trigger: "keyboard" },
        bubbles: true,
        composed: true
      })
    );

    expect(onSelect).toHaveBeenCalledWith({ value: "rename", trigger: "keyboard" });
  });

  it("renders new primitive wrappers as native tags", () => {
    const { host } = mount(() =>
      h("div", [
        h(RadioGroup, { value: "pro", name: "plan" }, () => h(Radio, { value: "pro" }, () => "Pro")),
        h(Badge, { variant: "subtle", tone: "accent" }, () => "Draft"),
        h(Avatar, { name: "Taylor Reed", src: "/avatars/taylor.png" }, () => h("img"))
      ])
    );

    expect(host.querySelector(`[data-component-root="ui-radio-group"]`)).toBeTruthy();
    expect(host.querySelector(`[data-component-root="ui-radio"]`)).toBeTruthy();
    expect(host.querySelector(`[data-component-root="ui-badge"]`)?.textContent).toContain("Draft");
    expect(host.querySelector(`[data-component-root="ui-avatar"]`)?.getAttribute("data-name")).toBe("Taylor Reed");
  });

});
