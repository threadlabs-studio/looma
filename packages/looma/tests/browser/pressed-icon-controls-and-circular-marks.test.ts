import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Pressed icon controls and circular marks", () => {
  it("keeps card corner geometry consistent when changing danger tone in either writing direction", async () => {
    const path = await bundle('card-tone-geometry', 'import "@looma-test/runtime";');
    const page = await open(path, '<ui-card id="ordinary">Ordinary</ui-card><ui-card id="danger" tone="danger">Danger</ui-card>', [join(root, 'tokens.css')]);
    for (const direction of ['ltr', 'rtl']) {
      await page.locator('body').evaluate((element, direction) => element.setAttribute('dir', direction), direction);
      const radii = await page.locator('#ordinary, #danger').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius];
      }));
      assert.deepEqual(radii[1], radii[0], direction);
      const borders = await page.locator('#danger').evaluate(element => {
        const style = getComputedStyle(element);
        return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth];
      });
      assert.equal(new Set(borders).size, 1, 'danger tone never adds an accent stripe');
    }
    await page.close();
  });
  it("keeps a translated icon button centered while pressed in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-pressed-translation`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiIconButton as IconButton } from "@looma-test/components";
        createScene({ render: () => sceneNode(IconButton, { id: "action", label: "Toggle panel", class: "positioned" }, () => "X") }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-icon-button id="action" label="Toggle panel" class="positioned">X</ui-icon-button>' : '<div id="app"></div>', [join(root, "tokens.css")]);
      const button = page.getByRole("button", { name: "Toggle panel" });
      await page.addStyleTag({ content: ".positioned { position: fixed; top: 50%; left: 200px; transform: translateY(-50%); }" });
      const before = (await button.boundingBox())!;
      await button.hover();
      await page.mouse.down();
      await page.waitForTimeout(200);
      const during = (await button.boundingBox())!;
      assert.ok(Math.abs(before.y + before.height / 2 - during.y - during.height / 2) < 1, "pressing retains the translated center");
      assert.equal(await button.evaluate(element => getComputedStyle(element).scale), "0.96", "press feedback composes with positioning transforms");
      await page.mouse.up();
      await page.close();
    }
  });

  it("shows a neutral rounded bar until hover or keyboard focus in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-bar-guide`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiIconButton as IconButton, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => sceneNode(IconButton, { id: "action", label: "Toggle panel", tone: "neutral", anticipatory: true, guide: "bar" }, () => sceneNode(Icon, { name: "panel-left-close" })) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-icon-button id="action" label="Toggle panel" tone="neutral" anticipatory guide="bar"><ui-icon name="panel-left-close"></ui-icon></ui-icon-button>' : '<div id="app"></div>', [join(root, "tokens.css")], { reducedMotion: "reduce" });
      const button = page.getByRole("button", { name: "Toggle panel" });
      await page.mouse.move(600, 400);
      const guide = await button.evaluate(element => {
        const style = getComputedStyle(element, "::before");
        const sample = document.createElement("span");
        sample.style.backgroundColor = "var(--ui-border-strong)";
        element.append(sample);
        const neutral = getComputedStyle(sample).backgroundColor;
        sample.remove();
        return { width: style.width, height: style.height, opacity: style.opacity, color: style.backgroundColor, neutral, radius: parseFloat(style.borderRadius), icon: getComputedStyle(element.querySelector(".content")!).opacity };
      });
      assert.equal(guide.width, "2px");
      assert.equal(guide.height, "20px");
      assert.equal(guide.opacity, "1", "the guide is always discoverable at rest");
      assert.notEqual(guide.color, "rgba(0, 0, 0, 0)");
      assert.equal(guide.color, guide.neutral, "the idle bar uses neutral border ink");
      assert.ok(guide.radius >= 2);
      assert.equal(guide.icon, "0");
      await button.hover();
      assert.equal(await button.locator(".content").evaluate(element => getComputedStyle(element).opacity), "1");
      assert.equal(await button.evaluate(element => getComputedStyle(element, "::before").opacity), "0");
      await page.mouse.move(600, 400);
      await page.keyboard.press("Tab");
      assert.equal(await button.evaluate(element => element.matches(":focus-visible")), true);
      assert.equal(await button.locator(".content").evaluate(element => getComputedStyle(element).opacity), "1");
      await page.close();
    }
  });

  it("dismisses action hints on activation and retains only keyboard focus hints in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-action-tooltip`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiIconButton as IconButton, UiTooltip as Tooltip } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", [sceneNode(IconButton, { id: "action", label: "Toggle panel" }, () => "X"), sceneNode(Tooltip, { id: "hint", for: "action", showDelay: 100, hideDelay: 0 }, () => "Toggle panel"), sceneNode("button", { id: "next" }, "Next")]) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-icon-button id="action" label="Toggle panel">X</ui-icon-button><ui-tooltip id="hint" for="action" show-delay="100" hide-delay="0">Toggle panel</ui-tooltip><button id="next">Next</button>' : '<div id="app"></div>', [join(root, "tokens.css")]);
      const button = page.getByRole("button", { name: "Toggle panel" }), hint = page.locator("#hint");
      await button.click();
      await page.waitForTimeout(150);
      await expect.poll(() => hint.isVisible(), { message: "a quick action cancels its pending hover hint" }).toBe(false);
      await page.mouse.move(600, 400);
      await button.hover();
      await hint.waitFor({ state: "visible" });
      await button.click();
      await page.waitForTimeout(150);
      await expect.poll(() => hint.isVisible(), { message: "activation dismisses the hint even with pointer focus and hover retained" }).toBe(false);
      assert.equal(await button.evaluate(element => element === document.activeElement), true, "activation preserves button focus");
      await page.mouse.move(600, 400);
      await expect.poll(() => hint.isVisible(), { message: "pointer focus cannot retain a tooltip" }).toBe(false);
      await button.hover();
      await hint.waitFor({ state: "visible" });
      await page.mouse.move(600, 400);
      await hint.waitFor({ state: "hidden" });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await hint.waitFor({ state: "visible" });
      await page.mouse.move(600, 400);
      await expect.poll(() => hint.isVisible(), { message: "keyboard focus retains the hint" }).toBe(true);
      await button.press("Enter");
      await hint.waitFor({ state: "hidden" });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      assert.equal(await button.evaluate(element => element === document.activeElement), true, "keyboard navigation returns focus to the action");
      await hint.waitFor({ state: "visible" });
      await button.press("Space");
      await hint.waitFor({ state: "hidden" });
      await page.close();
    }
  });

  it("opens a tooltip whose trigger already has keyboard focus when it attaches, in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-focused-trigger-tooltip`, adapter === "html" ? `import "@looma-test/runtime";
        window.attach = () => document.body.insertAdjacentHTML("beforeend", '<ui-tooltip id="hint" for="action">Act now</ui-tooltip>');
      ` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiTooltip as Tooltip } from "@looma-test/components";
        const shown = createState(false);
        window.attach = () => { shown.value = true; };
        createScene({ render: () => sceneNode("div", [sceneNode("button", { id: "action" }, "Act"), shown.value ? sceneNode(Tooltip, { id: "hint", for: "action" }, () => "Act now") : null]) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<button id="action">Act</button>' : '<div id="app"></div>', [join(root, "tokens.css")]);
      await page.keyboard.press("Tab");
      assert.equal(await page.locator("#action").evaluate(element => element.matches(":focus-visible")), true);
      await page.evaluate(() => (window as unknown as { attach: () => void }).attach());
      await page.locator("#hint").waitFor({ state: "visible", timeout: 2_000 });
      await page.close();
    }
  });

  it("trims optional text edges for aligned headers while preserving prose in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-text-trim`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCard as Card, UiCluster as Cluster, UiText as Text, UiButton as Button } from "@looma-test/components";
        createScene({ render: () => sceneNode(Card, { id: "panel", padding: "sm" }, () => [
          sceneNode(Cluster, { id: "header", align: "center", gap: "s", wrap: "nowrap" }, () => [
            sceneNode("svg", { id: "mark", width: 16, height: 16, "aria-hidden": true }, () => sceneNode("circle", { cx: 8, cy: 8, r: 7 })),
            sceneNode(Text, { id: "title", as: "h2", size: "lg", weight: "semibold", trim: true }, () => "Continue your conversation")
          ]),
          sceneNode(Text, { id: "prose", size: "lg" }, () => "Ordinary prose keeps its existing leading."),
          sceneNode(Text, { id: "clipped", trim: true, truncate: true, style: { width: "80px" } }, () => "Typography with hanging gyp descenders"),
          sceneNode(Button, { id: "continue" }, () => "Continue")
        ]) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-card id="panel" padding="sm">
          <ui-cluster id="header" align="center" gap="s" wrap="nowrap">
            <svg id="mark" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="7"></circle></svg>
            <ui-text id="title" as="h2" size="lg" weight="semibold" trim>Continue your conversation</ui-text>
          </ui-cluster>
          <ui-text id="prose" size="lg">Ordinary prose keeps its existing leading.</ui-text>
          <ui-text id="clipped" trim truncate style="width:80px">Typography with hanging gyp descenders</ui-text>
          <ui-button id="continue">Continue</ui-button>
        </ui-card>
      ` : '<div id="app"></div>', [join(root, "tokens.css")]);
      await page.waitForSelector('#title:is([component~="ui-text"], [data-component~="ui-text"], .ui-text, [ui-text])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.evaluate(() => {
          const title = document.getElementById("title")!, prose = document.getElementById("prose")!;
          const text = title.getBoundingClientRect(), icon = document.getElementById("mark")!.getBoundingClientRect();
          return { trim: getComputedStyle(title).textBoxTrim, edge: getComputedStyle(title).textBoxEdge,
            clippedY: getComputedStyle(document.getElementById("clipped")!).overflowY,
            clippedX: getComputedStyle(document.getElementById("clipped")!).overflowX,
            proseTrim: getComputedStyle(prose).textBoxTrim, proseLeading: getComputedStyle(prose).lineHeight,
            titleHeight: text.height, proseHeight: prose.getBoundingClientRect().height,
            centerOffset: Math.abs(text.y + text.height / 2 - icon.y - icon.height / 2) };
        });
        assert.equal(geometry.trim, "trim-both", `${adapter}/${width}: explicit text trim is applied`);
        assert.equal(geometry.edge, "cap alphabetic");
        assert.equal(geometry.proseTrim, "none", "prose retains its default font metrics");
        assert.equal(geometry.clippedY, "visible", "trimmed truncation keeps descending ink visible");
        assert.equal(geometry.clippedX, "clip", "long labels remain clipped horizontally");
        assert.ok(geometry.titleHeight < parseFloat(geometry.proseLeading), "trimmed header removes extra line-edge space");
        assert.ok(geometry.centerOffset < 1, "header text and identifying mark share a center");
      }
      await page.close();
    }
  });

  it("keeps a readable Container bounded around scrolling content in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-container-fill`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiContainer as Container, UiStack as Stack, UiScrollArea as ScrollArea, UiButton as Button } from "@looma-test/components";
        createScene({ render: () => sceneNode(Container, { id: "reading", fill: true }, () => sceneNode(Stack, { fill: true }, () => [
          sceneNode(ScrollArea, { id: "scroll", fill: true }, () => Array.from({ length: 50 }, (_, i) => sceneNode("p", "Reading line " + i))),
          sceneNode(Button, { id: "continue" }, () => "Continue")
        ])) }).mount("#app");
      `);
      const content = adapter === "html" ? `<ui-container id="reading" fill><ui-stack fill><ui-scroll-area id="scroll" fill>${Array.from({ length: 50 }, (_, i) => `<p>Reading line ${i}</p>`).join("")}</ui-scroll-area><ui-button id="continue">Continue</ui-button></ui-stack></ui-container>` : "";
      const page = await open(path, `<div id="app" style="display:grid;height:320px;width:100%">${content}</div>`,
        [join(root, "tokens.css")]);
      await page.waitForSelector('#reading:is([component~="ui-container"], [data-component~="ui-container"], .ui-container, [ui-container])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.evaluate(() => {
          const frame = document.querySelector("#app")!.getBoundingClientRect(), reading = document.querySelector("#reading")!.getBoundingClientRect();
          const action = document.querySelector("#continue")!.getBoundingClientRect(), scroll = document.querySelector("#scroll")!;
          return { height: reading.height, frameHeight: frame.height, width: reading.width, frameWidth: frame.width,
            centered: Math.abs((reading.left + reading.right - frame.left - frame.right) / 2), actionBottom: action.bottom, frameBottom: frame.bottom,
            scrolls: scroll.scrollHeight > scroll.clientHeight };
        });
        assert.equal(geometry.height, geometry.frameHeight, `${adapter}/${width}: fills the bounded parent`);
        assert.ok(geometry.actionBottom <= geometry.frameBottom + 1, "action remains inside the panel");
        assert.ok(geometry.scrolls, "long content scrolls instead of expanding the panel");
        assert.ok(geometry.centered < 1, `${adapter}/${width}: reading column remains centered ${JSON.stringify(geometry)}`);
        assert.ok(width === 375 ? geometry.width <= geometry.frameWidth : geometry.width < geometry.frameWidth, "readable measure remains bounded");
      }
      await page.close();
    }
  });

  it("keeps an accent outline toggle pressed after release in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-pressed-icon`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiIconButton as IconButton, UiIcon as Icon, UiTooltip as Tooltip } from "@looma-test/components";
        createScene({ render: () => [
          sceneNode(IconButton, { id: "toggle", label: "Notifications", variant: "outline", tone: "accent", anticipatory: true, "aria-pressed": true }, () => sceneNode(Icon, { name: "bell" })),
          sceneNode(IconButton, { id: "neutral", label: "Neutral", variant: "outline" }, () => sceneNode(Icon, { name: "bell" })),
          sceneNode(Tooltip, { for: "toggle" }, () => "Notifications")
        ] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-icon-button id="toggle" label="Notifications" variant="outline" tone="accent" anticipatory aria-pressed="true"><ui-icon name="bell"></ui-icon></ui-icon-button>
        <ui-icon-button id="neutral" label="Neutral" variant="outline"><ui-icon name="bell"></ui-icon></ui-icon-button>
        <ui-tooltip for="toggle">Notifications</ui-tooltip>
      ` : '<div id="app"></div>', [join(root, "tokens.css")], { reducedMotion: "reduce" });
      const paint = (id: string) => page.locator(id).evaluate(element => {
        const style = getComputedStyle(element);
        return { border: style.borderColor, color: style.color, surface: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow,
          iconOpacity: getComputedStyle(element.querySelector(".content")!).opacity };
      });
      await page.waitForSelector('#toggle:is([component~="ui-icon-button"], [data-component~="ui-icon-button"], .ui-icon-button, [ui-icon-button])');
      const selected = await paint("#toggle");
      assert.ok(selected.shadow.includes("inset"), `${adapter}: selected control stays inset at rest`);
      assert.equal(selected.image, "none");
      assert.equal(selected.iconOpacity, "1", "selected anticipatory control remains visible");
      assert.notEqual(selected.border, (await paint("#neutral")).border);
      await page.locator("#toggle").click();
      await expect.poll(() => page.locator("#toggle").getAttribute("aria-pressed"), { message: "consumer owns toggle state" }).toBe("true");
      await page.mouse.move(300, 200);
      await page.locator("#toggle").blur();
      assert.ok((await paint("#toggle")).shadow.includes("inset"));
      await page.locator("#toggle").focus();
      await expect.poll(() => page.getByRole("tooltip").isVisible(), { message: "mouse-origin focus does not revive an activated hint" }).toBe(false);
      await page.locator("#neutral").focus();
      await page.keyboard.press("Shift+Tab");
      assert.ok((await paint("#toggle")).shadow.includes("inset"), "keyboard focus keeps selected state");
      await page.getByRole("tooltip").waitFor({ state: "visible" });
      await page.locator("#toggle").evaluate(element => {
        element.setAttribute("aria-pressed", "false");
      });
      assert.notEqual((await paint("#toggle")).surface, selected.surface, "native state update releases the wash");
      await page.locator("#toggle").evaluate(element => element.setAttribute("aria-pressed", "true"));
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(await page.locator("#toggle").evaluate(element => getComputedStyle(element).outlineStyle), "solid", "pressed state survives forced colors");
      await page.emulateMedia({ forcedColors: "none" });
      await page.locator("#toggle").evaluate(element => { element.setAttribute("aria-pressed", "true"); (element as HTMLButtonElement).disabled = true; });
      assert.equal((await paint("#toggle")).shadow, "none", "disabled overrides selected elevation");
      await page.close();
    }
  });

  it("centers visible circular glyphs with fixed geometry in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-circle-badge`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiButton as Button, UiCluster as Cluster, UiIcon as Icon, UiIconButton as IconButton } from "@looma-test/components";
        createScene({ render: () => [sceneNode(Badge, { id: "small", shape: "circle", size: "xs", variant: "outline", "aria-label": "Category D" }, () => "D"),
          sceneNode(Badge, { id: "letter", shape: "circle", size: "xs", variant: "outline", "aria-label": "Category R" }, () => "R"),
          sceneNode(Badge, { id: "count", shape: "circle", size: "xs" }, () => "3"),
          sceneNode(Badge, { id: "double", shape: "circle", size: "xs" }, () => "12"),
          sceneNode(Badge, { id: "large", shape: "circle", size: "lg" }, () => "30"),
          sceneNode(Badge, { id: "maximum", shape: "circle", size: "lg" }, () => "99+"),
          sceneNode(Badge, { id: "medium", shape: "circle", tone: "accent" }, () => sceneNode(Icon, { name: "check" })),
          sceneNode(Cluster, { align: "center", wrap: "nowrap" }, () => [
            sceneNode(Button, { id: "joined-primary", variant: "solid", size: "sm", "aria-label": "Submit 120 items" }, () => ["Submit", sceneNode(Badge, { id: "joined-count", shape: "circle", size: "lg", variant: "inverse", tone: "accent", "aria-hidden": "true" }, () => "99+")]),
            sceneNode(IconButton, { id: "joined-menu", variant: "solid", size: "sm", matchButton: true, label: "More actions" }, () => sceneNode(Icon, { name: "chevron-down" }))]) ] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-badge id="small" shape="circle" size="xs" variant="outline" aria-label="Category D">D</ui-badge><ui-badge id="letter" shape="circle" size="xs" variant="outline" aria-label="Category R">R</ui-badge><ui-badge id="count" shape="circle" size="xs">3</ui-badge><ui-badge id="double" shape="circle" size="xs">12</ui-badge><ui-badge id="large" shape="circle" size="lg">30</ui-badge><ui-badge id="maximum" shape="circle" size="lg">99+</ui-badge><ui-badge id="medium" shape="circle" tone="accent"><ui-icon name="check"></ui-icon></ui-badge><ui-cluster align="center" wrap="nowrap"><ui-button id="joined-primary" variant="solid" size="sm" aria-label="Submit 120 items">Submit <ui-badge id="joined-count" shape="circle" size="lg" variant="inverse" tone="accent" aria-hidden="true">99+</ui-badge></ui-button><ui-icon-button id="joined-menu" variant="solid" size="sm" match-button label="More actions"><ui-icon name="chevron-down"></ui-icon></ui-icon-button></ui-cluster>' : '<div id="app"></div>',
        [join(root, "tokens.css")]);
      await page.waitForSelector('#small:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        for (const font of ["system-ui", "Arial"]) {
          await page.addStyleTag({ content: `:root { --ui-font-family-sans: ${font}; }` });
          const primary = (await page.locator("#joined-primary").boundingBox())!, companion = (await page.locator("#joined-menu").boundingBox())!;
          assert.ok(Math.abs(primary.height - companion.height) < 0.5 && Math.abs(primary.y - companion.y) < 0.5, `${adapter}/${width}/${font}: matching control height with a large nested count`);
          for (const [id, expected] of [["small", 16], ["letter", 16], ["count", 16], ["double", 16], ["large", 32], ["maximum", 32], ["joined-count", 32], ["medium", 24]] as const) {
            const geometry = await page.locator(`#${id}`).evaluate(element => {
              const box = element.getBoundingClientRect(), label = element.querySelector(".label")!.getBoundingClientRect();
              return { width: box.width, height: box.height, x: (label.left + label.right - box.left - box.right) / 2, y: (label.top + label.bottom - box.top - box.bottom) / 2,
                clip: getComputedStyle(element.querySelector(".label")!).clipPath };
            });
            assert.equal(geometry.width, expected, `${adapter}/${width}/${id}`);
            assert.equal(geometry.height, expected, `${adapter}/${width}/${id}`);
            assert.ok(Math.abs(geometry.x) < 1 && Math.abs(geometry.y) < 1, `${adapter}/${width}/${id}: centered glyph ${JSON.stringify(geometry)}`);
            assert.equal(geometry.clip, "none", "circle content remains visible");
            if (id !== "medium") {
              const measureTextOffset = () => page.locator(`#${id}`).evaluate(element => {
                const label = element.querySelector(".label")!, range = document.createRange();
                range.selectNodeContents(label);
                const text = range.getBoundingClientRect(), box = element.getBoundingClientRect();
                const canvas = document.createElement("canvas").getContext("2d")!;
                canvas.font = getComputedStyle(label).font;
                const metrics = canvas.measureText(label.textContent!);
                // Horizontally, center the advance: the font's asymmetric side bearings belong to the glyph.
                // Vertically, a centered line box alone does not prove that capital/numeral ink is centered.
                const baseline = text.bottom - metrics.fontBoundingBoxDescent;
                return { y: baseline - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 - (box.top + box.bottom) / 2,
                  x: text.left + metrics.width / 2 - (box.left + box.right) / 2,
                  width: metrics.width, available: box.width - 2 * parseFloat(getComputedStyle(element).borderLeftWidth) };
              });
              const textOffset = await measureTextOffset();
              assert.ok(Math.abs(textOffset.y) < 0.5 && Math.abs(textOffset.x) < 0.5, `${adapter}/${width}/${font}/${id}: centered text offset ${JSON.stringify(textOffset)}`);
              assert.ok(textOffset.width <= textOffset.available, `${adapter}/${width}/${font}/${id}: complete text fits inside the circle ${JSON.stringify(textOffset)}`);
              if (id === "letter") {
                // Prove that each measurement still rejects a real layout shift, including this asymmetric glyph.
                for (const [axis, transform] of [["x", "translateX(1px)"], ["y", "translateY(1px)"]] as const) {
                  await page.locator(`#${id} .label`).evaluate((label, transform) => { (label as HTMLElement).style.transform = transform; }, transform);
                  assert.ok(Math.abs((await measureTextOffset())[axis]) >= 0.5, `${adapter}/${width}/${font}: detects a shifted ${axis} axis`);
                }
                await page.locator(`#${id} .label`).evaluate(label => { (label as HTMLElement).style.removeProperty("transform"); });
              }
            }
          }
        }
      }
      await page.close();
    }
  });

  it("keeps translucent inverse counts readable on filled controls in both themes", async () => {
    const tones = ["accent", "neutral", "danger", "success", "warning", "info"];
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-inverse-count-overlay`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiButton as Button } from "@looma-test/components";
        createScene({ render: () => ${JSON.stringify(tones)}.map(tone => sceneNode(Button, { variant: "solid", tone }, () => ["Submit", sceneNode(Badge, { id: tone, shape: "circle", size: "lg", variant: "inverse", tone }, () => "99+")])) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? tones.map(tone => `<ui-button variant="solid" tone="${tone}">Submit <ui-badge id="${tone}" shape="circle" size="lg" variant="inverse" tone="${tone}">99+</ui-badge></ui-button>`).join(" ") : '<div id="app"></div>',
        [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")]);
      await page.waitForSelector('#accent:is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])');
      await page.addStyleTag({ content: ":root { --ui-motion-fast: 0ms; --ui-motion-base: 0ms; }" });
      // Both on-fill polarities must remain readable in either document scheme.
      for (const [sample, pigment, onFill] of [["default", "", ""], ["deep", "#271a54", "#ffffff"], ["pale", "#ffdd55", "#000000"], ["middle", "#767676", "#000000"]]) {
        await page.evaluate(({tones,pigment,onFill}) => {
          for (const tone of tones.filter(tone => tone !== "neutral")) {
            for (const [property,value] of [["--ui-" + tone,pigment],["--ui-on-" + tone,onFill],["--ui-" + tone + "-on-strong",onFill]]) {
              if (value) document.documentElement.style.setProperty(property,value);
              else document.documentElement.style.removeProperty(property);
            }
          }
        }, {tones,pigment,onFill});
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
          const overlays = await page.locator(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluateAll(elements => elements.map(element => {
            const style = getComputedStyle(element), control = getComputedStyle(element.closest("button")!);
            const context = document.createElement("canvas").getContext("2d")!;
            const paint = (colour: string) => { context.fillStyle = colour; context.fillRect(0, 0, 1, 1); };
            const luminance = () => {
              const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
              return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
            };
            context.clearRect(0, 0, 1, 1); paint(style.backgroundColor);
            const opacity = context.getImageData(0, 0, 1, 1).data[3]! / 255;
            context.clearRect(0, 0, 1, 1); paint(style.borderTopColor);
            const borderOpacity = context.getImageData(0, 0, 1, 1).data[3]! / 255;
            const box = element.getBoundingClientRect();
            paint(control.backgroundColor); paint(style.backgroundColor); const background = luminance();
            paint(style.color); const ink = luminance();
            return { tone: element.id, opacity, borderOpacity, shadow: style.boxShadow, geometry: [box.width, box.height], foreground: style.color, surface: style.backgroundColor, control: control.backgroundColor, contrast: (Math.max(ink, background) + 0.05) / (Math.min(ink, background) + 0.05) };
          }));
          await writeFile(join(root, ".test-build", sample + "-" + `${adapter}-inverse-count-contrast-${theme}.json`), JSON.stringify(overlays, null, 2));
          for (const overlay of overlays) {
            assert.ok(theme === "light" ? overlay.opacity >= 0.64 && overlay.opacity <= 0.68 : overlay.opacity >= 0.54 && overlay.opacity <= 0.58, `${adapter}/${theme}/${overlay.tone}: a quiet tone-tinted overlay instead of a bright cutout ${JSON.stringify(overlay)}`);
            assert.ok(theme === "light" ? overlay.borderOpacity > overlay.opacity : overlay.borderOpacity < overlay.opacity, "the separate border offsets the filled count surface");
            assert.ok(!overlay.shadow.includes("inset") && overlay.shadow.split(/,(?![^()]*\))/).length === 1, "the circular mark has one subtle lift and no bevel");
            assert.deepEqual(overlay.geometry, [32, 32], "the circle geometry remains unchanged");
            assert.ok(overlay.contrast >= 4.5, `${adapter}/${theme}/${overlay.tone}: the composed count keeps readable contrast ${JSON.stringify(overlay)}`);
          }
        }
      }
      const countOpacity = () => page.locator("#accent").evaluate(element => {
        const context = document.createElement("canvas").getContext("2d")!;
        context.fillStyle = getComputedStyle(element).backgroundColor;
        context.fillRect(0, 0, 1, 1);
        return context.getImageData(0, 0, 1, 1).data[3]! / 255;
      });
      await page.evaluate(() => document.documentElement.style.setProperty("--ui-badge-circle-opacity", "50%"));
      assert.ok(Math.abs(await countOpacity() - 0.5) < 0.01, "the shared circle-opacity hook inherits from :root");
      await page.locator("#accent").evaluate(element => (element as HTMLElement).style.setProperty("--ui-badge-circle-opacity", "60%"));
      assert.ok(Math.abs(await countOpacity() - 0.6) < 0.01, "an explicit instance circle-opacity value overrides its default");
      await page.close();
    }
  });
});
