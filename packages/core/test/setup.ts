if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0);
}

if (typeof globalThis.cancelAnimationFrame !== "function") {
  globalThis.cancelAnimationFrame = (handle: number) => window.clearTimeout(handle);
}

if (typeof globalThis.PointerEvent !== "function") {
  class VitestPointerEvent extends MouseEvent {}

  globalThis.PointerEvent = VitestPointerEvent as typeof PointerEvent;
}

if (typeof globalThis.CSS === "undefined") {
  globalThis.CSS = {} as typeof CSS;
}

if (typeof globalThis.CSS.escape !== "function") {
  globalThis.CSS.escape = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

// Register all Stencil components from the compiled custom-elements output.
// The dist/ directory is populated by `stencil build` (run before tests).
// Each module exports a `defineCustomElement` function that registers the
// custom element with the browser.
const componentModules: Array<{ path: string; tag: string }> = [
  { path: "../dist/components/ui-avatar", tag: "ui-avatar" },
  { path: "../dist/components/ui-avatar-group", tag: "ui-avatar-group" },
  { path: "../dist/components/ui-badge", tag: "ui-badge" },
  { path: "../dist/components/ui-button", tag: "ui-button" },
  { path: "../dist/components/ui-checkbox", tag: "ui-checkbox" },
  { path: "../dist/components/ui-context-menu", tag: "ui-context-menu" },
  { path: "../dist/components/ui-dialog", tag: "ui-dialog" },
  { path: "../dist/components/ui-disclosure", tag: "ui-disclosure" },
  { path: "../dist/components/ui-floating-action-button", tag: "ui-floating-action-button" },
  { path: "../dist/components/ui-form-field", tag: "ui-form-field" },
  { path: "../dist/components/ui-icon-button", tag: "ui-icon-button" },
  { path: "../dist/components/ui-input", tag: "ui-input" },
  { path: "../dist/components/ui-menu", tag: "ui-menu" },
  { path: "../dist/components/ui-menu-item", tag: "ui-menu-item" },
  { path: "../dist/components/ui-popover", tag: "ui-popover" },
  { path: "../dist/components/ui-radio", tag: "ui-radio" },
  { path: "../dist/components/ui-radio-group", tag: "ui-radio-group" },
  { path: "../dist/components/ui-search-result-row", tag: "ui-search-result-row" },
  { path: "../dist/components/ui-search-shell", tag: "ui-search-shell" },
  { path: "../dist/components/ui-select", tag: "ui-select" },
  { path: "../dist/components/ui-switch", tag: "ui-switch" },
  { path: "../dist/components/ui-tabs", tag: "ui-tabs" },
  { path: "../dist/components/ui-textarea", tag: "ui-textarea" },
  { path: "../dist/components/ui-toast-region", tag: "ui-toast-region" },
  { path: "../dist/components/ui-tooltip", tag: "ui-tooltip" },
  { path: "../dist/components/ui-top-bar", tag: "ui-top-bar" },
];

for (const { path, tag } of componentModules) {
  const mod = await import(path);
  if (typeof mod.defineCustomElement === "function") {
    mod.defineCustomElement();
  }
}
