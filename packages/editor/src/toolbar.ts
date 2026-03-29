/**
 * ui-editor-toolbar — slot-based editor toolbar shell.
 * Apps own button content and command wiring; Looma owns the frame.
 */

const TAG = "ui-editor-toolbar";

if (typeof HTMLElement !== "undefined") {
class UIEditorToolbarElement extends HTMLElement {
  connectedCallback(): void {
    if (!this.hasAttribute("role")) {
      this.setAttribute("role", "toolbar");
    }

    if (!this.hasAttribute("aria-label")) {
      this.setAttribute("aria-label", "Editor toolbar");
    }
  }
}

if (typeof window !== "undefined" && !customElements.get(TAG)) {
  customElements.define(TAG, UIEditorToolbarElement);
}
}
