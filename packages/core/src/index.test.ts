import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

const COMPONENT_TAGS = [
  "ui-affordance-scope",
  "ui-avatar",
  "ui-avatar-group",
  "ui-badge",
  "ui-button",
  "ui-checkbox",
  "ui-disclosure",
  "ui-floating-action-button",
  "ui-form-field",
  "ui-icon-button",
  "ui-input",
  "ui-context-menu",
  "ui-menu",
  "ui-menu-item",
  "ui-popover",
  "ui-radio",
  "ui-radio-group",
  "ui-select",
  "ui-switch",
  "ui-tabs",
  "ui-textarea",
  "ui-toast-region",
  "ui-tooltip"
] as const;

const flushStencil = async () => {
  for (let i = 0; i < 2; i += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  await Promise.resolve();
};

const render = async (markup: string) => {
  document.body.innerHTML = markup;
  await flushStencil();
};

const waitFor = async (predicate: () => boolean, label: string) => {
  for (let i = 0; i < 20; i += 1) {
    if (predicate()) {
      return;
    }
    await flushStencil();
  }

  throw new Error(`Timed out waiting for ${label}`);
};

describe("@threadlabs/looma-core primitives", () => {
  beforeAll(async () => {
    await Promise.all(COMPONENT_TAGS.map((tag) => customElements.whenDefined(tag)));
    await flushStencil();
  });

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(async () => {
    await flushStencil();
    document.body.innerHTML = "";
  });

  it("toggles disclosure open state and aria/hidden sync", async () => {
    await render(`
      <ui-disclosure>
        <button type="button">Toggle</button>
        <div id="panel-a" hidden>Panel</div>
      </ui-disclosure>
    `);

    const disclosure = document.querySelector("ui-disclosure");
    const trigger = disclosure?.querySelector("button");
    const content = disclosure?.querySelector("#panel-a");
    await waitFor(() => trigger?.getAttribute("aria-expanded") === "false", "disclosure initial state");

    expect(disclosure).toBeTruthy();
    expect(trigger).toBeTruthy();
    expect(content).toBeTruthy();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(content?.hasAttribute("hidden")).toBe(true);

    trigger?.click();
    await flushStencil();
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(content?.hasAttribute("hidden")).toBe(false);
  });

  it("coordinates overlapping anticipatory controls from one container", async () => {
    await render(`
      <ui-affordance-scope near-radius="24">
        <button id="near-a" data-ui-affordance>Add A</button>
        <button id="near-b" data-ui-affordance>Add B</button>
      </ui-affordance-scope>
    `);
    const scope = document.querySelector("ui-affordance-scope")!;
    const first = document.getElementById("near-a")!;
    const second = document.getElementById("near-b")!;
    first.getBoundingClientRect = () => new DOMRect(40, 40, 20, 20);
    second.getBoundingClientRect = () => new DOMRect(64, 40, 20, 20);
    (scope as HTMLElement & { nearRadius: number }).nearRadius = 25;
    await flushStencil();

    first.dispatchEvent(new MouseEvent("pointermove", {
      bubbles: true,
      clientX: 62,
      clientY: 50,
    }));
    await flushStencil();

    expect(first.getAttribute("data-ui-proximity")).toBe("near");
    expect(second.getAttribute("data-ui-proximity")).toBe("near");
    expect(scope.getAttribute("data-ui-interaction")).toBe("engaged");
  });

  it("supports tabs roving tabindex and arrow-key activation", async () => {
    await render(`
      <ui-tabs>
        <div role="tablist" aria-label="Sections">
          <button role="tab" id="tab-a" aria-controls="panel-a">A</button>
          <button role="tab" id="tab-b" aria-controls="panel-b">B</button>
        </div>
        <section role="tabpanel" id="panel-a" aria-labelledby="tab-a">Panel A</section>
        <section role="tabpanel" id="panel-b" aria-labelledby="tab-b" hidden>Panel B</section>
      </ui-tabs>
    `);

    const tabsRoot = document.querySelector("ui-tabs");
    const tabA = document.getElementById("tab-a");
    const tabB = document.getElementById("tab-b");
    const panelA = document.getElementById("panel-a");
    const panelB = document.getElementById("panel-b");
    await flushStencil();

    expect(tabsRoot).toBeTruthy();
    expect(tabA?.getAttribute("aria-selected")).toBe("true");
    expect(tabB?.getAttribute("aria-selected")).toBe("false");
    expect(tabA?.tabIndex).toBe(0);
    expect(tabB?.tabIndex).toBe(-1);
    expect(panelA?.hidden).toBe(false);
    expect(panelB?.hidden).toBe(true);

    tabA?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flushStencil();

    expect(tabA?.getAttribute("aria-selected")).toBe("false");
    expect(tabB?.getAttribute("aria-selected")).toBe("true");
    expect(tabA?.tabIndex).toBe(-1);
    expect(tabB?.tabIndex).toBe(0);
    expect(panelA?.hidden).toBe(true);
    expect(panelB?.hidden).toBe(false);
  });

  it("emits menu select with stable value and trigger payload keys", async () => {
    await render(`
      <ui-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
        <ui-menu-item value="delete">Delete</ui-menu-item>
      </ui-menu>
    `);

    const menu = document.querySelector("ui-menu");
    const firstItem = menu?.querySelector("ui-menu-item");
    const events: Array<{ value: string; trigger: string }> = [];

    menu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      events.push(custom.detail);
    });

    firstItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flushStencil();

    expect(events).toEqual([{ value: "edit", trigger: "keyboard" }]);
  });

  it("does not emit menu select for disabled menu items", async () => {
    await render(`
      <ui-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
        <ui-menu-item value="delete" disabled>Delete</ui-menu-item>
      </ui-menu>
    `);

    const menu = document.querySelector("ui-menu");
    const disabledItem = menu?.querySelector("ui-menu-item[value='delete']");
    const events: Array<{ value: string; trigger: string }> = [];

    menu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      events.push(custom.detail);
    });

    disabledItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    disabledItem?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushStencil();

    expect(events).toEqual([]);
  });

  it("emits open/close contract payload for overlays", async () => {
    const popover = document.createElement("ui-popover");
    document.body.append(popover);
    await flushStencil();

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
    await flushStencil();
    typedPopover.open = false;
    await flushStencil();

    expect(events).toEqual([
      { open: true, reason: "programmatic", trigger: "programmatic" },
      { open: false, reason: "programmatic", trigger: "programmatic" }
    ]);
  });

  it("wires form-field label, descriptions, and reflected state", async () => {
    await render(`
      <ui-form-field invalid required disabled>
        <label>Email</label>
        <input type="email" />
        <small data-slot="help">We never share your email.</small>
        <small data-slot="error">Email is required.</small>
      </ui-form-field>
    `);

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

  it("reflects input wrapper properties to inner input element", async () => {
    await render(`
      <ui-input>
        <input type="text" />
      </ui-input>
    `);

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
    await flushStencil();

    expect(input).toBeTruthy();
    expect(input?.value).toBe("alpha");
    expect(input?.defaultValue).toBe("seed");
    expect(input?.disabled).toBe(true);
    expect(input?.readOnly).toBe(true);
    expect(input?.getAttribute("aria-invalid")).toBe("true");
  });

  it("reflects select wrapper properties to inner select element", async () => {
    await render(`
      <ui-select>
        <select name="role">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
      </ui-select>
    `);

    const wrapper = document.querySelector("ui-select") as HTMLElement & {
      value: string;
      defaultValue: string;
      disabled: boolean;
      invalid: boolean;
      required: boolean;
    };
    const select = wrapper.querySelector("select");

    wrapper.value = "editor";
    wrapper.defaultValue = "viewer";
    wrapper.disabled = true;
    wrapper.invalid = true;
    wrapper.required = true;
    await flushStencil();

    expect(select).toBeTruthy();
    expect(select?.value).toBe("editor");
    expect(select?.disabled).toBe(true);
    expect(select?.required).toBe(true);
    expect(select?.getAttribute("aria-invalid")).toBe("true");
  });

  it("propagates disabled state from ui-button to native button", async () => {
    await render(`
      <ui-button disabled>
        <button type="button">Save</button>
      </ui-button>
    `);

    const buttonWrapper = document.querySelector("ui-button") as HTMLElement & { disabled: boolean };
    const innerButton = buttonWrapper.querySelector("button");

    expect(innerButton).toBeTruthy();
    expect(innerButton?.disabled).toBe(true);

    buttonWrapper.disabled = false;
    await flushStencil();
    expect(innerButton?.disabled).toBe(false);
  });

  it("exposes an explicit outline default and destructive button intent", async () => {
    await render(`
      <ui-button><button type="button">Cancel</button></ui-button>
      <ui-button variant="destructive"><button type="button">Delete workspace</button></ui-button>
    `);

    const wrappers = Array.from(document.querySelectorAll("ui-button"));
    expect(wrappers[0]?.getAttribute("variant")).toBeNull();
    expect(wrappers[0]?.dataset.variant).toBeUndefined();
    expect(wrappers[1]?.getAttribute("variant")).toBe("destructive");
    expect(wrappers[1]?.dataset.variant).toBeUndefined();
  });

  it("wires floating action button label and disabled state to the inner button", async () => {
    await render(`
      <ui-floating-action-button label="Create new page" mobile-only disabled>
        <svg aria-hidden="true" viewBox="0 0 24 24"></svg>
      </ui-floating-action-button>
    `);

    const wrapper = document.querySelector("ui-floating-action-button") as HTMLElement & {
      disabled: boolean;
    };
    const button = wrapper.shadowRoot?.querySelector("button");

    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("mobile-only")).not.toBeNull();
    expect(button?.getAttribute("aria-label")).toBe("Create new page");
    expect(button?.disabled).toBe(true);

    wrapper.disabled = false;
    await flushStencil();
    expect(button?.disabled).toBe(false);
  });

  it("wires icon button label and disabled state to the inner button", async () => {
    await render(`
      <ui-icon-button label="Search" variant="outline" size="lg" disabled>
        <svg aria-hidden="true" viewBox="0 0 24 24"></svg>
      </ui-icon-button>
    `);

    const wrapper = document.querySelector("ui-icon-button") as HTMLElement & {
      disabled: boolean;
    };
    const button = wrapper.shadowRoot?.querySelector("button");

    expect(wrapper.getAttribute("variant")).toBe("outline");
    expect(wrapper.getAttribute("size")).toBe("lg");
    expect(button?.getAttribute("aria-label")).toBe("Search");
    expect(button?.disabled).toBe(true);

    wrapper.disabled = false;
    await flushStencil();
    expect(button?.disabled).toBe(false);
  });

  it("syncs textarea value, rows, and invalid state to the inner textarea", async () => {
    await render(`
      <ui-textarea value="Initial copy" rows="6" invalid>
        <textarea name="notes"></textarea>
      </ui-textarea>
    `);

    const wrapper = document.querySelector("ui-textarea") as HTMLElement & {
      value: string;
      rows: number;
      invalid: boolean;
    };
    const textarea = wrapper.querySelector("textarea");

    expect(textarea?.value).toBe("Initial copy");
    expect(textarea?.rows).toBe(6);
    expect(textarea?.getAttribute("aria-invalid")).toBe("true");

    wrapper.value = "Updated copy";
    wrapper.rows = 3;
    wrapper.invalid = false;
    await flushStencil();

    expect(textarea?.value).toBe("Updated copy");
    expect(textarea?.rows).toBe(3);
    expect(textarea?.getAttribute("aria-invalid")).toBe("false");
  });

  it("opens and closes tooltip from trigger interactions", async () => {
    await render(`
      <button id="tooltip-trigger" type="button">Info</button>
      <ui-tooltip for="tooltip-trigger">Tooltip copy</ui-tooltip>
    `);

    const trigger = document.getElementById("tooltip-trigger");
    const tooltip = document.querySelector("ui-tooltip") as HTMLElement & { open: boolean };
    const events: Array<{ open: boolean; reason: string; trigger: string }> = [];
    tooltip.addEventListener("open", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      events.push(custom.detail);
    });
    tooltip.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      events.push(custom.detail);
    });

    trigger?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    await flushStencil();
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.hasAttribute("data-open")).toBe(true);
    trigger?.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await flushStencil();
    expect(tooltip.hidden).toBe(true);
    expect(tooltip.hasAttribute("data-open")).toBe(false);
    expect(events).toEqual([
      { open: true, reason: "action", trigger: "pointer" },
      { open: false, reason: "action", trigger: "pointer" }
    ]);
  });

  it("supports tooltip focus open and escape close with focus return", async () => {
    await render(`
      <button id="focus-trigger" type="button">Focus me</button>
      <ui-tooltip for="focus-trigger">Focus tooltip copy</ui-tooltip>
      <button id="after-trigger" type="button">After</button>
    `);

    const trigger = document.getElementById("focus-trigger") as HTMLButtonElement;
    const tooltip = document.querySelector("ui-tooltip") as HTMLElement & { open: boolean };

    trigger.focus();
    trigger.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await flushStencil();
    expect(tooltip.hidden).toBe(false);

    tooltip.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushStencil();
    expect(tooltip.hidden).toBe(true);
    expect(document.activeElement).toBe(trigger);
  });

  it("manages toast region visibility and dismiss events", async () => {
    await render(`
      <ui-toast-region>
        <div id="toast-a" data-ui-toast>
          Saved
          <button type="button" data-ui-toast-dismiss>Dismiss</button>
        </div>
      </ui-toast-region>
    `);

    const region = document.querySelector("ui-toast-region") as HTMLElement;
    const dismissButton = region.querySelector("[data-ui-toast-dismiss]") as HTMLButtonElement;
    const dismissed: Array<{ id: string; reason: string; trigger: string }> = [];
    region.addEventListener("dismiss", (event) => {
      const custom = event as CustomEvent<{ id: string; reason: string; trigger: string }>;
      dismissed.push(custom.detail);
    });
    await waitFor(() => region.hasAttribute("data-open"), "toast region open state");

    expect(region.hasAttribute("data-open")).toBe(true);
    dismissButton.click();
    await flushStencil();
    expect(region.hasAttribute("data-open")).toBe(false);
    expect(region.querySelector("[data-ui-toast]")).toBeNull();
    expect(dismissed).toEqual([{ id: "toast-a", reason: "action", trigger: "pointer" }]);
  });

  it("keeps toast region open until last toast is dismissed", async () => {
    await render(`
      <ui-toast-region>
        <div id="toast-1" data-ui-toast>
          First
          <button type="button" data-ui-toast-dismiss aria-label="Dismiss first">Dismiss</button>
        </div>
        <div id="toast-2" data-ui-toast>
          Second
          <button type="button" data-ui-toast-dismiss aria-label="Dismiss second">Dismiss</button>
        </div>
      </ui-toast-region>
    `);

    const region = document.querySelector("ui-toast-region") as HTMLElement;
    const dismissButtons = Array.from(
      region.querySelectorAll<HTMLButtonElement>("[data-ui-toast-dismiss]")
    );
    const dismissedIds: string[] = [];

    region.addEventListener("dismiss", (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      dismissedIds.push((event.detail as { id: string }).id);
    });

    expect(region.hasAttribute("data-open")).toBe(true);

    dismissButtons[0]?.click();
    await flushStencil();
    expect(region.hasAttribute("data-open")).toBe(true);
    expect(region.querySelectorAll("[data-ui-toast]").length).toBe(1);

    dismissButtons[1]?.click();
    await flushStencil();
    expect(region.hasAttribute("data-open")).toBe(false);
    expect(region.querySelectorAll("[data-ui-toast]").length).toBe(0);
    expect(dismissedIds).toEqual(["toast-1", "toast-2"]);
  });

  it("syncs ui-checkbox checked state and emits change detail", async () => {
    await render(`
      <ui-checkbox value="newsletter">
        <input type="checkbox" />
      </ui-checkbox>
    `);

    const checkbox = document.querySelector("ui-checkbox") as HTMLElement & { value: string };
    const input = checkbox.querySelector("input");
    const events: Array<{ checked: boolean; value: string; trigger: string }> = [];
    checkbox.addEventListener("change", (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      events.push(event.detail as { checked: boolean; value: string; trigger: string });
    });

    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    input?.click();
    await flushStencil();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    expect(input?.checked).toBe(true);
    expect(events).toEqual([{ checked: true, value: "newsletter", trigger: "programmatic" }]);
  });

  it("supports fallback switch keyboard toggle and emits change", async () => {
    await render(`<ui-switch value="notifications"></ui-switch>`);

    const toggle = document.querySelector("ui-switch") as HTMLElement;
    const events: Array<{ checked: boolean; value: string; trigger: string }> = [];
    toggle.addEventListener("change", (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      events.push(event.detail as { checked: boolean; value: string; trigger: string });
    });

    toggle.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    await flushStencil();

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.getAttribute("role")).toBe("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(events).toEqual([{ checked: true, value: "notifications", trigger: "keyboard" }]);
  });

  it("emits radio-group select/change details and syncs checked state", async () => {
    await render(`
      <ui-radio-group value="alpha" orientation="horizontal" name="plan">
        <ui-radio value="alpha">Alpha</ui-radio>
        <ui-radio value="beta">Beta</ui-radio>
      </ui-radio-group>
    `);
    await flushStencil();

    const group = document.querySelector("ui-radio-group") as HTMLElement & { value: string };
    const radios = Array.from(group.querySelectorAll("ui-radio")) as Array<HTMLElement & { checked: boolean }>;
    const selectedEvents: Array<{ value: string; previousValue?: string; trigger: string }> = [];
    const changeEvents: Array<{ checked: boolean; value: string; trigger: string }> = [];

    group.addEventListener("select", (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      selectedEvents.push(event.detail as { value: string; previousValue?: string; trigger: string });
    });
    group.addEventListener("change", (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }
      changeEvents.push(event.detail as { checked: boolean; value: string; trigger: string });
    });

    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    expect(radios[1]?.getAttribute("aria-checked")).toBe("false");

    radios[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flushStencil();
    expect(radios[0]?.getAttribute("aria-checked")).toBe("false");
    expect(radios[1]?.getAttribute("aria-checked")).toBe("true");
    expect(selectedEvents.at(-1)).toEqual({ value: "beta", previousValue: "alpha", trigger: "keyboard" });
    expect(changeEvents.at(-1)).toEqual({ checked: true, value: "beta", trigger: "keyboard" });
  });

  it("syncs ui-badge styling hooks from variant and tone", async () => {
    await render(`<ui-badge variant="subtle" tone="accent">New</ui-badge>`);

    const badge = document.querySelector("ui-badge") as HTMLElement & { variant: string; tone: string };

    expect(badge.getAttribute("data-variant")).toBe("subtle");
    expect(badge.getAttribute("data-tone")).toBe("accent");

    badge.variant = "solid";
    badge.tone = "";
    await flushStencil();

    expect(badge.getAttribute("data-variant")).toBe("solid");
    expect(badge.hasAttribute("data-tone")).toBe(false);
  });

  it("shows avatar fallback initials when image fails", async () => {
    await render(`
      <ui-avatar name="Alex Morgan" src="/broken.png">
        <img />
      </ui-avatar>
    `);

    const avatar = document.querySelector("ui-avatar") as HTMLElement;
    const image = avatar.shadowRoot?.querySelector("img") as HTMLImageElement | null;
    const fallback = avatar.shadowRoot?.querySelector(".fallback") as HTMLElement | null;

    expect(fallback?.textContent).toBe("AM");

    image?.dispatchEvent(new Event("error"));
    await flushStencil();

    expect(image?.hidden).toBe(true);
    expect(fallback?.hidden).toBe(false);
    expect(avatar.getAttribute("data-has-image")).toBeNull();
  });

  it("avatar-group shows first max children and overflow pill", async () => {
    await render(`
      <ui-avatar-group max="3" label="People">
        <ui-avatar name="A"><span data-ui-avatar-fallback></span></ui-avatar>
        <ui-avatar name="B"><span data-ui-avatar-fallback></span></ui-avatar>
        <ui-avatar name="C"><span data-ui-avatar-fallback></span></ui-avatar>
        <ui-avatar name="D"><span data-ui-avatar-fallback></span></ui-avatar>
      </ui-avatar-group>
    `);

    const group = document.querySelector("ui-avatar-group") as HTMLElement;
    const overflow = group.shadowRoot?.querySelector("[data-ui-avatar-group-overflow]");
    const avatars = Array.from(group.querySelectorAll("ui-avatar"));

    expect(group.getAttribute("role")).toBe("list");
    expect(group.getAttribute("aria-label")).toBe("People");
    expect(avatars.length).toBe(4);
    expect(avatars[0].hidden).toBe(false);
    expect(avatars[1].hidden).toBe(false);
    expect(avatars[2].hidden).toBe(false);
    expect(avatars[3].hidden).toBe(true);
    expect(overflow).toBeTruthy();
    expect(overflow?.textContent).toBe("+1");
  });

  it("opens context menu on right-click and emits select/close on item activation", async () => {
    await render(`
      <div id="context-menu-target" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="edit">Edit</ui-menu-item>
        <ui-menu-item value="delete">Delete</ui-menu-item>
      </ui-context-menu>
    `);

    const target = document.getElementById("context-menu-target");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement & { open: boolean };
    // ui-menu is inside ui-context-menu's shadow DOM; ui-menu-item children are slotted light DOM
    const firstItem = contextMenu?.querySelector("ui-menu-item");
    const selectEvents: Array<{ value: string; trigger: string }> = [];
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      selectEvents.push(custom.detail);
    });
    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    // Right-click the target to open the context menu
    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();

    expect(contextMenu?.getAttribute("data-open")).toBe("");
    expect(selectEvents).toEqual([]);
    expect(closeEvents).toEqual([]);

    // Activate the first menu item via keyboard
    // Dispatch on the ui-menu-item in the light DOM; the event bubbles through
    // the shadow boundary to ui-menu's keydown handler inside the shadow DOM
    firstItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    await flushStencil();

    expect(selectEvents).toEqual([{ value: "edit", trigger: "keyboard" }]);
    expect(closeEvents.length).toBeGreaterThanOrEqual(1);
    expect(closeEvents[0].open).toBe(false);
  });

  it("does not select or close from disabled context menu items", async () => {
    await render(`
      <div id="disabled-context-target" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="delete" disabled>Delete</ui-menu-item>
      </ui-context-menu>
    `);

    const target = document.getElementById("disabled-context-target");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement;
    const disabledItem = contextMenu?.querySelector("ui-menu-item");
    const selectEvents: Array<{ value: string; trigger: string }> = [];
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("select", (event) => {
      const custom = event as CustomEvent<{ value: string; trigger: string }>;
      selectEvents.push(custom.detail);
    });
    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();
    expect(contextMenu?.getAttribute("data-open")).toBe("");

    disabledItem?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }));
    disabledItem?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await flushStencil();

    expect(selectEvents).toEqual([]);
    expect(closeEvents).toEqual([]);
    expect(contextMenu?.getAttribute("data-open")).toBe("");
  });

  it("closes context menu on Escape key", async () => {
    await render(`
      <div id="escape-target" style="width:200px;height:100px;background:#eee;">
        Right-click me
      </div>
      <ui-context-menu>
        <ui-menu-item value="rename">Rename</ui-menu-item>
      </ui-context-menu>
    `);

    const target = document.getElementById("escape-target");
    const contextMenu = document.querySelector("ui-context-menu") as HTMLElement & { open: boolean };
    const closeEvents: Array<{ open: boolean; reason: string; trigger: string }> = [];

    contextMenu?.addEventListener("close", (event) => {
      const custom = event as CustomEvent<{ open: boolean; reason: string; trigger: string }>;
      closeEvents.push(custom.detail);
    });

    // Open via right-click
    target?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 100, clientY: 50 }));
    await flushStencil();
    expect(contextMenu?.getAttribute("data-open")).toBe("");

    // Close via Escape
    contextMenu?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushStencil();

    expect(closeEvents.length).toBeGreaterThanOrEqual(1);
    expect(closeEvents[0].open).toBe(false);
    expect(closeEvents[0].reason).toBe("escape");
  });
});
