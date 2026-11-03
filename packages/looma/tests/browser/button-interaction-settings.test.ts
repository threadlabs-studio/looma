import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { type Browser } from "playwright";
import { describe, it } from "vitest";
import { root, bundle, open, browser, loadFixture } from "../renderers/browser-driver";

describe("Button interaction settings", () => {
  for (const adapter of ["native", "Converted"]) for (const engine of ["Chromium", "WebKit"]) {
    it(`keeps ${adapter} interaction tone and variant inherited or distinct while hover and press differ in ${engine}`, async () => {
      const path = await bundle(`button-interaction-${adapter}`, adapter === "native" ? `
        import "@looma-test/runtime";
        import { componentRegistry } from "@nextwebwg/html-next/runtime";
        window.setInteraction = (tone, variant, restingVariant = "outline") => {
          componentRegistry.update(document.getElementById("target"), { variant: restingVariant, interactionTone: tone, interactionVariant: variant });
          componentRegistry.update(document.getElementById("reference"), { tone: tone === "inherit" ? "neutral" : tone, variant: variant === "inherit" ? restingVariant : variant });
        };
      ` : `
        import { createScene, sceneNode, stateObject } from "@looma-test/scene";
        import { UiButton as Button } from "@looma-test/components";
        const state = stateObject({ tone: "accent", variant: "outline", restingVariant: "outline" });
        window.setInteraction = (tone, variant, restingVariant = "outline") => Object.assign(state, { tone, variant, restingVariant });
        createScene({ render: () => [
          sceneNode(Button, { id: "baseline", tone: "neutral" }, () => "Baseline"),
          sceneNode(Button, { id: "inherits", tone: "neutral", interactionTone: "inherit", interactionVariant: "inherit" }, () => "Inherits"),
          sceneNode(Button, { id: "reference", tone: state.tone === "inherit" ? "neutral" : state.tone, variant: state.variant === "inherit" ? state.restingVariant : state.variant }, () => "Reference"),
          sceneNode(Button, { id: "target", tone: "neutral", variant: state.restingVariant, interactionTone: state.tone, interactionVariant: state.variant }, () => "Choose project"),
          sceneNode(Button, { id: "disabled", tone: "neutral", interactionTone: "accent", interactionVariant: "solid", disabled: true }, () => "Disabled"),
          sceneNode(Button, { id: "loading", tone: "neutral", interactionTone: "accent", interactionVariant: "solid", loading: true }, () => "Loading"),
        ] }).mount("#app");
      `);
      const driver = process.env.LOOMA_WEBKIT_MODULE || "playwright";
      const safari: Browser | undefined = engine === "WebKit" ? await (await import(/* @vite-ignore */ driver)).webkit.launch() : undefined;
      const page = await (safari ?? browser).newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      try {
        const markup = adapter === "native" ? `<ui-button id="baseline" tone="neutral">Baseline</ui-button><ui-button id="inherits" tone="neutral" interaction-tone="inherit" interaction-variant="inherit">Inherits</ui-button><ui-button id="reference" tone="accent">Reference</ui-button><ui-button id="target" tone="neutral" interaction-tone="accent" interaction-variant="outline">Choose project</ui-button><ui-button id="disabled" tone="neutral" interaction-tone="accent" interaction-variant="solid" disabled>Disabled</ui-button><ui-button id="loading" tone="neutral" interaction-tone="accent" interaction-variant="solid" loading>Loading</ui-button>` : '<div id="app"></div>';
        await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${markup}</body></html>`);
        for (const css of [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css"), join(dirname(path), "components.css")]) await page.addStyleTag({ path: css });
        await page.addStyleTag({ content: "* { transition: none !important; animation: none !important; } body { font-family: sans-serif; }" });
        await loadFixture(page, path);
        assert.equal(await page.locator("#target").getAttribute("data-interaction-appearance"), "outline");
        const paint = (id: string) => page.locator(`#${id}`).evaluate(element => {
          const style = getComputedStyle(element);
          return [style.backgroundColor, style.backgroundImage, style.borderTopColor, style.color, style.boxShadow];
        });
        // These static fixtures disable transitions; direct pointer movement avoids an actionability
        // animation-frame wait for every repeated paint sample in the palette matrix.
        const moveTo = async (id: string) => {
          const box = await page.locator(`#${id}`).boundingBox(); assert.ok(box);
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        };
        const configure = async (tone: string, variant: string, restingVariant = "outline") => {
          await page.evaluate(({ tone, variant, restingVariant }) => (window as unknown as { setInteraction: (tone: string, variant: string, restingVariant: string) => void }).setInteraction(tone, variant, restingVariant), { tone, variant, restingVariant });
          const appearance = tone === "inherit" && variant === "inherit" ? null : variant === "inherit" ? restingVariant : variant;
          await page.waitForFunction(appearance => document.getElementById("target")?.getAttribute("data-interaction-appearance") === appearance, appearance);
        };
        for (const mode of ["light", "dark"]) {
          await page.locator("html").evaluate((element, mode) => element.setAttribute("data-theme", mode), mode);
          await page.mouse.move(0, 0);
          const resting = await paint("baseline");
          assert.deepEqual(await paint("inherits"), resting, "explicit inherit and omitted settings keep existing paint");
          const tones = engine === "WebKit" ? ["inherit", "accent", "neutral"] : ["inherit", "accent", "neutral", "accent-secondary", "accent-tertiary", "danger", "success", "warning", "info"];
          for (const tone of tones) for (const variant of ["inherit", "outline", "solid", "ghost"]) {
            await configure(tone, variant);
            await page.mouse.move(0, 0);
            assert.deepEqual(await paint("target"), resting, "interaction settings leave resting paint unchanged");
            const capture = async (state: string) => {
              if (process.env.LOOMA_SCREENSHOT_DIR && adapter === "Converted" && engine === "WebKit" && mode === "light" && tone === "accent" && variant === "outline") await page.locator("#target").screenshot({ path: join(process.env.LOOMA_SCREENSHOT_DIR, `button-interaction-${state}.png`) });
            };
            await capture("rest");
            const size = await page.locator("#target").evaluate(element => [element.clientWidth, element.clientHeight]);
            await moveTo("target");
            const hover = await paint("target");
            await capture("hover");
            await page.mouse.down();
            const pressed = await paint("target");
            await capture("pressed");
            assert.notDeepEqual(pressed, hover, `${mode}/${tone}/${variant}: press remains visibly distinct from hover`);
            assert.deepEqual(await page.locator("#target").evaluate(element => [element.clientWidth, element.clientHeight]), size, "interaction paint preserves layout geometry");
            await page.mouse.up();
            await moveTo("reference");
            assert.deepEqual(hover, await paint("reference"), `${mode}/${tone}/${variant}: hover uses the ordinary variant and tone treatment`);
            await page.mouse.down();
            assert.deepEqual(pressed, await paint("reference"), `${mode}/${tone}/${variant}: active uses the ordinary variant and tone treatment`);
            await page.mouse.up();
          }
          await configure("accent", "inherit", "card");
          await moveTo("target"); const cardHover = await paint("target");
          await page.mouse.down(); const cardPressed = await paint("target"); await page.mouse.up();
          await moveTo("reference");
          assert.deepEqual(cardHover, await paint("reference"), "inherited card paint stays a card while its interaction tone changes");
          await page.mouse.down(); assert.deepEqual(cardPressed, await paint("reference")); await page.mouse.up();
          await configure("neutral", "solid");
          const custom = await page.addStyleTag({ content: "#target, #reference { --ui-button-text: rgb(12 34 56); --ui-button-hover-surface: rgb(230 235 240); --ui-button-active-surface: rgb(210 220 230); }" });
          await moveTo("target"); const customHover = await paint("target");
          await page.mouse.down(); const customPressed = await paint("target"); await page.mouse.up();
          await moveTo("reference"); assert.deepEqual(customHover, await paint("reference"), "interaction paint honors the variant's supported custom colors");
          await page.mouse.down(); assert.deepEqual(customPressed, await paint("reference")); await page.mouse.up();
          await custom.evaluate(element => element.remove());
          for (const id of ["disabled", "loading"]) {
            await page.mouse.move(0, 0); const rest = await paint(id);
            await moveTo(id); await page.mouse.down();
            assert.deepEqual(await paint(id), rest, "unavailable controls do not gain interaction emphasis");
            await page.mouse.up();
          }
        }
        await configure("accent", "outline");
        if (engine === "Chromium") {
          await page.mouse.move(0, 0);
          await page.keyboard.press("Tab");
          for (const id of ["target", "baseline"]) {
            await page.locator(`#${id}`).focus();
            assert.equal(await page.locator(`#${id}`).evaluate(element => element.matches(":focus-visible")), true);
            await page.keyboard.down("Space");
            assert.equal(await page.locator(`#${id}`).evaluate(element => element.matches(":active")), true);
            const halo = await page.locator(`#${id}`).evaluate(element => {
              const probe = document.createElement("span"); probe.style.boxShadow = "var(--ui-focus-halo)"; element.append(probe);
              const value = getComputedStyle(probe).boxShadow; probe.remove(); return value;
            });
            assert.ok((await paint(id))[4].includes(halo), `${id}: keyboard press retains the focus halo`);
            await page.keyboard.up("Space");
          }
          await page.locator("#target").blur(); await page.mouse.move(0, 0);
          await page.locator("#target").evaluate(element => {
            element.addEventListener("pointerdown", event => element.setAttribute("data-touch-pointer", `${(event as PointerEvent).pointerType}:${event.isTrusted}`), { once: true });
            element.addEventListener("click", event => element.setAttribute("data-touch-activation", String(event.isTrusted)), { once: true });
          });
          // Touch emulation does not expose :active consistently across hosts. Real mouse/keyboard
          // presses above verify its paint; a trusted touchscreen tap verifies activation separately.
          await page.locator("#target").tap();
          assert.equal(await page.locator("#target").getAttribute("data-touch-pointer"), "touch:true");
          assert.equal(await page.locator("#target").getAttribute("data-touch-activation"), "true");
        }
      } finally { await page.close(); await safari?.close(); }
    });
  }
});
