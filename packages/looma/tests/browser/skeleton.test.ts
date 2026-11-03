import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Skeleton", () => {
  for (const adapter of ["HTML", "Converted"] as const) {
    it(`matches content geometry and respects motion preferences in ${adapter}`, async () => {
      const path = await bundle(`skeleton-${adapter}`, adapter === "HTML" ? `import "@looma-test/runtime"; import { componentRegistry } from "@nextwebwg/html-next/runtime"; window.stopSkeleton = () => componentRegistry.update(document.querySelector("#still"), { animated: false }); window.addLateSkeleton = () => { const late = document.createElement("ui-skeleton"); late.id = "late"; late.setAttribute("width", "35%"); const surface = document.createElement("div"); surface.style.cssText = "transform:translateX(32px) scale(0.9);transform-origin:0 0"; surface.append(late); document.querySelector("main").append(surface); };` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiSkeleton as Skeleton, UiText as Text, UiAvatar as Avatar } from "@looma-test/components";
        const late = createState(false); window.addLateSkeleton = () => { late.value = true; };
        createScene({ render: () => [
          late.value ? sceneNode("div", { style: { transform: "translateX(32px) scale(0.9)", transformOrigin: "0 0" } }, sceneNode(Skeleton, { id: "late", width: "35%" })) : null,
          sceneNode(Text, { id: "reference" }, () => "One line of text"),
          sceneNode(Skeleton, { id: "line" }),
          sceneNode(Avatar, { id: "avatar", name: "Ada Lovelace", decorative: true }),
          sceneNode(Skeleton, { id: "circle", shape: "circle" }),
          sceneNode(Skeleton, { id: "media", shape: "rectangle", width: "600px", height: "80px" }),
          sceneNode(Skeleton, { id: "still", animated: false, width: "75%" }),
          sceneNode(Skeleton, { id: "hidden", hidden: true }),
        ] }).mount("#app");
      `);
      const page = await open(path, `<main style="font:16px/1.5 system-ui">${adapter === "HTML" ? `
        <ui-text id="reference">One line of text</ui-text>
        <ui-skeleton id="line"></ui-skeleton>
        <ui-avatar id="avatar" name="Ada Lovelace" decorative></ui-avatar>
        <ui-skeleton id="circle" shape="circle"></ui-skeleton>
        <ui-skeleton id="media" shape="rectangle" width="600px" height="80px"></ui-skeleton>
        <ui-skeleton id="still" from:animated="false" width="75%"></ui-skeleton>
        <ui-skeleton id="hidden" hidden></ui-skeleton>` : '<div id="app"></div>'}</main>`, [
        join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css"),
      ], { viewport: { width: 375, height: 400 } }, page => page.emulateMedia({ reducedMotion: "no-preference" }));
      try {
        for (const theme of ["light", "dark"]) {
          await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
          const boxes = await page.evaluate(() => {
            const bounds = (id: string) => { const box = document.getElementById(id)!.getBoundingClientRect(); return { width: box.width, height: box.height }; };
            return { line: bounds("line"), reference: bounds("reference"), circle: bounds("circle"), avatar: bounds("avatar"), media: bounds("media"), main: document.querySelector("main")!.clientWidth };
          });
          assert.equal(boxes.line.height, boxes.reference.height);
          assert.equal(boxes.circle.width, boxes.avatar.width);
          assert.equal(boxes.circle.height, boxes.avatar.height);
          assert.equal(boxes.media.width, boxes.main);
          assert.equal(boxes.media.height, 80);
          await expect.poll(() => page.locator("#hidden").isVisible()).toBe(false);
          await expect.poll(() => page.locator("#line").getAttribute("aria-hidden")).toBe("true");
          const paint = await page.locator("#line").evaluate(element => {
            const style = getComputedStyle(element, "::before");
            return { color: style.backgroundColor, animation: style.animationName };
          });
          assert.notEqual(paint.color, "rgba(0, 0, 0, 0)");
          assert.notEqual(paint.animation, "none", "a default Skeleton shimmers without an opt-in");
          const motion = await page.locator("#line").evaluate(element => {
            const animation = element.getAnimations({ subtree: true })[0]!;
            const duration = Number(animation.effect!.getTiming().duration);
            animation.pause();
            const sample = (fraction: number) => {
              animation.currentTime = duration * fraction;
              const style = getComputedStyle(element, "::before");
              const imageWidth = parseFloat(style.backgroundSize);
              const offset = parseFloat(style.backgroundPositionX);
              return { highlightCenter: offset + imageWidth / 2, opacity: style.opacity, image: style.backgroundImage };
            };
            const left = sample(0.4), right = sample(0.6);
            animation.play();
            animation.startTime = 0;
            return { left, right };
          });
          assert.ok(motion.right.highlightCenter > motion.left.highlightCenter, "the highlight travels left to right");
          assert.equal(motion.left.opacity, "1", "the whole placeholder must not pulse");
          assert.equal(motion.right.opacity, "1");
          assert.notEqual(motion.left.image, "none");
          const circleGradient = await page.locator("#circle").evaluate(element => getComputedStyle(element, "::before").backgroundSize);
          const lineGradient = await page.locator("#line").evaluate(element => getComputedStyle(element, "::before").backgroundSize);
          assert.equal(circleGradient, lineGradient, "gradient width is shared across differently sized placeholders");
          if (adapter === "HTML") if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, `../../.context/skeleton-${theme}-mobile.png`) });
        }
        await page.evaluate(async () => {
          (window as unknown as { addLateSkeleton: () => void }).addLateSkeleton();
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        });
        const phases = await page.evaluate(() => ["line", "circle", "media", "late"].map(id => {
          const element = document.getElementById(id)!;
          const style = getComputedStyle(element, "::before");
          const bounds = element.getBoundingClientRect();
          const scale = bounds.width / parseFloat(getComputedStyle(element).width);
          return { id, rawSize: style.backgroundSize, rawPosition: style.backgroundPositionX, scale, position: parseFloat(style.backgroundPositionX) * scale + bounds.left, gradientWidth: parseFloat(style.backgroundSize) * scale };
        }));
        for (const phase of phases) {
          assert.ok(Math.abs(phase.gradientWidth - 375) < 0.1, "the gradient keeps its viewport width through transforms: " + JSON.stringify(phases));
          assert.ok(Math.abs(phase.position - phases[0]!.position) < 0.1, "the gradient shares one viewport position, including transformed surfaces");
        }
        if (adapter === "HTML") await page.evaluate(() => (window as unknown as { stopSkeleton: () => void }).stopSkeleton());
        assert.equal(await page.locator("#still").evaluate(element => getComputedStyle(element, "::before").animationName), "none");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        assert.notEqual(await page.locator("#line").evaluate(element => getComputedStyle(element, "::before").animationName), "none");
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(await page.locator("#line").evaluate(element => getComputedStyle(element, "::before").animationName), "none");
        assert.equal(await page.locator("#line").evaluate(element => getComputedStyle(element, "::before").backgroundImage), "none");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.waitForFunction(() => document.getElementById("line")!.getAnimations({ subtree: true }).some(animation => animation.playState === "running"));
        await page.addStyleTag({ content: "#line { display:flex; margin:20px; }" });
        assert.deepEqual(await page.locator("#line").evaluate(element => { const style = getComputedStyle(element); return [style.display, style.margin]; }), ["block", "0px"]);
      } finally { await page.close(); }
    });
  }
});
