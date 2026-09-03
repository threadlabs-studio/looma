import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, type App } from "vue";

vi.mock("@threadlabs/looma-layout", () => ({}));
vi.mock("@threadlabs/looma-core", () => ({}));
import {
  ADAPTER_COMPONENT_TAG_MAP,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  ContextMenu,
  FloatingActionButton,
  Switcher,
  Sidebar,
  Reel,
  Menu,
  MenuItem,
  Radio,
  RadioGroup
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
  it("includes parity exports for radio, badge, avatar, and avatar-group tags", () => {
    expect(ADAPTER_COMPONENT_TAG_MAP.RadioGroup).toBe("ui-radio-group");
    expect(ADAPTER_COMPONENT_TAG_MAP.Radio).toBe("ui-radio");
    expect(ADAPTER_COMPONENT_TAG_MAP.Badge).toBe("ui-badge");
    expect(ADAPTER_COMPONENT_TAG_MAP.Avatar).toBe("ui-avatar");
    expect(ADAPTER_COMPONENT_TAG_MAP.AvatarGroup).toBe("ui-avatar-group");
    expect(ADAPTER_COMPONENT_TAG_MAP.FloatingActionButton).toBe("ui-floating-action-button");
    expect(ADAPTER_COMPONENT_TAG_MAP.ContextMenu).toBe("ui-context-menu");
    expect(ADAPTER_COMPONENT_TAG_MAP.Switcher).toBe("ui-switcher");
    expect(ADAPTER_COMPONENT_TAG_MAP.Sidebar).toBe("ui-sidebar");
    expect(ADAPTER_COMPONENT_TAG_MAP.Reel).toBe("ui-reel");
  });

  it("renders intrinsic layout wrappers as native tags", () => {
    const { host } = mount(() =>
      h(Switcher, { threshold: "sm" }, () => [
        h(Sidebar, { side: "start" }, () => "Sidebar"),
        h(Reel, { "item-width": "md" }, () => "Reel")
      ])
    );

    expect(host.querySelector("ui-switcher[threshold='sm']")).toBeTruthy();
    expect(host.querySelector("ui-sidebar[side='start']")).toBeTruthy();
    expect(host.querySelector("ui-reel[item-width='md']")).toBeTruthy();
  });

  it("renders wrappers with forwarded attrs and default slot content", () => {
    const { host } = mount(() =>
      h(Button, { variant: "solid", size: "sm" }, () => h("button", { type: "button" }, "Save page"))
    );

    const wrapper = host.querySelector("ui-button");
    const button = wrapper?.querySelector("button");

    expect(wrapper).toBeTruthy();
    expect(wrapper?.getAttribute("variant")).toBe("solid");
    expect(wrapper?.getAttribute("size")).toBe("sm");
    expect(wrapper?.getAttribute("data-allow-mismatch")).toBe("class");
    expect(button?.textContent).toBe("Save page");
  });

  it("lets consumers override the expected custom-element hydration mismatch", () => {
    const { host } = mount(() =>
      h(Button, { "data-allow-mismatch": "children" }, () => h("button", "Save page"))
    );

    expect(host.querySelector("ui-button")?.getAttribute("data-allow-mismatch")).toBe("children");
  });

  it("maps custom events to typed Vue callbacks", () => {
    const onSelect = vi.fn();
    const { host } = mount(() =>
      h(Menu, { onSelect }, () => [
        h(MenuItem, { value: "rename" }, () => "Rename"),
        h(MenuItem, { value: "delete" }, () => "Delete")
      ])
    );

    const menu = host.querySelector("ui-menu");
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

    const contextMenu = host.querySelector("ui-context-menu");
    expect(contextMenu).toBeTruthy();
    expect(contextMenu?.querySelector("ui-menu-item")?.textContent).toContain("Rename");

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

    expect(host.querySelector("ui-radio-group")).toBeTruthy();
    expect(host.querySelector("ui-radio")).toBeTruthy();
    expect(host.querySelector("ui-badge")?.textContent).toContain("Draft");
    expect(host.querySelector("ui-avatar")?.getAttribute("name")).toBe("Taylor Reed");
  });

  it("renders the floating action button wrapper as the native custom element", () => {
    const { host } = mount(() =>
      h(
        FloatingActionButton,
        { label: "Create new page", "mobile-only": true },
        () => h("svg", { viewBox: "0 0 24 24", "aria-hidden": "true" })
      )
    );

    const fab = host.querySelector("ui-floating-action-button");
    expect(fab).toBeTruthy();
    expect(fab?.getAttribute("label")).toBe("Create new page");
    expect(fab?.hasAttribute("mobile-only")).toBe(true);
  });
});
