if (typeof window !== "undefined") {
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
  const componentLoaders = import.meta.glob("../dist/components/ui-*.js");
  for (const loadComponent of Object.values(componentLoaders)) {
    const componentModule = await loadComponent() as { defineCustomElement?: () => void };
    if (typeof componentModule.defineCustomElement === "function") {
      componentModule.defineCustomElement();
    }
  }
}
