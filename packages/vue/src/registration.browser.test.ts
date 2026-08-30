import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, type App } from "vue";

const apps: App[] = [];

const flushBrowser = async () => {
  for (let index = 0; index < 3; index += 1) {
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
};

afterEach(async () => {
  for (const app of apps.splice(0)) {
    app.unmount();
  }
  await flushBrowser();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("@looma/vue release registration (real browser)", () => {
  it("registers and renders the supported baseline without warnings or duplicate-definition errors", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const adapter = await import("./index");
    const { defineCustomElements } = await import("@looma/core/loader");

    expect(() => defineCustomElements()).not.toThrow();
    expect(() => defineCustomElements()).not.toThrow();

    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      render: () =>
        h(adapter.Stack, { gap: "md" }, () => [
          h(adapter.TopBar, null, () => h("h1", "Workspace")),
          h(adapter.Button, null, () => h("button", { type: "button" }, "Save")),
          h(adapter.ContextMenu, null, () => [
            h("button", { slot: "trigger", type: "button" }, "Page actions"),
            h(adapter.MenuItem, { value: "rename" }, () => "Rename"),
          ]),
          h(adapter.EditorToolbar, null, () => h("button", { type: "button" }, "Bold")),
        ]),
    });
    apps.push(app);
    app.mount(host);

    await Promise.all([
      customElements.whenDefined("ui-stack"),
      customElements.whenDefined("ui-button"),
      customElements.whenDefined("ui-context-menu"),
      customElements.whenDefined("ui-editor-toolbar"),
    ]);
    await flushBrowser();

    expect(host.querySelector("ui-stack ui-top-bar")).toBeTruthy();
    expect(host.querySelector("ui-button")?.shadowRoot).toBeTruthy();
    expect(host.querySelector("ui-context-menu [slot='trigger']")?.textContent).toBe("Page actions");
    expect(host.querySelector("ui-editor-toolbar button")?.textContent).toBe("Bold");
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
