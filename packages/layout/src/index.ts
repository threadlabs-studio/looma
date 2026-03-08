import "./layout.css";

type PrimitiveAttribute =
  | "gap"
  | "align"
  | "justify"
  | "wrap"
  | "min"
  | "measure"
  | "gutters"
  | "orientation";

const ORIENTATION_HORIZONTAL = "horizontal";
const ORIENTATION_VERTICAL = "vertical";

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
