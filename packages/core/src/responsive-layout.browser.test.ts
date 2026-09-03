import { afterEach, describe, expect, it } from "vitest";

import "../src/styles.css";
import "../../layout/src/index";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("responsive light-DOM layout", () => {
  it("keeps core host display defaults after the scoped reset", async () => {
    await customElements.whenDefined("ui-button");
    document.body.innerHTML = "<ui-button><button type=\"button\">Save</button></ui-button>";

    expect(getComputedStyle(document.querySelector("ui-button")!).display).toBe("inline-flex");
  });

  it("keeps primitive display modes after the scoped reset", () => {
    document.body.innerHTML = `
      <ui-stack></ui-stack>
      <ui-inline></ui-inline>
      <ui-grid></ui-grid>
      <ui-center></ui-center>
    `;

    expect(getComputedStyle(document.querySelector("ui-stack")!).display).toBe("flex");
    expect(getComputedStyle(document.querySelector("ui-inline")!).display).toBe("flex");
    expect(getComputedStyle(document.querySelector("ui-grid")!).display).toBe("grid");
    expect(getComputedStyle(document.querySelector("ui-center")!).display).toBe("block");
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
});
