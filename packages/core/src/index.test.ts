import { beforeEach, describe, expect, it } from "vitest";

import "./index";

describe("@ui/core primitives", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("toggles disclosure open state and aria/hidden sync", () => {
    document.body.innerHTML = `
      <ui-disclosure>
        <button type="button">Toggle</button>
        <div id="panel-a" hidden>Panel</div>
      </ui-disclosure>
    `;

    const disclosure = document.querySelector("ui-disclosure");
    const trigger = disclosure?.querySelector("button");
    const content = disclosure?.querySelector("#panel-a");

    expect(disclosure).toBeTruthy();
    expect(trigger).toBeTruthy();
    expect(content).toBeTruthy();
    expect(disclosure?.hasAttribute("open")).toBe(false);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(content?.hasAttribute("hidden")).toBe(true);

    trigger?.click();
    expect(disclosure?.hasAttribute("open")).toBe(true);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(content?.hasAttribute("hidden")).toBe(false);
  });

  it("supports tabs roving tabindex and arrow-key activation", () => {
    document.body.innerHTML = `
      <ui-tabs>
        <div role="tablist" aria-label="Sections">
          <button role="tab" id="tab-a" aria-controls="panel-a">A</button>
          <button role="tab" id="tab-b" aria-controls="panel-b">B</button>
        </div>
        <section role="tabpanel" id="panel-a" aria-labelledby="tab-a">Panel A</section>
        <section role="tabpanel" id="panel-b" aria-labelledby="tab-b" hidden>Panel B</section>
      </ui-tabs>
    `;

    const tabsRoot = document.querySelector("ui-tabs");
    const tabA = document.getElementById("tab-a");
    const tabB = document.getElementById("tab-b");
    const panelA = document.getElementById("panel-a");
    const panelB = document.getElementById("panel-b");

    expect(tabsRoot).toBeTruthy();
    expect(tabA?.getAttribute("aria-selected")).toBe("true");
    expect(tabB?.getAttribute("aria-selected")).toBe("false");
    expect(tabA?.tabIndex).toBe(0);
    expect(tabB?.tabIndex).toBe(-1);
    expect(panelA?.hidden).toBe(false);
    expect(panelB?.hidden).toBe(true);

    tabA?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));

    expect(tabsRoot?.getAttribute("value")).toBe("tab-b");
    expect(tabA?.getAttribute("aria-selected")).toBe("false");
    expect(tabB?.getAttribute("aria-selected")).toBe("true");
    expect(tabA?.tabIndex).toBe(-1);
    expect(tabB?.tabIndex).toBe(0);
    expect(panelA?.hidden).toBe(true);
    expect(panelB?.hidden).toBe(false);
  });

  it("emits menu select with stable value and trigger payload keys", () => {
    document.body.innerHTML = `
      <ui-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
        <ui-menu-item value="delete">Delete</ui-menu-item>
      </ui-menu>
    `;

    const menu = document.querySelector("ui-menu");
    const firstItem = menu?.querySelector("ui-menu-item");
    const events: Array<{ value: string; trigger: string }> = [];

    menu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      events.push(custom.detail);
    });

    firstItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    expect(events).toEqual([{ value: "edit", trigger: "keyboard" }]);
  });

  it("emits open/close contract payload for overlays", () => {
    const popover = document.createElement("ui-popover");
    document.body.append(popover);

    const events: Array<{ open: boolean; reason: string; trigger: string }> = [];
    popover.addEventListener("open", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      events.push(custom.detail);
    });
    popover.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      events.push(custom.detail);
    });

    const typedPopover = popover as HTMLElement & { open: boolean };
    typedPopover.open = true;
    typedPopover.open = false;

    expect(events).toEqual([
      { open: true, reason: "programmatic", trigger: "programmatic" },
      { open: false, reason: "programmatic", trigger: "programmatic" }
    ]);
  });

  it("wires form-field label, descriptions, and reflected state", () => {
    document.body.innerHTML = `
      <ui-form-field invalid required disabled>
        <label>Email</label>
        <input type="email" />
        <small data-slot="help">We never share your email.</small>
        <small data-slot="error">Email is required.</small>
      </ui-form-field>
    `;

    const field = document.querySelector("ui-form-field");
    const label = field?.querySelector("label");
    const input = field?.querySelector("input");
    const help = field?.querySelector<HTMLElement>('[data-slot="help"]');
    const error = field?.querySelector<HTMLElement>('[data-slot="error"]');

    expect(field).toBeTruthy();
    expect(label).toBeTruthy();
    expect(input).toBeTruthy();
    expect(help?.id.length).toBeGreaterThan(0);
    expect(error?.id.length).toBeGreaterThan(0);

    expect(input?.id.length).toBeGreaterThan(0);
    expect(label?.getAttribute("for")).toBe(input?.id);

    const describedBy = input?.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain(help?.id ?? "");
    expect(describedBy).toContain(error?.id ?? "");

    expect(input?.disabled).toBe(true);
    expect(input?.required).toBe(true);
    expect(input?.getAttribute("aria-invalid")).toBe("true");
  });

  it("reflects input wrapper properties to inner input element", () => {
    document.body.innerHTML = `
      <ui-input>
        <input type="text" />
      </ui-input>
    `;

    const wrapper = document.querySelector("ui-input") as HTMLElement & {
      value: string;
      defaultValue: string;
      disabled: boolean;
      readOnly: boolean;
      invalid: boolean;
    };
    const input = wrapper.querySelector("input");

    wrapper.value = "alpha";
    wrapper.defaultValue = "seed";
    wrapper.disabled = true;
    wrapper.readOnly = true;
    wrapper.invalid = true;

    expect(input).toBeTruthy();
    expect(input?.value).toBe("alpha");
    expect(input?.defaultValue).toBe("seed");
    expect(input?.disabled).toBe(true);
    expect(input?.readOnly).toBe(true);
    expect(input?.getAttribute("aria-invalid")).toBe("true");
  });

  it("propagates disabled state from ui-button to native button", () => {
    document.body.innerHTML = `
      <ui-button disabled>
        <button type="button">Save</button>
      </ui-button>
    `;

    const buttonWrapper = document.querySelector("ui-button") as HTMLElement & { disabled: boolean };
    const innerButton = buttonWrapper.querySelector("button");

    expect(innerButton).toBeTruthy();
    expect(innerButton?.disabled).toBe(true);

    buttonWrapper.disabled = false;
    expect(innerButton?.disabled).toBe(false);
  });
});
