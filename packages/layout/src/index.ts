import "./layout.css";

type PrimitiveAttribute =
  | "gap"
  | "align"
  | "justify"
  | "wrap"
  | "min"
  | "measure"
  | "gutters"
  | "threshold"
  | "side"
  | "width"
  | "item-width"
  | "snap"
  | "orientation"
  | "resizable"
  | "storage-key"
  | "min-width"
  | "max-width"
  | "resize-step"
  | "resize-label";

const ORIENTATION_HORIZONTAL = "horizontal";
const ORIENTATION_VERTICAL = "vertical";
export type SidebarResizeTrigger = "keyboard" | "pointer" | "programmatic";
export interface SidebarResizeDetail { width: number; trigger: SidebarResizeTrigger }

function normalizeOrientation(value: string | null): string {
  return value === ORIENTATION_VERTICAL ? ORIENTATION_VERTICAL : ORIENTATION_HORIZONTAL;
}

if (typeof HTMLElement !== "undefined") {
class UILayoutElement extends HTMLElement {
  protected getPrimitiveAttribute(name: PrimitiveAttribute): string {
    return this.getAttribute(name) ?? "";
  }

  protected setPrimitiveAttribute(name: PrimitiveAttribute, value: string): void {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, normalizedValue);
  }
}

class UIStackElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "align", "justify"];
  }

  get gap(): string {
    return this.getPrimitiveAttribute("gap");
  }

  set gap(value: string) {
    this.setPrimitiveAttribute("gap", value);
  }

  get align(): string {
    return this.getPrimitiveAttribute("align");
  }

  set align(value: string) {
    this.setPrimitiveAttribute("align", value);
  }

  get justify(): string {
    return this.getPrimitiveAttribute("justify");
  }

  set justify(value: string) {
    this.setPrimitiveAttribute("justify", value);
  }
}

class UIInlineElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "align", "justify", "wrap"];
  }

  get gap(): string {
    return this.getPrimitiveAttribute("gap");
  }

  set gap(value: string) {
    this.setPrimitiveAttribute("gap", value);
  }

  get align(): string {
    return this.getPrimitiveAttribute("align");
  }

  set align(value: string) {
    this.setPrimitiveAttribute("align", value);
  }

  get justify(): string {
    return this.getPrimitiveAttribute("justify");
  }

  set justify(value: string) {
    this.setPrimitiveAttribute("justify", value);
  }

  get wrap(): string {
    return this.getPrimitiveAttribute("wrap");
  }

  set wrap(value: string) {
    this.setPrimitiveAttribute("wrap", value);
  }
}

class UIClusterElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "align", "justify"];
  }

  get gap(): string {
    return this.getPrimitiveAttribute("gap");
  }

  set gap(value: string) {
    this.setPrimitiveAttribute("gap", value);
  }

  get align(): string {
    return this.getPrimitiveAttribute("align");
  }

  set align(value: string) {
    this.setPrimitiveAttribute("align", value);
  }

  get justify(): string {
    return this.getPrimitiveAttribute("justify");
  }

  set justify(value: string) {
    this.setPrimitiveAttribute("justify", value);
  }
}

class UIGridElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "min"];
  }

  get gap(): string {
    return this.getPrimitiveAttribute("gap");
  }

  set gap(value: string) {
    this.setPrimitiveAttribute("gap", value);
  }

  get min(): string {
    return this.getPrimitiveAttribute("min");
  }

  set min(value: string) {
    this.setPrimitiveAttribute("min", value);
  }
}

class UICenterElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["measure", "gutters"];
  }

  get measure(): string {
    return this.getPrimitiveAttribute("measure");
  }

  set measure(value: string) {
    this.setPrimitiveAttribute("measure", value);
  }

  get gutters(): string {
    return this.getPrimitiveAttribute("gutters");
  }

  set gutters(value: string) {
    this.setPrimitiveAttribute("gutters", value);
  }
}

class UISwitcherElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "threshold", "align"];
  }

  get gap(): string { return this.getPrimitiveAttribute("gap"); }
  set gap(value: string) { this.setPrimitiveAttribute("gap", value); }
  get threshold(): string { return this.getPrimitiveAttribute("threshold"); }
  set threshold(value: string) { this.setPrimitiveAttribute("threshold", value); }
  get align(): string { return this.getPrimitiveAttribute("align"); }
  set align(value: string) { this.setPrimitiveAttribute("align", value); }
}

class UISidebarElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "side", "width", "align", "resizable", "storage-key", "min-width", "max-width", "resize-step", "resize-label"];
  }

  private resizeHandle: HTMLDivElement | null = null;
  private resizeAbort: AbortController | null = null;
  private pointerAbort: AbortController | null = null;

  connectedCallback(): void {
    this.syncResizable();
  }

  disconnectedCallback(): void {
    this.resizeAbort?.abort();
    this.resizeAbort = null;
    this.pointerAbort?.abort();
    this.pointerAbort = null;
  }

  attributeChangedCallback(name: string): void {
    if (["resizable", "storage-key", "min-width", "max-width", "resize-step", "resize-label", "side", "width"].includes(name)) {
      this.syncResizable();
    }
  }

  get gap(): string { return this.getPrimitiveAttribute("gap"); }
  set gap(value: string) { this.setPrimitiveAttribute("gap", value); }
  get side(): string { return this.getPrimitiveAttribute("side"); }
  set side(value: string) { this.setPrimitiveAttribute("side", value); }
  get width(): string { return this.getPrimitiveAttribute("width"); }
  set width(value: string) { this.setPrimitiveAttribute("width", value); }
  get align(): string { return this.getPrimitiveAttribute("align"); }
  set align(value: string) { this.setPrimitiveAttribute("align", value); }

  get resizable(): boolean { return this.hasAttribute("resizable"); }
  set resizable(value: boolean) { this.toggleAttribute("resizable", value); }

  private numericAttribute(name: "min-width" | "max-width" | "resize-step", fallback: number): number {
    const parsed = Number(this.getAttribute(name));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private bounds(): { min: number; max: number; step: number } {
    const min = this.numericAttribute("min-width", 176);
    const max = Math.max(min, this.numericAttribute("max-width", 480));
    return { min, max, step: this.numericAttribute("resize-step", 16) };
  }

  private defaultWidth(): number {
    if (this.width === "narrow") return 224;
    if (this.width === "wide") return 384;
    return 288;
  }

  private storageId(): string | null {
    const key = this.getAttribute("storage-key")?.trim();
    return key ? `looma:sidebar-width:${key}` : null;
  }

  private readStoredWidth(): number | null {
    const key = this.storageId();
    if (!key || typeof localStorage === "undefined") return null;
    try {
      const parsed = Number(localStorage.getItem(key));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  private persistWidth(width: number): void {
    const key = this.storageId();
    if (!key || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(key, String(width));
    } catch {
      // Storage can be unavailable in private or policy-restricted contexts.
    }
  }

  private currentWidth(): number {
    const inline = Number.parseFloat(this.style.getPropertyValue("--ui-sidebar-width"));
    if (Number.isFinite(inline)) return inline;
    const sideRegion = this.getAttribute("side") === "end"
      ? this.querySelector<HTMLElement>(":scope > :last-child:not([data-ui-sidebar-resizer])")
      : this.querySelector<HTMLElement>(":scope > :first-child:not([data-ui-sidebar-resizer])");
    return sideRegion?.getBoundingClientRect().width || this.defaultWidth();
  }

  private setWidth(value: number, persist = false, trigger: SidebarResizeTrigger = "programmatic"): void {
    const { min, max } = this.bounds();
    const width = Math.round(Math.max(min, Math.min(max, value)));
    const previous = Number.parseFloat(this.style.getPropertyValue("--ui-sidebar-width"));
    const changed = !Number.isFinite(previous) || previous !== width;
    this.style.setProperty("--ui-sidebar-width", `${width}px`);
    this.resizeHandle?.setAttribute("aria-valuemin", String(min));
    this.resizeHandle?.setAttribute("aria-valuemax", String(max));
    this.resizeHandle?.setAttribute("aria-valuenow", String(width));
    if (persist && changed) this.persistWidth(width);
    if (changed) {
      this.dispatchEvent(new CustomEvent<SidebarResizeDetail>("resize", { detail: { width, trigger }, bubbles: true }));
    }
  }

  private syncResizable(): void {
    if (!this.isConnected) return;
    if (!this.resizable) {
      this.resizeAbort?.abort();
      this.resizeAbort = null;
      this.pointerAbort?.abort();
      this.pointerAbort = null;
      this.resizeHandle?.remove();
      this.resizeHandle = null;
      return;
    }

    if (!this.resizeHandle) {
      this.resizeHandle = document.createElement("div");
      this.resizeHandle.setAttribute("data-ui-sidebar-resizer", "");
      this.resizeHandle.setAttribute("data-ui-affordance", "resize");
      this.resizeHandle.setAttribute("role", "separator");
      this.resizeHandle.setAttribute("aria-orientation", "vertical");
      this.resizeHandle.setAttribute("tabindex", "0");
      const guide = document.createElement("span");
      guide.setAttribute("data-ui-guide", "");
      guide.setAttribute("aria-hidden", "true");
      this.resizeHandle.append(guide);
      this.append(this.resizeHandle);
    }
    this.resizeHandle.setAttribute("aria-label", this.getAttribute("resize-label") || "Resize sidebar");

    this.resizeAbort?.abort();
    this.resizeAbort = new AbortController();
    const signal = this.resizeAbort.signal;
    this.resizeHandle.addEventListener("keydown", (event) => this.onResizeKey(event), { signal });
    this.resizeHandle.addEventListener("pointerdown", (event) => this.onResizePointer(event), { signal });
    this.resizeHandle.addEventListener("dblclick", () => this.setWidth(this.defaultWidth(), true, "pointer"), { signal });

    this.setWidth(this.readStoredWidth() ?? this.currentWidth());
  }

  private onResizeKey(event: KeyboardEvent): void {
    const { min, max, step } = this.bounds();
    let next: number | null = null;
    if (event.key === "Home") next = min;
    if (event.key === "End") next = max;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const physicalDelta = event.key === "ArrowRight" ? step : -step;
      next = this.currentWidth() + (this.side === "end" ? -physicalDelta : physicalDelta);
    }
    if (next === null) return;
    event.preventDefault();
    this.setWidth(next, true, "keyboard");
  }

  private onResizePointer(event: PointerEvent): void {
    if (event.button !== 0 || this.pointerAbort) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.currentWidth();
    const multiplier = this.side === "end" ? -1 : 1;
    const controller = new AbortController();
    this.pointerAbort = controller;
    const finish = () => {
      this.persistWidth(this.currentWidth());
      controller.abort();
      this.pointerAbort = null;
    };
    window.addEventListener("pointermove", (moveEvent) => {
      this.setWidth(startWidth + ((moveEvent.clientX - startX) * multiplier), false, "pointer");
    }, { signal: controller.signal });
    window.addEventListener("pointerup", finish, { once: true, signal: controller.signal });
    window.addEventListener("pointercancel", finish, { once: true, signal: controller.signal });
  }
}

class UIReelElement extends UILayoutElement {
  static get observedAttributes(): PrimitiveAttribute[] {
    return ["gap", "item-width", "snap"];
  }

  connectedCallback(): void {
    if (!this.hasAttribute("role")) this.setAttribute("role", "region");
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
  }

  get gap(): string { return this.getPrimitiveAttribute("gap"); }
  set gap(value: string) { this.setPrimitiveAttribute("gap", value); }
  get itemWidth(): string { return this.getPrimitiveAttribute("item-width"); }
  set itemWidth(value: string) { this.setPrimitiveAttribute("item-width", value); }
  get snap(): string { return this.getPrimitiveAttribute("snap"); }
  set snap(value: string) { this.setPrimitiveAttribute("snap", value); }
}

class UISeparatorElement extends UILayoutElement {
  static get observedAttributes(): Array<PrimitiveAttribute | "role"> {
    return ["orientation", "role"];
  }

  connectedCallback(): void {
    this.ensureDefaults();
  }

  get orientation(): string {
    return normalizeOrientation(this.getAttribute("orientation"));
  }

  set orientation(value: string) {
    const normalizedValue = normalizeOrientation(value);
    this.setPrimitiveAttribute("orientation", normalizedValue);
    this.syncOrientationAria();
  }

  attributeChangedCallback(name: string): void {
    if (name === "orientation" || name === "role") {
      this.syncOrientationAria();
    }
  }

  private ensureDefaults(): void {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "separator");
    }
    this.syncOrientationAria();
  }

  private syncOrientationAria(): void {
    if (this.getAttribute("role") !== "separator") {
      this.removeAttribute("aria-orientation");
      return;
    }
    this.setAttribute("aria-orientation", this.orientation);
  }
}

const definitions = [
  ["ui-stack", UIStackElement],
  ["ui-inline", UIInlineElement],
  ["ui-cluster", UIClusterElement],
  ["ui-grid", UIGridElement],
  ["ui-center", UICenterElement],
  ["ui-switcher", UISwitcherElement],
  ["ui-sidebar", UISidebarElement],
  ["ui-reel", UIReelElement],
  ["ui-separator", UISeparatorElement]
] as const;

for (const [tag, constructor] of definitions) {
  if (!customElements.get(tag)) {
    customElements.define(tag, constructor);
  }
}
}

export function registerLayoutPrimitives(): void {
  // Registration is side-effectful via module import.
}
