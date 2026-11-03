import { expect } from "../renderers/test-context";
import { loadFixture } from "../renderers/fixture";
import assert from "node:assert/strict";

import { dirname, join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Toast composition and placement", () => {
  for (const adapter of ['html', 'converted'] as const) it(`keeps the ${adapter} notification stack at content height in WebKit`, async () => {
    const path = await bundle(`toast-intrinsic-${adapter}`, adapter === 'html' ? `
      import '@looma-test/runtime';
      import {componentRegistry} from '@nextwebwg/html-next/runtime';
      window.place = placement => componentRegistry.update(document.getElementById('region'), {placement});
    ` : `
      import {createScene,sceneNode,createState} from "@looma-test/scene";
      import { UiToastRegion as ToastRegion, UiToast as Toast } from '@looma-test/components';
      const placement=createState('top');window.place=value=>placement.value=value;
      createScene({render:()=>sceneNode(ToastRegion,{id:'region',placement:placement.value},()=>sceneNode(Toast,{id:'notice',tone:'danger'},()=> 'The change could not be saved. Please try again.'))}).mount('#app');
    `);
    // An installed compatibility driver also exercises older supported WebKit builds.
    const driver = process.env.LOOMA_WEBKIT_MODULE || "playwright";
    const {webkit} = await import(/* @vite-ignore */ driver);
    const safari = await webkit.launch();
    let page: Page | undefined;
    try {
      page = await safari.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
      const errors: string[] = [];
      page.on('pageerror',error=>errors.push(error.message));
      const markup = adapter === 'html'
        ? '<ui-toast-region id="region"><ui-toast id="notice" tone="danger">The change could not be saved. Please try again.</ui-toast></ui-toast-region>'
        : '<div id="app"></div>';
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${markup}</body></html>`);
      for (const css of [join(root,'tokens.css'),join(dirname(path),'components.css')]) await page.addStyleTag({path:css});
      await loadFixture(page, path);
      await page.waitForFunction(()=>document.documentElement.clientWidth===375);
      await page.waitForFunction(()=>document.getElementById('region')!.matches(':popover-open'));
      for (const placement of ['top','top-start','top-end','bottom','bottom-start','bottom-end']) {
        await page.evaluate(value=>(window as unknown as {place:(value:string)=>void}).place(value),placement);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const geometry=await page.evaluate(()=>{
          const region=document.getElementById('region')!,toast=document.getElementById('notice')!;
          const box=region.getBoundingClientRect(),surface=toast.getBoundingClientRect(),style=getComputedStyle(toast);
          const intrinsic=Math.max(toast.querySelector('.message')!.getBoundingClientRect().height,toast.querySelector('button')!.getBoundingClientRect().height)
            +['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((sum,key)=>sum+Number.parseFloat(style[key as keyof CSSStyleDeclaration] as string),0);
          return {height:surface.height,stack:box.height,intrinsic,top:box.top,bottom:box.bottom,viewport:innerHeight};
        });
        assert.ok(Math.abs(geometry.height-geometry.intrinsic)<=1,`${adapter}/${placement}: notifications retain content height: ${JSON.stringify(geometry)}`);
        assert.ok(Math.abs(geometry.stack-geometry.height)<=1,'a single notification does not create an empty viewport-sized grid row');
        assert.ok(geometry.top>=0 && geometry.bottom<=geometry.viewport,'the notification remains inside the phone viewport');
      }
      assert.deepEqual(errors,[]);
    } finally {await page?.close();await safari.close();}
  });

  it("balances toast content insets without external margins or smaller dismiss targets in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-toast-optical-insets`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiToast as Toast, UiToastRegion as ToastRegion } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", {}, [
          sceneNode(Toast, { id: "authored", tone: "success" }, { default: () => "Notification received.", action: () => sceneNode("button", "Undo") }),
          sceneNode(ToastRegion, { id: "region", duration: 0 })
        ]) }).mount("#app");
      `);
      const body = adapter === "html" ? `<ui-toast id="authored" tone="success">Notification received.<button slot="action">Undo</button></ui-toast><ui-toast-region id="region" duration="0"></ui-toast-region>` : "";
      const page = await open(path, `<div id="app">${body}</div>`,
        [join(root, "tokens.css")], { hasTouch: true });
      await page.locator("#region").evaluate(element => element.dispatchEvent(new CustomEvent("show-toast", {
        detail: { id: "generated", message: "Notification received.", duration: 0 },
      })));
      for (const direction of ["ltr", "rtl"]) for (const width of [1280, 375]) {
        await page.evaluate(direction => document.documentElement.dir = direction, direction);
        await page.setViewportSize({ width, height: 900 });
        for (const id of ["authored", "generated"]) {
          const geometry = await page.locator(`#${id}`).evaluate((element, direction) => {
            const box = element.getBoundingClientRect(), message = element.querySelector(".message")!.getBoundingClientRect();
            const button = element.querySelector('button[aria-label^="Dismiss"]')!, control = button.getBoundingClientRect();
            const svg = button.querySelector("svg")!, frame = svg.getBoundingClientRect(), ink = svg.getBBox();
            const scale = frame.width / svg.viewBox.baseVal.width, stroke = parseFloat(getComputedStyle(svg).strokeWidth) / 2;
            const inkStart = frame.left + (ink.x - stroke) * scale, inkEnd = frame.left + (ink.x + ink.width + stroke) * scale;
            const hit = getComputedStyle(button, "::after");
            const dismiss = getComputedStyle(element.querySelector(".dismiss")!);
            const buttonStyle = getComputedStyle(button);
            return { textInset: direction === "rtl" ? box.right - message.right : message.left - box.left,
              iconInset: direction === "rtl" ? inkStart - box.left : box.right - inkEnd,
              contained: control.left >= box.left && control.right <= box.right,
              margins: [dismiss.marginInlineStart, dismiss.marginInlineEnd],
              buttonMargins: [buttonStyle.marginTop, buttonStyle.marginRight, buttonStyle.marginBottom, buttonStyle.marginLeft],
              controlWidth: control.width, hitWidth: parseFloat(hit.width), hitHeight: parseFloat(hit.height) };
          }, direction);
          assert.deepEqual(geometry.margins, ["0px", "0px"], "the toast owns spacing without external dismiss margins");
          assert.deepEqual(geometry.buttonMargins, ["0px", "0px", "0px", "0px"], "IconButton contributes no external margin");
          assert.ok(Math.abs(geometry.textInset - geometry.iconInset) < 2, `${adapter}/${direction}/${width}/${id}: close visible insets ${JSON.stringify(geometry)}`);
          assert.ok(geometry.contained, "the dismiss control remains inside the toast");
          assert.equal(geometry.controlWidth, 28, "compact close control retains its size");
          assert.ok(geometry.hitWidth >= 44 && geometry.hitHeight >= 44, "touch dismissal retains its larger invisible target");
        }
      }
      await page.close();
    }
  });

  it("keeps rounded notification borders even across tones, themes and adapters", async () => {
    const tones = ["neutral", "info", "success", "warning", "danger"];
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-notification-borders`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCallout as Callout, UiToast as Toast, UiToastRegion as ToastRegion } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", {}, [
          ...${JSON.stringify(tones)}.flatMap(tone => [sceneNode(Callout, { id: "callout-" + tone, tone }, () => tone + " notice"),
            sceneNode(Toast, { id: "toast-" + tone, tone }, () => tone + " notification")]),
          sceneNode(ToastRegion, { id: "region", duration: 0 })
        ]) }).mount("#app");
      `);
      const body = adapter === "html" ? tones.map(tone => `<ui-callout id="callout-${tone}" tone="${tone}">${tone} notice</ui-callout><ui-toast id="toast-${tone}" tone="${tone}">${tone} notification</ui-toast>`).join("")
        + `<ui-toast-region id="region" duration="0"></ui-toast-region>` : "";
      const page = await open(path, `<div id="app">${body}</div>`,
        ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map(file => join(root, file)));
      await page.addStyleTag({ content: ":root { --ui-accent-line-width: 4px; } #app { display:grid; gap:12px; }" });
      for (const tone of tones) await page.locator("#region").evaluate((element, tone) => element.dispatchEvent(new CustomEvent("show-toast", {
        detail: { id: "generated-" + tone, message: tone + " generated notification", tone, duration: 0 },
      })), tone);
      for (const theme of ["light", "dark", "high"]) {
        await page.evaluate(theme => {
          document.documentElement.setAttribute("data-theme", theme === "high" ? "light" : theme);
          document.documentElement.toggleAttribute("data-contrast", theme === "high");
          if (theme === "high") document.documentElement.setAttribute("data-contrast", "high");
        }, theme);
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          for (const kind of ["callout", "toast", "generated"]) for (const tone of tones) {
            const style = await page.locator(`#${kind}-${tone}`).evaluate((element, { tone, kind }) => {
              const css = getComputedStyle(element);
              const probe = element.appendChild(document.createElement("span"));
              probe.style.backgroundColor = tone === "neutral" ? "var(--ui-surface-muted)" : `var(--ui-${tone}-soft)`;
              probe.style.fontSize = "var(--ui-font-size-sm)";
              const expectedSurface = getComputedStyle(probe).backgroundColor;
              probe.style.color = tone === "neutral" ? "var(--ui-text-primary)" : `var(--ui-${tone}-subtle-text)`;
              probe.style.borderColor = tone === "neutral" ? "var(--ui-border-strong)" : `var(--ui-${tone}-soft-border)`;
              const expectedText = getComputedStyle(probe).color, expectedBorder = getComputedStyle(probe).borderTopColor;
              const expectedSize = getComputedStyle(probe).fontSize;
              probe.remove();
              return { widths: [css.borderTopWidth, css.borderRightWidth, css.borderBottomWidth, css.borderLeftWidth],
                colors: [css.borderTopColor, css.borderRightColor, css.borderBottomColor, css.borderLeftColor],
                radius: css.borderTopLeftRadius, surface: css.backgroundColor, text: css.color,
                fontSize: css.fontSize, expectedSurface, expectedSize, expectedText, expectedBorder };
            }, { tone, kind });
            assert.equal(new Set(style.widths).size, 1, `${adapter}/${theme}/${width}/${kind}/${tone}: even border widths`);
            assert.ok(parseFloat(style.widths[0]) > 0, "notification outline remains visible");
            assert.equal(new Set(style.colors).size, 1, `${adapter}/${theme}/${width}/${kind}/${tone}: one color around the rounded border`);
            assert.ok(parseFloat(style.radius) > 0, "rounded shape is retained");
            assert.notEqual(style.text, style.surface, "message remains readable");
            assert.equal(style.surface, style.expectedSurface, `${kind}/${tone}: every tone has a shaded surface`);
            assert.equal(style.text, style.expectedText, `${kind}/${tone}: shared foreground`);
            if(tone !== 'neutral') assert.equal(style.colors[0],style.expectedBorder,`${kind}/${tone}: shared semantic border`);
            assert.equal(style.fontSize, style.expectedSize, `${kind}/${tone}: uses small message typography`);
          }
        }
      }
      await page.locator("#toast-neutral").evaluate(element => (element as HTMLElement).style.setProperty("--ui-toast-surface", "rgb(230, 225, 255)"));
      await page.locator("#region").evaluate(element => (element as HTMLElement).style.setProperty("--ui-toast-region-surface", "rgb(225, 240, 255)"));
      await page.locator("#app").evaluate(element => (element as HTMLElement).style.setProperty("--ui-overlay-surface", "rgb(245, 235, 225)"));
      const surface = (id: string) => page.locator(`#${id}`).evaluate(element => getComputedStyle(element).backgroundColor);
      assert.equal(await surface("toast-neutral"), "rgb(230, 225, 255)", "local Toast surface overrides group and tone defaults");
      assert.equal(await surface("toast-success"), "rgb(245, 235, 225)", "the overlay group can override a tone surface");
      assert.equal(await surface("generated-success"), "rgb(225, 240, 255)", "Toast Region surface overrides group and tone defaults");
      await page.close();
    }
  });

  it("shows authored toasts, hides one on dismissal, and shows it again when hidden clears", async () => {
    const path = await bundle("html-authored-toast", `
      import "@looma-test/runtime";
      window.dismissals = [];
      document.querySelector("#region").addEventListener("dismiss", (event) => window.dismissals.push(event.detail));
    `);
    const page = await open(path, `
      <ui-toast-region id="region" placement="bottom-end">
        <ui-toast id="saved" tone="success">Saved <button slot="action">Undo</button></ui-toast>
        <ui-toast id="failed" tone="danger">Could not save</ui-toast>
      </ui-toast-region>
    `, [join(root, "tokens.css")]);
    const region = page.locator("#region");
    assert.equal(await region.evaluate((element) => element.matches(":popover-open")), true);
    await expect.poll(() => page.locator("#saved").getAttribute("role")).toBe("status");
    await expect.poll(() => page.locator("#failed").getAttribute("role")).toBe("alert");
    const position = await region.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { bottom: innerHeight - box.bottom, right: innerWidth - box.right };
    });
    assert.ok(position.bottom < 40 && position.right < 40, JSON.stringify(position));
    await page.getByRole("button", { name: "Undo" }).click();
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [{ id: "saved", reason: "action", trigger: "pointer" }]);
    await expect.poll(() => page.locator("#saved").count(), { message: "authored content stays in the document" }).toBe(1);
    await expect.poll(() => page.locator("#saved").isHidden(), { message: "a dismissed toast hides itself" }).toBe(true);
    await page.locator("#saved").evaluate((element: HTMLElement) => { element.hidden = false; });
    await expect.poll(() => page.locator("#saved").isVisible(), { message: "clearing hidden shows it again" }).toBe(true);
    await page.getByRole("button", { name: "Undo" }).click();
    assert.equal((await page.evaluate(() => (window as any).dismissals)).length, 2, "a reshown toast dismisses again");
    await page.locator("#failed").getByRole("button", { name: "Dismiss notification" }).click();
    await page.waitForFunction(() => !document.querySelector("#region")!.matches(":popover-open"));
    await page.close();
  });

  it("pauses an authored duration on hover and dismisses after leaving", async () => {
    const path = await bundle("html-timed-toast", `
      import "@looma-test/runtime";
      window.dismissals = [];
      document.querySelector("#toast").addEventListener("dismiss", (event) => window.dismissals.push(event.detail));
    `);
    const page = await open(path, `<ui-toast-region><ui-toast id="toast" duration="250">Timed</ui-toast></ui-toast-region>`, [join(root, "tokens.css")]);
    await page.locator("#toast").hover();
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), []);
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => (window as any).dismissals.length === 1);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [{ id: "toast", reason: "timeout", trigger: "programmatic" }]);
    await expect.poll(() => page.locator("#toast").isHidden(), { message: "a timed toast hides itself" }).toBe(true);
    await page.close();
  });

  it("times an authored hidden toast only once it is shown, and again each time it is shown", async () => {
    const path = await bundle("html-hidden-timed-toast", `
      import "@looma-test/runtime";
      window.dismissals = [];
      document.querySelector("#toast").addEventListener("dismiss", (event) => window.dismissals.push(event.detail.reason));
    `);
    const page = await open(path, `<ui-toast-region id="region"><ui-toast id="toast" hidden duration="200">Timed</ui-toast></ui-toast-region>`, [join(root, "tokens.css")]);
    await page.waitForTimeout(400);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [], "a toast that was never shown does not time out");
    assert.equal(await page.locator("#region").evaluate((element) => element.matches(":popover-open")), false);
    for (const shown of [1, 2]) {
      await page.locator("#toast").evaluate((element: HTMLElement) => { element.hidden = false; });
      await page.waitForFunction((count) => (window as any).dismissals.length === count, shown);
      await expect.poll(() => page.locator("#toast").isHidden(), { message: `showing ${shown} timed out and hid the toast` }).toBe(true);
    }
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), ["timeout", "timeout"]);
    await page.close();
  });

  it("pauses while an action has focus and supports keyboard dismissal across themes", async () => {
    const path = await bundle("html-toast-focus", `
      import "@looma-test/runtime";
      window.dismissals = [];
      document.querySelector("#toast").addEventListener("dismiss", (event) => window.dismissals.push(event.detail));
    `);
    const page = await open(path, `
      <button id="before">Before</button>
      <ui-toast-region><ui-toast id="toast" tone="danger" duration="250">
        Save failed <button slot="action">Retry</button>
      </ui-toast></ui-toast-region>
    `, ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file)));
    // Pause the short dismissal timer before exercising the independent theme checks.
    await page.getByRole("button", { name: "Retry" }).focus();
    for (const [attribute, value] of [["data-theme", "light"], ["data-theme", "dark"], ["data-contrast", "high"]] as const) {
      await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.removeAttribute("data-contrast"); });
      await page.evaluate(([name, setting]) => document.documentElement.setAttribute(name, setting), [attribute, value]);
      await expect.poll(() => page.locator("#toast").getAttribute("role")).toBe("alert");
      const colors = await page.locator("#toast").evaluate((element) => {
        const css = getComputedStyle(element);
        return { accent: css.borderInlineStartColor, surface: css.backgroundColor, text: css.color };
      });
      assert.notEqual(colors.accent, colors.surface, `${value}: danger accent is visible`);
      assert.notEqual(colors.text, colors.surface, `${value}: message is visible`);
    }
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), []);
    await page.getByRole("button", { name: "Retry" }).press("Tab");
    await page.getByRole("button", { name: "Dismiss notification" }).press("Enter");
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [{ id: "toast", reason: "action", trigger: "keyboard" }]);
    await page.close();
  });

  it("adds generated messages with tone and duration through a native event", async () => {
    const path = await bundle("html-generated-toast", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-toast-region id="region" placement="top-start" duration="0"></ui-toast-region>`, [join(root, "tokens.css")]);
    await page.locator("#region").evaluate((element) => element.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message: "Saved", id: "saved-notice", tone: "success", duration: 0 },
    })));
    await expect.poll(() => page.locator("#region #saved-notice").count()).toBe(1);
    await expect.poll(() => page.locator("#region .toast[role='status'][data-tone='success']").count()).toBe(1);
    const region = page.locator("#region");
    assert.equal(await region.evaluate((element) => element.matches(":popover-open")), true);
    const position = await region.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, left: box.left };
    });
    assert.ok(position.top < 40 && position.left < 40, JSON.stringify(position));
    await page.getByRole("button", { name: "Dismiss Saved" }).click();
    await page.waitForFunction(() => !document.querySelector("#region")!.matches(":popover-open"));
    await page.close();
  });
});
