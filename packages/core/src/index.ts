import "./styles.css";
import {
  closeOverlay,
  openOverlay,
  type OverlayCloseReason,
  type OverlayTrigger
} from "./overlay/manager";

export * from "./overlay/manager";

type PrimitiveTrigger = OverlayTrigger;
type PrimitiveReason = OverlayCloseReason;

interface OpenCloseDetail {
  open: boolean;
  reason: PrimitiveReason;
  trigger: PrimitiveTrigger;
}

interface SelectDetail {
  value: string;
  previousValue?: string;
  trigger: PrimitiveTrigger;
}

interface OpenAction {
  reason: PrimitiveReason;
  trigger: PrimitiveTrigger;
}

interface NativePopoverElement extends HTMLElement {
  showPopover(): void;
  hidePopover(): void;
}

const OPEN_ATTRIBUTE = "open";
const DEFAULT_OPEN_ATTRIBUTE = "default-open";
const ORIENTATION_VERTICAL = "vertical";
const randomIdPrefix = "ui-core";

let nextId = 0;

function createId(prefix: string): string {
  nextId += 1;
  return `${randomIdPrefix}-${prefix}-${nextId}`;
}

function dispatchPrimitiveEvent<T>(element: HTMLElement, name: string, detail: T): void {
  element.dispatchEvent(
    new CustomEvent<T>(name, {
      detail,
      bubbles: true,
      composed: true
    })
  );
}

function eventToTrigger(event: Event): PrimitiveTrigger {
  if (event instanceof KeyboardEvent) {
    return "keyboard";
  }
  if (event instanceof PointerEvent || event instanceof MouseEvent) {
    return "pointer";
  }
  return "programmatic";
}

function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

function normalizeOrientation(value: string | null): "horizontal" | "vertical" {
  return value === ORIENTATION_VERTICAL ? ORIENTATION_VERTICAL : "horizontal";
}

function isPopoverCapable(element: HTMLElement): boolean {
  return "showPopover" in element && "hidePopover" in element;
}

class UIPrimitiveElement extends HTMLElement {
  protected getBooleanAttribute(name: string): boolean {
    return this.hasAttribute(name);
  }

  protected setBooleanAttribute(name: string, value: boolean): void {
    if (value) {
      this.setAttribute(name, "");
      return;
    }
    this.removeAttribute(name);
  }

  protected getStringAttribute(name: string): string {
    return this.getAttribute(name) ?? "";
  }

  protected setStringAttribute(name: string, value: string): void {
    const normalized = value.trim();
    if (normalized.length === 0) {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, normalized);
  }
}

class UIDisclosureElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return [OPEN_ATTRIBUTE, "disabled"];
  }

  #trigger: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #initialized = false;
  #pendingAction: OpenAction | null = null;

  connectedCallback(): void {
    this.resolveParts();
    this.attachListeners();
    if (!this.hasAttribute(OPEN_ATTRIBUTE) && this.defaultOpen) {
      this.setAttribute(OPEN_ATTRIBUTE, "");
    }
    this.syncState();
    this.#initialized = true;
  }

  disconnectedCallback(): void {
    this.detachListeners();
  }

  get open(): boolean {
    return this.getBooleanAttribute(OPEN_ATTRIBUTE);
  }

  set open(value: boolean) {
    this.setOpen(value, { reason: "programmatic", trigger: "programmatic" });
  }

  get defaultOpen(): boolean {
    return this.getBooleanAttribute(DEFAULT_OPEN_ATTRIBUTE);
  }

  set defaultOpen(value: boolean) {
    this.setBooleanAttribute(DEFAULT_OPEN_ATTRIBUTE, value);
  }

  get disabled(): boolean {
    return this.getBooleanAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.setBooleanAttribute("disabled", value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "disabled" && oldValue !== newValue) {
      this.syncState();
      return;
    }

    if (name !== OPEN_ATTRIBUTE || oldValue === newValue) {
      return;
    }

    const detail: OpenAction = this.#pendingAction ?? {
      reason: "programmatic",
      trigger: "programmatic"
    };
    this.#pendingAction = null;

    this.syncState();

    if (!this.#initialized) {
      return;
    }

    dispatchPrimitiveEvent<OpenCloseDetail>(this, this.open ? "open" : "close", {
      open: this.open,
      reason: detail.reason,
      trigger: detail.trigger
    });
  }

  private attachListeners(): void {
    this.#trigger?.addEventListener("click", this.onTriggerClick);
    this.#trigger?.addEventListener("keydown", this.onTriggerKeydown);
  }

  private detachListeners(): void {
    this.#trigger?.removeEventListener("click", this.onTriggerClick);
    this.#trigger?.removeEventListener("keydown", this.onTriggerKeydown);
  }

  private resolveParts(): void {
    this.detachListeners();

    this.#trigger = this.querySelector<HTMLElement>(
      "[data-ui-disclosure-trigger], button, [aria-controls]"
    );

    const controlsId = this.#trigger?.getAttribute("aria-controls") ?? "";
    if (controlsId.length > 0) {
      this.#content = this.ownerDocument?.getElementById(controlsId);
    } else {
      const contentCandidate = Array.from(this.children).find(
        (child) => child !== this.#trigger
      );
      this.#content = contentCandidate instanceof HTMLElement ? contentCandidate : null;
    }

    if (this.#trigger && this.#content) {
      if (!this.#content.id) {
        this.#content.id = createId("disclosure-content");
      }
      this.#trigger.setAttribute("aria-controls", this.#content.id);
    }
  }

  private syncState(): void {
    if (this.#trigger instanceof HTMLButtonElement) {
      this.#trigger.disabled = this.disabled;
    } else if (this.#trigger) {
      this.#trigger.setAttribute("aria-disabled", String(this.disabled));
    }

    if (this.#trigger) {
      this.#trigger.setAttribute("aria-expanded", String(this.open));
    }
    if (this.#content) {
      this.#content.hidden = !this.open;
    }
  }

  private setOpen(next: boolean, action: OpenAction): void {
    if (this.open === next) {
      this.syncState();
      return;
    }
    this.#pendingAction = action;
    this.setBooleanAttribute(OPEN_ATTRIBUTE, next);
  }

  private onTriggerClick = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    this.setOpen(!this.open, { reason: "action", trigger: eventToTrigger(event) });
  };

  private onTriggerKeydown = (event: KeyboardEvent): void => {
    if (this.disabled || !isActivationKey(event)) {
      return;
    }
    event.preventDefault();
    this.setOpen(!this.open, { reason: "action", trigger: "keyboard" });
  };
}

class UITabsElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return ["value", "orientation"];
  }

  #initialized = false;
  #pendingSelect: { trigger: PrimitiveTrigger; previousValue?: string } | null = null;

  connectedCallback(): void {
    this.ensureTabIds();
    this.syncInitialValue();
    this.syncSelection();
    this.addEventListener("click", this.onClick);
    this.addEventListener("keydown", this.onKeydown);
    this.#initialized = true;
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
    this.removeEventListener("keydown", this.onKeydown);
  }

  get value(): string {
    return this.getStringAttribute("value");
  }

  set value(next: string) {
    this.activateValue(next, { trigger: "programmatic" });
  }

  get defaultValue(): string {
    return this.getStringAttribute("default-value");
  }

  set defaultValue(value: string) {
    this.setStringAttribute("default-value", value);
  }

  get orientation(): "horizontal" | "vertical" {
    return normalizeOrientation(this.getAttribute("orientation"));
  }

  set orientation(value: "horizontal" | "vertical") {
    this.setStringAttribute("orientation", normalizeOrientation(value));
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === "orientation") {
      this.syncTablistOrientation();
      return;
    }

    this.syncSelection();
    if (!this.#initialized) {
      return;
    }

    const pending = this.#pendingSelect ?? { trigger: "programmatic" };
    this.#pendingSelect = null;

    const detail: SelectDetail = {
      value: this.value,
      trigger: pending.trigger
    };
    if (pending.previousValue) {
      detail.previousValue = pending.previousValue;
    }
    dispatchPrimitiveEvent<SelectDetail>(this, "select", detail);
  }

  private getTabs(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('[role="tab"]'));
  }

  private getPanels(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  }

  private syncInitialValue(): void {
    const tabs = this.getTabs();
    if (tabs.length === 0) {
      return;
    }

    if (!this.hasAttribute("value")) {
      const fromDefault = tabs.find((tab) => tab.id === this.defaultValue);
      const fromAria = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
      const firstTab = tabs[0];
      if (!firstTab) {
        return;
      }
      const selected = fromDefault ?? fromAria ?? firstTab;
      this.setAttribute("value", selected.id);
    }

    this.syncTablistOrientation();
  }

  private syncTablistOrientation(): void {
    const tablist = this.querySelector<HTMLElement>('[role="tablist"]');
    if (tablist) {
      tablist.setAttribute("aria-orientation", this.orientation);
    }
  }

  private ensureTabIds(): void {
    const tabs = this.getTabs();
    for (const tab of tabs) {
      if (!tab.id) {
        tab.id = createId("tab");
      }
    }
  }

  private syncSelection(): void {
    const tabs = this.getTabs();
    if (tabs.length === 0) {
      return;
    }

    const firstTab = tabs[0];
    if (!firstTab) {
      return;
    }

    const selectedTab = tabs.find((tab) => tab.id === this.value) ?? firstTab;
    if (selectedTab.id !== this.value) {
      this.setAttribute("value", selectedTab.id);
      return;
    }

    for (const tab of tabs) {
      const selected = tab === selectedTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    const selectedPanelId = selectedTab.getAttribute("aria-controls") ?? "";
    for (const panel of this.getPanels()) {
      panel.hidden = panel.id !== selectedPanelId;
    }
  }

  private activateValue(nextValue: string, action: { trigger: PrimitiveTrigger }): void {
    const tabs = this.getTabs();
    const nextTab = tabs.find((tab) => tab.id === nextValue);
    if (!nextTab) {
      return;
    }
    const previousValue = this.value;
    if (previousValue === nextTab.id) {
      this.syncSelection();
      return;
    }
    this.#pendingSelect = { trigger: action.trigger };
    if (previousValue.length > 0) {
      this.#pendingSelect.previousValue = previousValue;
    }
    this.setAttribute("value", nextTab.id);
  }

  private activateTab(tab: HTMLElement, trigger: PrimitiveTrigger, focusTab: boolean): void {
    this.activateValue(tab.id, { trigger });
    if (focusTab) {
      tab.focus();
    }
  }

  private getNavigableTabs(): HTMLElement[] {
    return this.getTabs().filter((tab) => tab.getAttribute("aria-disabled") !== "true");
  }

  private onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const tab = target.closest('[role="tab"]');
    if (!(tab instanceof HTMLElement)) {
      return;
    }
    this.activateTab(tab, eventToTrigger(event), false);
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const currentTab = target.closest('[role="tab"]');
    if (!(currentTab instanceof HTMLElement)) {
      return;
    }

    const tabs = this.getNavigableTabs();
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < 0) {
      return;
    }

    let nextTab: HTMLElement | undefined;
    const horizontal = this.orientation === "horizontal";

    if ((horizontal && event.key === "ArrowRight") || (!horizontal && event.key === "ArrowDown")) {
      nextTab = tabs[(currentIndex + 1) % tabs.length];
    } else if (
      (horizontal && event.key === "ArrowLeft") ||
      (!horizontal && event.key === "ArrowUp")
    ) {
      nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
    } else if (event.key === "Home") {
      [nextTab] = tabs;
    } else if (event.key === "End") {
      nextTab = tabs.at(-1);
    } else if (isActivationKey(event)) {
      event.preventDefault();
      this.activateTab(currentTab, "keyboard", false);
      return;
    } else {
      return;
    }

    if (!nextTab) {
      return;
    }

    event.preventDefault();
    this.activateTab(nextTab, "keyboard", true);
  };
}

class UIMenuItemElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return ["disabled"];
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "menuitem");
    }
    if (!this.hasAttribute("tabindex")) {
      this.tabIndex = -1;
    }
    this.syncDisabledState();
  }

  get disabled(): boolean {
    return this.getBooleanAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.setBooleanAttribute("disabled", value);
  }

  get value(): string {
    return this.getAttribute("value") ?? this.textContent?.trim() ?? "";
  }

  set value(next: string) {
    this.setStringAttribute("value", next);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name === "disabled" && oldValue !== newValue) {
      this.syncDisabledState();
    }
  }

  private syncDisabledState(): void {
    this.setAttribute("aria-disabled", String(this.disabled));
    if (this.disabled) {
      this.tabIndex = -1;
    }
  }
}

class UIMenuElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return [OPEN_ATTRIBUTE];
  }

  #initialized = false;

  connectedCallback(): void {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "menu");
    }
    this.syncItems();
    this.addEventListener("keydown", this.onKeydown);
    this.addEventListener("click", this.onClick);
    this.#initialized = true;
  }

  disconnectedCallback(): void {
    this.removeEventListener("keydown", this.onKeydown);
    this.removeEventListener("click", this.onClick);
  }

  get open(): boolean {
    return this.getBooleanAttribute(OPEN_ATTRIBUTE);
  }

  set open(value: boolean) {
    this.setBooleanAttribute(OPEN_ATTRIBUTE, value);
  }

  get defaultOpen(): boolean {
    return this.getBooleanAttribute(DEFAULT_OPEN_ATTRIBUTE);
  }

  set defaultOpen(value: boolean) {
    this.setBooleanAttribute(DEFAULT_OPEN_ATTRIBUTE, value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name !== OPEN_ATTRIBUTE || oldValue === newValue || !this.#initialized) {
      return;
    }
    dispatchPrimitiveEvent<OpenCloseDetail>(this, this.open ? "open" : "close", {
      open: this.open,
      reason: "programmatic",
      trigger: "programmatic"
    });
  }

  private getItems(): UIMenuItemElement[] {
    return Array.from(this.querySelectorAll<UIMenuItemElement>("ui-menu-item"));
  }

  private getEnabledItems(): UIMenuItemElement[] {
    return this.getItems().filter((item) => !item.disabled);
  }

  private syncItems(): void {
    const enabledItems = this.getEnabledItems();
    const currentFocusable =
      enabledItems.find((item) => item.tabIndex === 0) ?? enabledItems[0] ?? null;

    for (const item of this.getItems()) {
      if (item.disabled) {
        item.tabIndex = -1;
      } else {
        item.tabIndex = item === currentFocusable ? 0 : -1;
      }
    }
  }

  private focusItem(item: UIMenuItemElement): void {
    if (item.disabled) {
      return;
    }
    for (const candidate of this.getItems()) {
      candidate.tabIndex = candidate === item ? 0 : -1;
    }
    item.focus();
  }

  private selectItem(item: UIMenuItemElement, trigger: PrimitiveTrigger): void {
    if (item.disabled) {
      return;
    }
    this.focusItem(item);
    dispatchPrimitiveEvent<SelectDetail>(this, "select", {
      value: item.value,
      trigger
    });
  }

  private onClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const item = target.closest("ui-menu-item");
    if (!(item instanceof UIMenuItemElement)) {
      return;
    }
    this.selectItem(item, eventToTrigger(event));
  };

  private onKeydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const activeItem = target.closest("ui-menu-item");
    if (!(activeItem instanceof UIMenuItemElement)) {
      return;
    }

    const items = this.getEnabledItems();
    const currentIndex = items.indexOf(activeItem);
    if (currentIndex < 0) {
      return;
    }

    let nextItem: UIMenuItemElement | undefined;
    if (event.key === "ArrowDown") {
      nextItem = items[(currentIndex + 1) % items.length];
    } else if (event.key === "ArrowUp") {
      nextItem = items[(currentIndex - 1 + items.length) % items.length];
    } else if (event.key === "Home") {
      [nextItem] = items;
    } else if (event.key === "End") {
      nextItem = items.at(-1);
    } else if (isActivationKey(event)) {
      event.preventDefault();
      this.selectItem(activeItem, "keyboard");
      return;
    } else {
      return;
    }

    if (!nextItem) {
      return;
    }

    event.preventDefault();
    this.focusItem(nextItem);
  };
}

class UIOverlayElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return [OPEN_ATTRIBUTE];
  }

  protected readonly overlayId = createId("overlay");
  protected initialized = false;
  protected pendingAction: OpenAction | null = null;
  protected overlayRegistered = false;

  connectedCallback(): void {
    if (!this.hasAttribute(OPEN_ATTRIBUTE) && this.defaultOpen) {
      this.setAttribute(OPEN_ATTRIBUTE, "");
    }
    this.syncOpenState();
    this.initialized = true;
  }

  disconnectedCallback(): void {
    this.unregisterOverlay();
  }

  get open(): boolean {
    return this.getBooleanAttribute(OPEN_ATTRIBUTE);
  }

  set open(value: boolean) {
    this.setOpen(value, { reason: "programmatic", trigger: "programmatic" });
  }

  get defaultOpen(): boolean {
    return this.getBooleanAttribute(DEFAULT_OPEN_ATTRIBUTE);
  }

  set defaultOpen(value: boolean) {
    this.setBooleanAttribute(DEFAULT_OPEN_ATTRIBUTE, value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (name !== OPEN_ATTRIBUTE || oldValue === newValue) {
      return;
    }

    const action = this.pendingAction ?? {
      reason: "programmatic",
      trigger: "programmatic"
    };
    this.pendingAction = null;

    this.syncOpenState();

    if (!this.initialized) {
      return;
    }

    dispatchPrimitiveEvent<OpenCloseDetail>(this, this.open ? "open" : "close", {
      open: this.open,
      reason: action.reason,
      trigger: action.trigger
    });
  }

  protected setOpen(next: boolean, action: OpenAction): void {
    if (this.open === next) {
      this.syncOpenState();
      return;
    }
    this.pendingAction = action;
    this.setBooleanAttribute(OPEN_ATTRIBUTE, next);
  }

  protected registerOverlay(modal: boolean, dismissible: boolean): void {
    if (this.overlayRegistered) {
      return;
    }
    openOverlay({
      id: this.overlayId,
      modal,
      dismissible,
      element: this,
      requestClose: (reason, trigger) => {
        this.setOpen(false, { reason, trigger });
      }
    });
    this.overlayRegistered = true;
  }

  protected unregisterOverlay(): void {
    if (!this.overlayRegistered) {
      return;
    }
    closeOverlay(this.overlayId);
    this.overlayRegistered = false;
  }

  protected syncOpenState(): void {
    if (this.open) {
      this.registerOverlay(this.isModal(), this.isDismissible());
      this.onOpen();
    } else {
      this.onClose();
      this.unregisterOverlay();
    }
  }

  protected isDismissible(): boolean {
    return true;
  }

  protected isModal(): boolean {
    return false;
  }

  protected onOpen(): void {}

  protected onClose(): void {}
}

class UIDialogElement extends UIOverlayElement {
  static get observedAttributes(): string[] {
    return [OPEN_ATTRIBUTE, "modal"];
  }

  #dialog: HTMLDialogElement | null = null;
  #syncingNativeClose = false;

  connectedCallback(): void {
    this.#dialog = this.querySelector("dialog");
    this.#dialog?.addEventListener("cancel", this.onNativeCancel);
    this.#dialog?.addEventListener("close", this.onNativeClose);
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    this.#dialog?.removeEventListener("cancel", this.onNativeCancel);
    this.#dialog?.removeEventListener("close", this.onNativeClose);
    super.disconnectedCallback();
  }

  get modal(): boolean {
    return this.getAttribute("modal") !== "false";
  }

  set modal(value: boolean) {
    if (value) {
      this.removeAttribute("modal");
      return;
    }
    this.setAttribute("modal", "false");
  }

  protected isModal(): boolean {
    return this.modal;
  }

  protected onOpen(): void {
    if (!this.#dialog || this.#dialog.open) {
      return;
    }
    if (this.modal) {
      this.#dialog.showModal();
      return;
    }
    this.#dialog.show();
  }

  protected onClose(): void {
    if (!this.#dialog || !this.#dialog.open) {
      return;
    }
    this.#syncingNativeClose = true;
    this.#dialog.close();
    this.#syncingNativeClose = false;
  }

  private onNativeCancel = (event: Event): void => {
    event.preventDefault();
    this.setOpen(false, { reason: "escape", trigger: "keyboard" });
  };

  private onNativeClose = (): void => {
    if (this.#syncingNativeClose || !this.open) {
      return;
    }
    this.setOpen(false, { reason: "action", trigger: "programmatic" });
  };
}

