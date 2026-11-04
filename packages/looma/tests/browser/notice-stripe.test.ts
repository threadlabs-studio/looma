import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "vitest";
import { expect } from "../renderers/test-context";
import { root, bundle, open } from "../renderers/browser-driver";

describe("Notice Stripe", () => {
  for (const adapter of ["html", "converted"]) {
    it(`keeps ${adapter} dismissal controlled and keyboard operable`, async () => {
      const path = await bundle(`${adapter}-notice-dismiss`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiNoticeStripe as NoticeStripe } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", {}, [
          sceneNode(NoticeStripe, { id: "notice", dismissible: true, dismissLabel: "Dismiss maintenance notice" }, {
            default: () => "Maintenance begins tonight.",
            actions: () => sceneNode("a", { href: "#details" }, "Details"),
          }),
          sceneNode(NoticeStripe, { id: "permanent" }, () => "Service available."),
        ]) }).mount("#app");
      `);
      const body = adapter === "html" ? `<ui-notice-stripe id="notice" dismissible dismiss-label="Dismiss maintenance notice">Maintenance begins tonight.<a slot="actions" href="#details">Details</a></ui-notice-stripe><ui-notice-stripe id="permanent">Service available.</ui-notice-stripe>` : "";
      const page = await open(path, `<main id="app">${body}</main>`, [join(root, "tokens.css")], { hasTouch: true });
      await page.evaluate(() => {
        const events: unknown[] = [];
        Object.assign(window, { dismissals: events });
        document.addEventListener("dismiss", event => events.push((event as CustomEvent).detail));
      });
      const close = page.getByRole("button", { name: "Dismiss maintenance notice" });
      await expect.poll(() => close.count()).toBe(1);
      assert.equal(await page.locator("#permanent button").count(), 0);
      assert.ok(await page.locator("#permanent").evaluate(element => element.getBoundingClientRect().height) <= 48, "a short notice stays compact");
      await page.getByRole("link", { name: "Details" }).click();
      assert.deepEqual(await page.evaluate(() => (window as any).dismissals), []);
      await close.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => page.evaluate(() => (window as any).dismissals)).toEqual([{ reason: "action", trigger: "keyboard" }]);
      assert.equal(await page.locator("#notice").isVisible(), true, "consumer retains the stripe until it handles dismissal");
      await close.tap();
      await expect.poll(() => page.evaluate(() => (window as any).dismissals)).toEqual([{ reason: "action", trigger: "keyboard" }, { reason: "action", trigger: "pointer" }]);
      await page.locator("#notice").evaluate(element => (element as HTMLElement).hidden = true);
      assert.equal(await page.locator("#notice").isVisible(), false);
      await page.close();
    });

    it(`wraps ${adapter} notices in both directions and all themes`, async () => {
      const tones = ["neutral", "info", "success", "warning", "danger"];
      const message = "Scheduled maintenance starts tonight. Your saved changes remain available. ALongUnbrokenDestinationThatMustWrapInsideTheStripeWithoutHorizontalOverflow";
      const path = await bundle(`${adapter}-notice-layout`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiNoticeStripe as NoticeStripe } from "@looma-test/components";
        createScene({ render: () => ${JSON.stringify(tones)}.map(tone => sceneNode(NoticeStripe, { id: tone, tone, dismissible: true }, {
          default: () => ${JSON.stringify(message)}, actions: () => sceneNode("a", { href: "#status" }, "Service status"),
        })) }).mount("#app");
      `);
      const body = adapter === "html" ? tones.map(tone => `<ui-notice-stripe id="${tone}" tone="${tone}" dismissible>${message}<a slot="actions" href="#status">Service status</a></ui-notice-stripe>`).join("") : "";
      const page = await open(path, `<main id="app">${body}</main>`, ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map(file => join(root, file)), { hasTouch: true, reducedMotion: "reduce" });
      await page.addStyleTag({ content: "body { margin: 0; }" });
      await page.addScriptTag({ path: join(root, "node_modules/axe-core/axe.min.js") });
      for (const theme of ["light", "dark", "high"]) for (const dir of ["ltr", "rtl"]) for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(({ theme, dir }) => {
          document.documentElement.dir = dir;
          document.documentElement.dataset.theme = theme === "high" ? "light" : theme;
          document.documentElement.dataset.contrast = theme === "high" ? "high" : "normal";
        }, { theme, dir });
        for (const tone of tones) {
          const stripe = page.locator(`#${tone}`);
          assert.equal(await stripe.getAttribute("role"), tone === "danger" ? "alert" : "status");
          const geometry = await stripe.evaluate(element => {
            const box = element.getBoundingClientRect(), style = getComputedStyle(element);
            const close = element.querySelector("button")!, button = close.getBoundingClientRect();
            const message = element.querySelector(".message")!.getBoundingClientRect();
            const hit = getComputedStyle(close, "::after");
            return { width: box.width, scrollWidth: element.scrollWidth, radius: style.borderTopLeftRadius,
              margins: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft],
              surface: style.backgroundColor, text: style.color, height: box.height,
              trailing: getComputedStyle(element).direction === "rtl" ? button.right < message.right : button.left > message.left,
              contained: button.left >= box.left && button.right <= box.right,
              hitWidth: parseFloat(hit.width), hitHeight: parseFloat(hit.height) };
          });
          assert.equal(geometry.width, width);
          assert.ok(geometry.scrollWidth <= width, `${adapter}/${theme}/${dir}/${width}/${tone}: no horizontal overflow`);
          assert.equal(geometry.radius, "0px");
          assert.deepEqual(geometry.margins, ["0px", "0px", "0px", "0px"]);
          assert.notEqual(geometry.surface, geometry.text);
          assert.ok(geometry.trailing && geometry.contained, "close stays on the logical trailing side");
          assert.ok(geometry.hitWidth >= 44 && geometry.hitHeight >= 44, "close retains the shared touch target");
        }
        if (dir === "ltr" && width === 375) {
          const violations = await page.evaluate(async () => (await (window as any).axe.run("#app")).violations);
          assert.deepEqual(violations, [], `${adapter}/${theme}: accessible notices and action contrast`);
        }
        if (process.env.LOOMA_CAPTURE_ARTIFACTS && dir === "ltr") await page.screenshot({ path: join(root, `../../.context/notice-stripe-${adapter}-${theme}-${width}.png`) });
      }
      await page.close();
    });
  }
});
