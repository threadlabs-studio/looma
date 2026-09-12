import { afterEach, describe, expect, it } from "vitest";

import "../src/styles.css";
import "../../layout/src/index";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("responsive light-DOM layout", () => {
  it("shows a dialog controlled through its open property", async () => {
    await customElements.whenDefined("ui-dialog");
    const dialog = document.createElement("ui-dialog") as HTMLElement & { open: boolean };
    document.body.append(dialog);

    dialog.open = true;

    await expect.poll(() => dialog.hasAttribute("data-open")).toBe(true);
    expect(getComputedStyle(dialog).display).not.toBe("none");
  });

  it("forwards the public label to the native dialog surface", async () => {
    await customElements.whenDefined("ui-dialog");
    const dialog = document.createElement("ui-dialog");
    dialog.setAttribute("label", "Version history");
    document.body.append(dialog);

    await expect.poll(() => dialog.shadowRoot?.querySelector("dialog")?.getAttribute("aria-label"))
      .toBe("Version history");
  });

  it("contains an oversized dialog inside the viewport and scrolls its surface", async () => {
    await customElements.whenDefined("ui-dialog");
    document.body.innerHTML = `
      <ui-dialog
        open
        style="--ui-space-4: 16px; --ui-motion-base: 0ms; --ui-motion-ease: linear; --ui-surface-elevated: white; --ui-border-default: #ccc; --ui-radius-dialog: 12px; --ui-shadow-dialog: 0 4px 12px rgb(0 0 0 / 20%); --ui-overlay-backdrop: rgb(0 0 0 / 30%)"
      >
        <h2>Long dialog</h2>
        <div style="block-size: 1000px">Tall content</div>
      </ui-dialog>
    `;

    const host = document.querySelector<HTMLElement>("ui-dialog")!;
    await expect.poll(() => host.hasAttribute("data-open")).toBe(true);
    const surface = host.shadowRoot!.querySelector<HTMLDialogElement>("dialog")!;
    await expect.poll(() => surface.getBoundingClientRect().height).toBeGreaterThan(0);
    const bounds = surface.getBoundingClientRect();

    expect(bounds.top).toBeGreaterThanOrEqual(16);
    expect(bounds.bottom).toBeLessThanOrEqual(window.innerHeight - 16);
    expect(getComputedStyle(host).boxShadow).toBe("none");
    expect(getComputedStyle(surface).boxShadow).not.toBe("none");
    expect(getComputedStyle(surface).overflowY).toBe("auto");
    expect(surface.scrollHeight).toBeGreaterThan(surface.clientHeight);
  });

  it("keeps core host display defaults after the scoped reset", async () => {
    await customElements.whenDefined("ui-button");
    document.body.innerHTML = "<ui-button><button type=\"button\">Save</button></ui-button>";

    expect(getComputedStyle(document.querySelector("ui-button")!).display).toBe("inline-flex");
  });

  it("keeps dormant anticipatory controls out of pointer hit testing", async () => {
    await Promise.all([
      customElements.whenDefined("ui-affordance-scope"),
      customElements.whenDefined("ui-icon-button"),
    ]);
    document.body.innerHTML = `
      <ui-affordance-scope>
        <ui-icon-button anticipatory label="Add item">+</ui-icon-button>
      </ui-affordance-scope>
    `;
    const icon = document.querySelector("ui-icon-button")!;
    await expect.poll(() => icon.shadowRoot?.querySelector("button")).toBeTruthy();
    const button = icon.shadowRoot!.querySelector("button")!;

    expect(getComputedStyle(button).pointerEvents).toBe("none");
    icon.setAttribute("data-ui-proximity", "near");
    expect(getComputedStyle(button).pointerEvents).toBe("auto");
  });

  it("keeps primitive display modes after the scoped reset", () => {
    document.body.innerHTML = `
      <ui-stack></ui-stack>
      <ui-inline></ui-inline>
      <ui-grid></ui-grid>
      <ui-center></ui-center>
      <ui-switcher></ui-switcher>
      <ui-sidebar></ui-sidebar>
      <ui-reel></ui-reel>
    `;

    expect(getComputedStyle(document.querySelector("ui-stack")!).display).toBe("flex");
    expect(getComputedStyle(document.querySelector("ui-inline")!).display).toBe("flex");
    expect(getComputedStyle(document.querySelector("ui-grid")!).display).toBe("grid");
    expect(getComputedStyle(document.querySelector("ui-center")!).display).toBe("block");
    expect(getComputedStyle(document.querySelector("ui-switcher")!).display).toBe("flex");
    expect(getComputedStyle(document.querySelector("ui-sidebar")!).display).toBe("flex");
    expect(getComputedStyle(document.querySelector("ui-reel")!).display).toBe("flex");
  });

  it("switches children to a single column below its intrinsic threshold", () => {
    document.body.innerHTML = `
      <div style="inline-size: 280px">
        <ui-switcher threshold="sm"><button>One</button><button>Two</button></ui-switcher>
      </div>
    `;

    const children = document.querySelectorAll<HTMLElement>("ui-switcher > *");
    expect(children[0]!.getBoundingClientRect().width).toBe(children[1]!.getBoundingClientRect().width);
    expect(children[0]!.offsetTop).toBeLessThan(children[1]!.offsetTop);
  });

  it("keeps sidebar content above its intrinsic minimum", () => {
    document.body.innerHTML = `
      <div style="inline-size: 720px">
        <ui-sidebar><aside>Navigation</aside><main>Content</main></ui-sidebar>
      </div>
    `;

    const sidebar = document.querySelector<HTMLElement>("ui-sidebar")!;
    const main = sidebar.querySelector<HTMLElement>("main")!;
    expect(main.getBoundingClientRect().width).toBeGreaterThan(sidebar.getBoundingClientRect().width / 2);
  });

  it("contains reel overflow within the scrolling primitive", () => {
    document.body.innerHTML = `
      <div id="parent" style="inline-size: 320px">
        <ui-reel item-width="md"><div>A</div><div>B</div><div>C</div></ui-reel>
      </div>
    `;

    const parent = document.querySelector<HTMLElement>("#parent")!;
    const reel = document.querySelector<HTMLElement>("ui-reel")!;
    expect(reel.scrollWidth).toBeGreaterThan(reel.clientWidth);
    expect(parent.scrollWidth).toBe(parent.clientWidth);
  });

  it("does not let a grid minimum overflow a narrow parent", () => {
    document.body.innerHTML = `
      <div id="parent" style="inline-size: 240px">
        <ui-grid min="lg"><article>Card</article></ui-grid>
      </div>
    `;

    const parent = document.querySelector<HTMLElement>("#parent")!;
    const grid = document.querySelector<HTMLElement>("ui-grid")!;

    expect(grid.getBoundingClientRect().width).toBeLessThanOrEqual(parent.getBoundingClientRect().width);
    expect(parent.scrollWidth).toBe(parent.clientWidth);
  });

  it("lets center fill a narrow parent without exceeding its measure", () => {
    document.body.innerHTML = `
      <div id="parent" style="inline-size: 320px">
        <ui-center measure="wide">Content</ui-center>
      </div>
    `;

    const parent = document.querySelector<HTMLElement>("#parent")!;
    const center = document.querySelector<HTMLElement>("ui-center")!;

    expect(center.getBoundingClientRect().width).toBe(parent.getBoundingClientRect().width);
  });

  it("centers a measured surface inside a wider parent", () => {
    document.body.innerHTML = `
      <div id="parent" style="inline-size: 900px">
        <ui-center>Content</ui-center>
      </div>
    `;

    const parent = document.querySelector<HTMLElement>("#parent")!;
    const center = document.querySelector<HTMLElement>("ui-center")!;
    const parentRect = parent.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();
    const startGap = centerRect.left - parentRect.left;
    const endGap = parentRect.right - centerRect.right;

    expect(centerRect.width).toBeLessThan(parentRect.width);
    expect(startGap).toBeGreaterThan(0);
    expect(startGap).toBeCloseTo(endGap, 5);
  });
});
