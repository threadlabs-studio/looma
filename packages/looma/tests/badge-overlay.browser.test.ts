import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import Badge from "../vue/UiBadge.js";
import Button from "../vue/UiButton.js";
import "../tokens.css";
import "../theme-light.css";
import "../theme-dark.css";
import "../vue/components.css";

let app: App;
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; });

it("overlay counts inherit filled action ink and remain compact and legible in both themes", async () => {
  for (const theme of ["light", "dark"]) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const host = document.createElement("div"); document.body.append(host);
    app = createApp({ render: () => h("div", ["default", "violet"].flatMap(control => [1, 12, 99, 120].map(count => h(Button, {
      variant: "solid", tone: "accent", size: "sm", "aria-label": `Submit ${count} items`, "data-control": control,
      ...(control === "violet" ? { style: "--ui-accent: rgb(109, 74, 255); --ui-on-accent: white" } : {}),
    }, { default: () => "Submit", badge: () => h(Badge, {
      variant: "overlay", shape: "circle", size: "sm", "aria-hidden": true,
    }, () => count > 99 ? "99+" : String(count)) })))) });
    app.mount(host); await nextTick();
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const paint = (background: string, overlay?: string) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = background; ctx.fillRect(0, 0, 1, 1);
      if (overlay) { ctx.fillStyle = overlay; ctx.fillRect(0, 0, 1, 1); }
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const luminance = (rgb: number[]) => rgb.map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
    for (const count of host.querySelectorAll(':is([data-component~="ui-badge"], .ui-badge)')) {
      const button = count.closest("button")!;
      const style = getComputedStyle(count), parentStyle = getComputedStyle(button);
      const bounds = count.getBoundingClientRect(), label = count.querySelector(".label")!.getBoundingClientRect();
      expect(style.color).toBe(parentStyle.color);
      if (button.dataset.control === "violet") expect(parentStyle.backgroundColor).toBe("rgb(109, 74, 255)");
      const ink = luminance(paint(style.color)), surface = luminance(paint(parentStyle.backgroundColor, style.backgroundColor));
      expect((Math.max(ink, surface) + 0.05) / (Math.min(ink, surface) + 0.05)).toBeGreaterThanOrEqual(4.5);
      const control = luminance(paint(parentStyle.backgroundColor));
      expect(Math.abs(ink - surface)).toBeLessThan(Math.abs(ink - control));
      expect(bounds.width).toBe(20); expect(bounds.height).toBe(20);
      expect(label.width).toBeLessThanOrEqual(bounds.width - 2);
      expect(Math.abs(label.x + label.width / 2 - bounds.x - bounds.width / 2)).toBeLessThan(1);
      expect(Math.abs(label.y + label.height / 2 - bounds.y - bounds.height / 2)).toBeLessThan(1);
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = style.borderTopColor; ctx.fillRect(0, 0, 1, 1);
      expect(ctx.getImageData(0, 0, 1, 1).data[3]).toBeCloseTo(51, 0);
      expect(style.borderTopWidth).toBe("1px");
      expect(style.boxShadow).toBe("none");
      expect(count.getAttribute("aria-hidden")).toBe("true");
    }
    app.unmount(); host.remove();
  }
});