class UIPopoverElement extends UIOverlayElement {
  protected onOpen(): void {
    if (isPopoverCapable(this)) {
      const nativePopover = this as NativePopoverElement;
      if (!this.hasAttribute("popover")) {
        this.setAttribute("popover", "manual");
      }
      nativePopover.showPopover();
      return;
    }
    this.hidden = false;
  }

  protected onClose(): void {
    if (isPopoverCapable(this)) {
      const nativePopover = this as NativePopoverElement;
      nativePopover.hidePopover();
      return;
    }
    this.hidden = true;
  }
}

function splitWhitespaceList(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function mergeTokenLists(...lists: string[][]): string[] {
  const merged = new Set<string>();
  for (const list of lists) {
    for (const token of list) {
      merged.add(token);
    }
  }
  return Array.from(merged);
}

function setOptionalStringAttribute(element: HTMLElement, name: string, value: string): void {
  const normalized = value.trim();
  if (normalized.length === 0) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, normalized);
}

function syncBooleanAttribute(element: HTMLElement, name: string, value: boolean): void {
  if (value) {
    element.setAttribute(name, "");
    return;
  }
  element.removeAttribute(name);
}

function isLabelableControl(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement) {
    return element.type !== "hidden";
  }
  return (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLMeterElement ||
    element instanceof HTMLOutputElement ||
    element instanceof HTMLProgressElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

class UIButtonElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return ["disabled", "variant", "size"];
  }

  #innerButton: HTMLButtonElement | null = null;
  #ownsFallbackRole = false;
  #ownsFallbackTabIndex = false;
  #observer: MutationObserver | null = null;

  connectedCallback(): void {
    this.resolveButton();
    this.syncState();
    this.addEventListener("keydown", this.onKeydown);
    this.addEventListener("click", this.onClickCapture, { capture: true });
    this.#observer = new MutationObserver(() => {
      this.resolveButton();
      this.syncState();
    });
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.removeEventListener("keydown", this.onKeydown);
    this.removeEventListener("click", this.onClickCapture, { capture: true });
    this.#observer?.disconnect();
    this.#observer = null;
  }

  get variant(): string {
    return this.getStringAttribute("variant");
  }

  set variant(value: string) {
    this.setStringAttribute("variant", value);
  }

  get size(): string {
    return this.getStringAttribute("size");
  }

  set size(value: string) {
    this.setStringAttribute("size", value);
  }

  get disabled(): boolean {
    return this.getBooleanAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.setBooleanAttribute("disabled", value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    if (name === "disabled") {
      this.syncState();
      return;
    }
    this.syncStylingHooks();
  }

  private resolveButton(): void {
    this.#innerButton = this.querySelector("button");
  }

  private syncStylingHooks(): void {
    setOptionalStringAttribute(this, "data-variant", this.variant);
    setOptionalStringAttribute(this, "data-size", this.size);
    syncBooleanAttribute(this, "data-disabled", this.disabled);

    if (!this.#innerButton) {
      return;
    }

    setOptionalStringAttribute(this.#innerButton, "data-variant", this.variant);
    setOptionalStringAttribute(this.#innerButton, "data-size", this.size);
    syncBooleanAttribute(this.#innerButton, "data-disabled", this.disabled);
  }

  private syncState(): void {
    this.syncStylingHooks();

    if (this.#innerButton) {
      this.#innerButton.disabled = this.disabled;
      this.removeFallbackSemantics();
      return;
    }

    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "button");
      this.#ownsFallbackRole = true;
    }

    if (!this.hasAttribute("tabindex")) {
      this.tabIndex = this.disabled ? -1 : 0;
      this.#ownsFallbackTabIndex = true;
    } else if (this.#ownsFallbackTabIndex) {
      this.tabIndex = this.disabled ? -1 : 0;
    }

    this.setAttribute("aria-disabled", String(this.disabled));
  }

  private removeFallbackSemantics(): void {
    if (this.#ownsFallbackRole) {
      this.removeAttribute("role");
      this.#ownsFallbackRole = false;
    }
    if (this.#ownsFallbackTabIndex) {
      this.removeAttribute("tabindex");
      this.#ownsFallbackTabIndex = false;
    }
    this.removeAttribute("aria-disabled");
  }

  private onClickCapture = (event: Event): void => {
    if (this.#innerButton || !this.disabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  private onKeydown = (event: KeyboardEvent): void => {
    if (this.#innerButton || this.disabled || !isActivationKey(event)) {
      return;
    }
    event.preventDefault();
    this.click();
  };
}

class UIInputElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return ["value", "default-value", "disabled", "readonly", "invalid"];
  }

  #input: HTMLInputElement | null = null;
  #observer: MutationObserver | null = null;

  connectedCallback(): void {
    this.resolveInput();
    this.attachInputListeners();
    this.syncStateToInput();
    this.#observer = new MutationObserver(() => {
      const previous = this.#input;
      this.resolveInput();
      if (previous !== this.#input) {
        this.detachInputListeners(previous);
        this.attachInputListeners();
      }
      this.syncStateToInput();
    });
    this.#observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this.detachInputListeners(this.#input);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  get value(): string {
    return this.getStringAttribute("value");
  }

  set value(next: string) {
    this.setStringAttribute("value", next);
  }

  get defaultValue(): string {
    return this.getStringAttribute("default-value");
  }

  set defaultValue(next: string) {
    this.setStringAttribute("default-value", next);
  }

  get disabled(): boolean {
    return this.getBooleanAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.setBooleanAttribute("disabled", value);
  }

  get readOnly(): boolean {
    return this.getBooleanAttribute("readonly");
  }

  set readOnly(value: boolean) {
    this.setBooleanAttribute("readonly", value);
  }

  get invalid(): boolean {
    return this.getBooleanAttribute("invalid");
  }

  set invalid(value: boolean) {
    this.setBooleanAttribute("invalid", value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    this.syncStateToInput();
    if (name !== "invalid") {
      return;
    }
    if (this.invalid) {
      this.setAttribute("aria-invalid", "true");
      return;
    }
    this.removeAttribute("aria-invalid");
  }

  private resolveInput(): void {
    this.#input = this.querySelector("input");
  }

  private attachInputListeners(): void {
    this.#input?.addEventListener("input", this.onNativeInput);
    this.#input?.addEventListener("change", this.onNativeChange);
  }

  private detachInputListeners(input: HTMLInputElement | null): void {
    input?.removeEventListener("input", this.onNativeInput);
    input?.removeEventListener("change", this.onNativeChange);
  }

  private syncStateToInput(): void {
    if (!this.#input) {
      if (!this.hasAttribute("role")) {
        this.setAttribute("role", "textbox");
      }
      this.setAttribute("aria-disabled", String(this.disabled));
      this.setAttribute("aria-readonly", String(this.readOnly));
      if (this.invalid) {
        this.setAttribute("aria-invalid", "true");
      } else {
        this.removeAttribute("aria-invalid");
      }
      return;
    }

    if (this.#input.value !== this.value) {
      this.#input.value = this.value;
    }

    const defaultValue = this.defaultValue;
    if (defaultValue.length > 0 || this.hasAttribute("default-value")) {
      this.#input.defaultValue = defaultValue;
    }

    this.#input.disabled = this.disabled;
    this.#input.readOnly = this.readOnly;

    if (this.invalid) {
      this.#input.setAttribute("aria-invalid", "true");
      this.setAttribute("aria-invalid", "true");
    } else {
      this.#input.removeAttribute("aria-invalid");
      this.removeAttribute("aria-invalid");
    }
  }

  private onNativeInput = (event: Event): void => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    this.setStringAttribute("value", event.target.value);
  };

  private onNativeChange = (event: Event): void => {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }
    this.setStringAttribute("value", event.target.value);
  };
}

