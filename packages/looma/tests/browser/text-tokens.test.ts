import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, browser } from "../renderers/browser-driver";

describe("Text tokens", () => {
  // Every token meant for readable text, on every surface a component paints it on. Disabled text
  // is exempt (WCAG 1.4.3), so --ui-disabled-text is not here.
  // The last five are ui-text's tones: accent, danger, success, info, and warning.
  const texts = [
    "--ui-text", "--ui-text-primary", "--ui-text-secondary", "--ui-text-muted", "--ui-control-placeholder",
    "--ui-accent-active", "--ui-danger", "--ui-success", "--ui-info-subtle-text", "--ui-warning-subtle-text",
  ];
  const surfaces = [
    "--ui-surface", "--ui-surface-canvas", "--ui-surface-default", "--ui-surface-raised", "--ui-surface-elevated",
    "--ui-surface-sunken", "--ui-surface-subtle", "--ui-surface-muted", "--ui-surface-hover", "--ui-control-surface",
  ];
  const themes = [
    { name: "light", attributes: "", media: {} },
    { name: "dark", attributes: `data-theme="dark"`, media: {} },
    { name: "dark by preference", attributes: "", media: { colorScheme: "dark" } },
    { name: "high contrast", attributes: `data-contrast="high"`, media: {} },
    { name: "high contrast by preference", attributes: "", media: { contrast: "more" } },
  ] as const;

  it("reach 4.5:1 on every surface, in every theme, primary to muted", async () => {
    const css = ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file));
    const failures: string[] = [];
    for (const theme of themes) {
      const page = await browser.newPage();
      await page.emulateMedia(theme.media);
      await page.setContent(`<!doctype html><html ${theme.attributes}><body><span id="probe"></span></body></html>`);
      for (const path of css) await page.addStyleTag({ path });
      const ratios = await page.evaluate(({ texts, surfaces }) => {
        const probe = document.querySelector<HTMLElement>("#probe")!;
        // Resolve the token (a color-mix) as the browser paints it: computed, then drawn to sRGB.
        const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const luminance = (token: string) => {
          probe.style.color = `var(${token})`;
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = getComputedStyle(probe).color;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        return texts.map((text) => surfaces.map((surface) => {
          const [light, dark] = [luminance(text), luminance(surface)].sort((a, b) => b - a);
          return (light! + 0.05) / (dark! + 0.05);
        }));
      }, { texts, surfaces });
      texts.forEach((text, row) => surfaces.forEach((surface, column) => {
        // Field hints resolve against their field, rather than every unrelated tinted surface.
        if (text === "--ui-control-placeholder" && surface !== "--ui-control-surface") return;
        const ratio = ratios[row]![column]!;
        if (ratio < 4.5) failures.push(`${theme.name}: ${text} on ${surface} is ${ratio.toFixed(2)}:1`);
      }));
      // The hierarchy holds: each step is lighter than the one above it, on the page.
      const [primary, secondary, muted] = ["--ui-text", "--ui-text-secondary", "--ui-text-muted"].map((token) => ratios[texts.indexOf(token)]![0]!);
      if (!(primary > secondary && secondary > muted)) {
        failures.push(`${theme.name}: primary ${primary.toFixed(2)}, secondary ${secondary.toFixed(2)}, muted ${muted.toFixed(2)} are out of order`);
      }
      await page.close();
    }
    assert.deepEqual(failures, []);
  });

  it("keep warning text readable when a theme picks a bright amber", async () => {
    // Amber is the lightest intent, so a theme's vivid warning seed must not drag its text under 4.5:1.
    const css = ["tokens.css", "theme-light.css"].map((file) => join(root, file));
    const failures: string[] = [];
    for (const seed of ["#cc8800", "#e5a000"]) {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html><body><span id="probe"></span></body></html>`);
      for (const path of css) await page.addStyleTag({ path });
      await page.addStyleTag({ content: `:root { --ui-warning: ${seed}; }` });
      const ratios = await page.evaluate((surfaces) => {
        const probe = document.querySelector<HTMLElement>("#probe")!;
        const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const luminance = (token: string) => {
          probe.style.color = `var(${token})`;
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = getComputedStyle(probe).color;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        return surfaces.map((surface) => {
          const [light, dark] = [luminance("--ui-warning-subtle-text"), luminance(surface)].sort((a, b) => b - a);
          return [surface, (light! + 0.05) / (dark! + 0.05)] as const;
        });
      }, ["--ui-surface", "--ui-surface-subtle", "--ui-surface-muted", "--ui-warning-soft"]);
      for (const [surface, ratio] of ratios) {
        if (ratio < 4.5) failures.push(`${seed}: warning text on ${surface} is ${ratio.toFixed(2)}:1`);
      }
      await page.close();
    }
    assert.deepEqual(failures, []);
  });
});
