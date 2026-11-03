import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Shared action edges", () => {
  for (const adapter of ["html", "converted"]) {
    it(`shares fine raised action edges and retains quiet, focused and disabled ${adapter} controls`, async () => {
      const path = await bundle(`${adapter}-shared-action-edges`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiButton as Button, UiCluster as Cluster, UiIcon as Icon, UiIconButton as IconButton } from "@looma-test/components";
        const icon = () => sceneNode(Icon, { name: "chevron-down" });
        createScene({ render: () => [
          ...["3", "30", "99+"].map((count, index) => sceneNode(Cluster, { align: "center", wrap: "nowrap", style: { "--ui-cluster-gap": "0", "--ui-action-radius": "0" } }, () => [
            sceneNode(Button, { id: "primary-" + index, variant: "solid", tone: "accent", size: "sm" }, { default: () => "Submit", badge: () => sceneNode(Badge, { shape: "circle", size: "sm", variant: "inverse", tone: "accent" }, () => count) }),
            sceneNode(IconButton, { id: "more-" + index, variant: "solid", tone: "accent", size: "sm", matchButton: true, label: "More actions" }, icon),
          ])),
          sceneNode(Button, { id: "stop", variant: "solid", tone: "neutral" }, () => "Stop"),
          sceneNode(IconButton, { id: "stop-icon", variant: "solid", tone: "neutral", label: "Stop" }, icon),
          sceneNode(Button, { id: "outline", tone: "accent" }, () => "View changes"),
          sceneNode(IconButton, { id: "outline-icon", variant: "outline", tone: "accent", label: "More" }, icon),
          sceneNode(Button, { id: "ghost", variant: "ghost" }, () => "Quiet"),
          sceneNode(Button, { id: "link", variant: "link", href: "#" }, () => "Link"),
          sceneNode(IconButton, { id: "ghost-icon", label: "Quiet" }, icon),
          sceneNode(Button, { id: "disabled", variant: "solid", disabled: true }, () => "Disabled"),
          sceneNode(IconButton, { id: "disabled-icon", variant: "solid", disabled: true, label: "Disabled" }, icon),
        ] }).mount("#app");
      `);
      const body = adapter === "converted" ? '<div id="app"></div>' : ["3", "30", "99+"].map((count, index) => `
        <ui-cluster align="center" wrap="nowrap" style="--ui-cluster-gap: 0; --ui-action-radius: 0">
          <ui-button id="primary-${index}" variant="solid" tone="accent" size="sm">Submit <ui-badge slot="badge" shape="circle" size="sm" variant="inverse" tone="accent">${count}</ui-badge></ui-button>
          <ui-icon-button id="more-${index}" variant="solid" tone="accent" size="sm" match-button label="More actions"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        </ui-cluster>`).join("") + `
        <ui-button id="stop" variant="solid" tone="neutral">Stop</ui-button><ui-icon-button id="stop-icon" variant="solid" tone="neutral" label="Stop"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        <ui-button id="outline" tone="accent">View changes</ui-button>
        <ui-icon-button id="outline-icon" variant="outline" tone="accent" label="More"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        <ui-button id="ghost" variant="ghost">Quiet</ui-button><ui-button id="link" variant="link" href="#">Link</ui-button>
        <ui-icon-button id="ghost-icon" label="Quiet"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        <ui-button id="disabled" variant="solid" disabled>Disabled</ui-button><ui-icon-button id="disabled-icon" variant="solid" disabled label="Disabled"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>`;
      const page = await open(path, body, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")], { reducedMotion: "reduce" });
      try {
        await page.addStyleTag({ content: "body { font-family: var(--ui-font-family-sans); color: var(--ui-text-primary); background: var(--ui-surface-default); display: grid; gap: 16px; justify-items: start; } :root { --ui-motion-fast: 0ms; --ui-motion-base: 0ms; }" });
        const shadow = async (id: string) => (await page.locator("#" + id).evaluate(element => getComputedStyle(element).boxShadow)).split(/,(?![^()]*\))/).filter(layer => !layer.trim().startsWith("rgba(0, 0, 0, 0) ")).join(",");
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => document.documentElement.setAttribute("data-theme", theme), theme);
          assert.equal(await shadow("primary-0"), await shadow("more-0"), "text and icon actions share the same raised edge and shadow");
          assert.ok((await shadow("primary-0")).includes("1px 1px 0px 0px inset"), "a fine highlight at top/start");
          assert.ok((await shadow("primary-0")).includes("-1px -1px 0px 0px inset"), "a fine lowlight at bottom/end");
          assert.equal(await shadow("outline"), await shadow("outline-icon"), "outline actions use the same recipe");
          assert.equal(await shadow("stop"), await shadow("stop-icon"), "neutral filled actions share the restrained recipe");
          for (const id of ["primary-0", "more-0"]) {
            assert.equal(await page.locator("#" + id).evaluate(element => getComputedStyle(element).backgroundImage), "none", "resting filled accents have one edge without a face gradient");
            assert.equal((await shadow(id)).match(/inset/g)?.length, 2, "one highlight and one lowlight do not stack with another bevel");
            assert.equal((await shadow(id)).split(/,(?![^()]*\))/).length, 3, "the edge pair has only one ambient lift layer");
          }
          for (const id of ["outline", "outline-icon", "stop", "stop-icon"]) {
            const quietShadow = await shadow(id);
            assert.equal(quietShadow, await shadow("stop"), "outlines and neutral fills share quiet elevation");
            assert.ok(!quietShadow.includes("inset"), `${id} has no raised bevel`);
            assert.equal(quietShadow.split(/,(?![^()]*\))/).length, 1, `${id} retains one ambient lift layer`);
            assert.notEqual(quietShadow, "none", `${id} retains quiet elevation`);
          }
          for (const id of ["stop", "stop-icon"]) assert.equal(await page.locator("#" + id).evaluate(element => getComputedStyle(element).backgroundImage), "none", "neutral fills do not acquire an accent wash");
          for (const id of ["outline", "outline-icon"]) {
            const wash = async (state: string) => page.locator("#" + id).evaluate((element, state) => {
              const probe = document.createElement("span");
              probe.style.color = `var(--ui-accent-${state})`;
              element.append(probe);
              const color = getComputedStyle(probe).color;
              const background = getComputedStyle(element).backgroundImage;
              probe.remove();
              return { expected: `linear-gradient(${color}, ${color})`, background };
            }, state);
            await page.mouse.move(0, 0);
            let colors = await wash("wash");
            assert.ok(colors.background.startsWith(colors.expected), `${id} rests over a translucent accent wash`);
            await page.locator("#" + id).hover();
            colors = await wash("wash-hover");
            assert.ok(colors.background.startsWith(colors.expected), `${id} strengthens its accent wash on hover`);
          }
          await page.mouse.move(0, 0);
          for (const id of ["ghost", "link", "ghost-icon", "disabled", "disabled-icon"]) assert.equal(await shadow(id), "none", `${id} stays flat`);
          for (let index = 0; index < 3; index++) {
            const count = await page.locator(`#primary-${index} :is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])`).evaluate(element => {
              const rect = element.getBoundingClientRect(), range = document.createRange();
              range.selectNodeContents(element.querySelector(".label")!);
              return { width: rect.width, height: rect.height, text: range.getBoundingClientRect().width };
            });
            assert.deepEqual([count.width, count.height], [24, 24], "3, 30 and 99+ use the same real circle");
            assert.ok(count.text <= count.width - 2, "the bounded count fits inside its border");
          }
          assert.equal(await page.locator("#primary-0").evaluate(element => getComputedStyle(element).borderRightWidth), "1px", "the shared edge does not thicken the border");
          await page.keyboard.press("Tab");
          await page.locator("#primary-0").focus();
          assert.ok((await shadow("primary-0")).includes("inset"), "keyboard focus retains the raised edge beneath its halo");
          assert.ok((await shadow("primary-0")).includes("0px 0px 0px 3px"), "the text action keeps its visible focus halo");
          await page.locator("#more-0").focus();
          assert.ok((await shadow("more-0")).includes("inset"), "the companion keeps its edge beneath the focus halo");
          assert.ok((await shadow("more-0")).includes("0px 0px 0px 3px"), "the icon action keeps its visible focus halo");
          for (const id of ["ghost", "link", "ghost-icon"]) {
            await page.locator("#" + id).focus();
            assert.ok(!(await shadow(id)).includes("inset"), `${id} focuses without becoming raised`);
            if (id === "link") {
              const outline = await page.locator("#link").evaluate(element => { const style = getComputedStyle(element); return { width: style.outlineWidth, style: style.outlineStyle }; });
              assert.deepEqual(outline, { width: "2px", style: "solid" }, "the inline link keeps its visible outline focus");
            } else assert.ok((await shadow(id)).includes("0px 0px 0px 3px"), `${id} has visible keyboard focus`);
          }
          await page.locator("#ghost-icon").blur();
          for (const width of [1280, 375]) {
            await page.setViewportSize({ width, height: 720 });
            if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, ".test-build", `${adapter}-shared-action-edges-${theme}-${width}.png`) });
          }
          for (const id of ["primary-0", "more-0"]) {
            const rect = await page.locator("#" + id).boundingBox();
            assert.ok(rect);
            await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
            await page.mouse.down();
            assert.ok((await shadow(id)).includes("0px 1px 2px 0px inset"), `${id} uses the pressed inset instead of its raised edge`);
            assert.equal(await page.locator("#" + id).evaluate(element => getComputedStyle(element).backgroundImage), "none", "pressed actions lose the resting highlight");
            await page.mouse.up();
          }
          await page.evaluate(() => document.documentElement.dir = "rtl");
          assert.ok((await shadow("primary-0")).includes("-1px 1px 0px 0px inset"), "the leading highlight mirrors in RTL");
          assert.ok((await shadow("primary-0")).includes("1px -1px 0px 0px inset"), "the end lowlight mirrors in RTL");
          await page.evaluate(() => document.documentElement.dir = "ltr");
        }
        await page.evaluate(() => document.documentElement.style.setProperty("--ui-action-shadow", "0 0 0 2px rgb(1 2 3)"));
        assert.equal(await shadow("primary-0"), await shadow("more-0"), "one ancestor action-group value themes both controls");
        assert.ok((await shadow("primary-0")).includes("0px 0px 0px 2px"));
        await page.locator("#primary-0").evaluate(element => (element as HTMLElement).style.setProperty("--ui-button-solid-shadow", "none"));
        assert.equal(await shadow("primary-0"), "none", "an instance hook wins over its action-group theme");
      } finally { await page.close(); }
      const touch = await open(path, body, [join(root, "tokens.css")], { viewport: { width: 375, height: 720 }, hasTouch: true, isMobile: true });
      try {
        const heights = await touch.locator('#primary-0, #more-0').evaluateAll(elements => elements.map(element => element.getBoundingClientRect().height));
        assert.deepEqual(heights, [32, 32], "primary and companion retain the same compact visible geometry on touch");
      } finally { await touch.close(); }
    });
  }
});
