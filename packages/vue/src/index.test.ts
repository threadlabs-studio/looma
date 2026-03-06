import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, type App } from "vue";

import {
  ADAPTER_COMPONENT_TAG_MAP,
  Avatar,
  Badge,
  Button,
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

describe("@looma/vue adapter", () => {
  it("includes parity exports for radio, badge, and avatar tags", () => {
    expect(ADAPTER_COMPONENT_TAG_MAP.RadioGroup).toBe("ui-radio-group");
    expect(ADAPTER_COMPONENT_TAG_MAP.Radio).toBe("ui-radio");
    expect(ADAPTER_COMPONENT_TAG_MAP.Badge).toBe("ui-badge");
    expect(ADAPTER_COMPONENT_TAG_MAP.Avatar).toBe("ui-avatar");
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
    expect(button?.textContent).toBe("Save page");
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
});