class UIFormFieldElement extends UIPrimitiveElement {
  static get observedAttributes(): string[] {
    return ["invalid", "required", "disabled"];
  }

  #managedDescriptions: string[] = [];
  #observer: MutationObserver | null = null;

  connectedCallback(): void {
    this.syncField();
    this.#observer = new MutationObserver(() => {
      this.syncField();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["id", "for", "aria-describedby", "data-slot", "role"]
    });
  }

  disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
  }

  get invalid(): boolean {
    return this.getBooleanAttribute("invalid");
  }

  set invalid(value: boolean) {
    this.setBooleanAttribute("invalid", value);
  }

  get required(): boolean {
    return this.getBooleanAttribute("required");
  }

  set required(value: boolean) {
    this.setBooleanAttribute("required", value);
  }

  get disabled(): boolean {
    return this.getBooleanAttribute("disabled");
  }

  set disabled(value: boolean) {
    this.setBooleanAttribute("disabled", value);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) {
      return;
    }
    if (name === "invalid" && this.invalid) {
      this.setAttribute("aria-invalid", "true");
    }
    if (name === "invalid" && !this.invalid) {
      this.removeAttribute("aria-invalid");
    }
    this.syncField();
  }

  private findLabel(): HTMLLabelElement | null {
    return this.querySelector("label");
  }

  private findControl(): HTMLElement | null {
    const selector = [
      '[data-slot="control"]',
      "ui-input",
      "input",
      "textarea",
      "select",
      "button"
    ].join(", ");
    return this.querySelector<HTMLElement>(selector);
  }

  private getDescriptionElements(): HTMLElement[] {
    return Array.from(
      this.querySelectorAll<HTMLElement>(
        '[data-slot="help"], [data-slot="error"], [data-ui-help], [data-ui-error], [role="alert"]'
      )
    );
  }

  private syncLabelAssociation(control: HTMLElement, label: HTMLLabelElement | null): void {
    if (!label) {
      return;
    }

    if (!control.id) {
      control.id = createId("field-control");
    }

    if (isLabelableControl(control)) {
      if (!label.htmlFor) {
        label.htmlFor = control.id;
      }
      return;
    }

    if (!label.id) {
      label.id = createId("field-label");
    }
    const existing = splitWhitespaceList(control.getAttribute("aria-labelledby"));
    const next = mergeTokenLists(existing, [label.id]);
    control.setAttribute("aria-labelledby", next.join(" "));
  }

  private syncDescriptions(control: HTMLElement): void {
    const describedBy = splitWhitespaceList(control.getAttribute("aria-describedby"));
    const withoutManaged = describedBy.filter((id) => !this.#managedDescriptions.includes(id));

    const nextManaged: string[] = [];
    for (const element of this.getDescriptionElements()) {
      if (!element.id) {
        element.id = createId("field-description");
      }
      nextManaged.push(element.id);
    }
    this.#managedDescriptions = nextManaged;

    const merged = mergeTokenLists(withoutManaged, nextManaged);
    if (merged.length === 0) {
      control.removeAttribute("aria-describedby");
      return;
    }
    control.setAttribute("aria-describedby", merged.join(" "));
  }

  private reflectControlState(control: HTMLElement): void {
    syncBooleanAttribute(control, "disabled", this.disabled);
    syncBooleanAttribute(control, "required", this.required);

    if ("disabled" in control) {
      (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement).disabled =
        this.disabled;
    }
    if ("required" in control) {
      (control as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).required = this.required;
    }

    if (this.invalid) {
      control.setAttribute("aria-invalid", "true");
      syncBooleanAttribute(control, "invalid", true);
      return;
    }
    control.removeAttribute("aria-invalid");
    control.removeAttribute("invalid");
  }

  private syncField(): void {
    const control = this.findControl();
    if (!control) {
      return;
    }
    this.syncLabelAssociation(control, this.findLabel());
    this.syncDescriptions(control);
    this.reflectControlState(control);
  }
}

const definitions: ReadonlyArray<readonly [string, CustomElementConstructor]> = [
  ["ui-disclosure", UIDisclosureElement],
  ["ui-tabs", UITabsElement],
  ["ui-dialog", UIDialogElement],
  ["ui-popover", UIPopoverElement],
  ["ui-menu", UIMenuElement],
  ["ui-menu-item", UIMenuItemElement],
  ["ui-button", UIButtonElement],
  ["ui-input", UIInputElement],
  ["ui-form-field", UIFormFieldElement]
];

for (const [tag, constructor] of definitions) {
  if (!customElements.get(tag)) {
    customElements.define(tag, constructor);
  }
}

export function registerCoreComponents(): void {
  // Registration occurs during module evaluation.
}
