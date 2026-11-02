import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Disclosure composition", () => {
it("keeps reading surfaces lighter than surrounding chrome across theme seeds", async () => {
    const path = await bundle("html-content-surfaces", `import "@looma-test/runtime";`);
    const page = await open(path, `<style>#content { background: var(--ui-surface-content); } #chrome { background: var(--ui-surface-chrome); }</style><header id="chrome">Chrome</header><main id="content">Content</main>`, [join(root, "tokens.css")]);
    for (const surface of ["#ffffff", "#f3e9dd", "#1d252b", "#000000"]) {
      const values = await page.evaluate(surface => {
        document.documentElement.style.setProperty("--ui-surface", surface);
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        const lightness = (id: string) => {
          ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(document.getElementById(id)!).backgroundColor; ctx.fillRect(0, 0, 1, 1);
          const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data).map(value => value / 255);
          return .2126 * r! + .7152 * g! + .0722 * b!;
        };
        return [lightness("content"), lightness("chrome")];
      }, surface);
      assert.ok(values[0]! > values[1]!, `${surface}: reading area must be lighter than chrome: ${values}`);
    }
    await page.close();
  });
it("keeps navigation disclosure children adjacent to their trigger", async () => {
    const path = await bundle("html-navigation-children", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-disclosure id="section" variant="navigation" density="compact" open summary="Writing">
        <ui-nav-item id="overview" as="a" href="#overview" density="compact">Writing overview</ui-nav-item>
        <ui-disclosure variant="navigation" density="compact" open summary="Examples">
          <ui-nav-item as="a" href="#example" density="compact">Example</ui-nav-item>
        </ui-disclosure>
      </ui-disclosure>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const gap = await page.evaluate(() => document.querySelector("#overview")!.getBoundingClientRect().top
      - document.querySelector("#section button")!.getBoundingClientRect().bottom);
    assert.ok(Math.abs(gap) <= 1, `Navigation children must follow the trigger without accordion padding, got ${gap}px`);
    await page.close();
  });

  it("initializes required groups independently and transfers ownership when an open member is removed", async () => {
    const path = await bundle("html-disclosure-required", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-disclosure id="first" name="required" required-open summary="First"><a href="#first-link">First link</a></ui-disclosure>
      <ui-disclosure id="second" name="required" required-open summary="Second"><a href="#second-link">Second link</a></ui-disclosure>
      <ui-disclosure id="independent" name="other" required-open summary="Independent">Other</ui-disclosure>
      <ui-disclosure id="optional" name="optional" summary="Optional" open>Optional</ui-disclosure>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await expect.poll(() => page.locator("#first button").getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => page.locator("#second button").getAttribute("aria-expanded")).toBe("false");
    await expect.poll(() => page.locator("#independent button").getAttribute("aria-expanded")).toBe("true");
    await page.locator("#first button").click();
    await expect.poll(() => page.locator("#first button").getAttribute("aria-expanded")).toBe("true");
    await page.locator("#optional button").click();
    await expect.poll(() => page.locator("#optional button").getAttribute("aria-expanded")).toBe("false");
    await page.evaluate(() => document.querySelector("#first")!.remove());
    await page.waitForFunction(() => document.querySelector("#second button")?.getAttribute("aria-expanded") === "true");
    await page.close();
  });

  it("shares neutral navigation colors, columns, typography, hover, and corners in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-navigation-geometry`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiDisclosure as Disclosure, UiNavItem as NavItem, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", { style: "width:240px" }, [
          sceneNode(Disclosure, { id: "section", variant: "navigation", density: "compact", fill: true, open: true, summary: "Library" }, {
            leading: () => sceneNode(Icon, { name: "files" }), indicator: () => sceneNode(Icon, { name: "chevron-up" }),
          }),
          sceneNode(NavItem, { id: "destination", density: "compact" }, {
            leading: () => sceneNode(Icon, { name: "trash" }), trailing: () => sceneNode(Icon, { name: "chevrons-up-down" }), default: () => "Archived",
          }),
        ]) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <div style="width:240px">
          <ui-disclosure id="section" variant="navigation" density="compact" fill open summary="Library"><ui-icon slot="leading" name="files"></ui-icon><ui-icon slot="indicator" name="chevron-up"></ui-icon></ui-disclosure>
          <ui-nav-item id="destination" density="compact"><ui-icon slot="leading" name="trash"></ui-icon>Archived<ui-icon slot="trailing" name="chevrons-up-down"></ui-icon></ui-nav-item>
        </div>
      ` : `<div id="app"></div>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      const geometry = await page.evaluate(() => {
        const summary = document.querySelector("#section button")!;
        const nav = document.querySelector("#destination")!;
        const center = (element: Element) => { const box = element.getBoundingClientRect(); return box.x + box.width / 2; };
        return {
          leading: [center(summary.querySelector(".leading")!), center(nav.querySelector(".leading")!)],
          trailing: [center(summary.querySelector(".indicator")!), center(nav.querySelector(".trailing")!)],
          label: [summary.querySelector(".summary")!.getBoundingClientRect().x, nav.querySelector(".label")!.getBoundingClientRect().x],
          radius: [getComputedStyle(summary).borderRadius, getComputedStyle(nav).borderRadius],
          weight: [getComputedStyle(summary).fontWeight, getComputedStyle(nav).fontWeight],
        };
      });
      for (const values of Object.values(geometry)) assert.equal(values[0], values[1], `${adapter}: ${JSON.stringify(geometry)}`);
      const neutral = await page.locator("#destination").evaluate(element => getComputedStyle(element).color);
      for (const selector of ["#section button", "#section .leading svg", "#section .indicator svg"]) {
        assert.equal(await page.locator(selector).evaluate(element => getComputedStyle(element).color), neutral);
      }
      await page.locator("#section button").click();
      await page.mouse.move(0, 0);
      assert.equal(await page.locator("#section button").evaluate(element => getComputedStyle(element).color), neutral);
      await page.locator("#section button").hover();
      const sectionHover = await page.locator("#section button").evaluate(element => getComputedStyle(element).backgroundColor);
      await page.locator("#destination").hover();
      assert.equal(await page.locator("#destination").evaluate(element => getComputedStyle(element).backgroundColor), sectionHover);
      await page.close();
    }
  });

  it("fills the remaining height with unboxed headers and a scrolling body in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const source = adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiDisclosure as Disclosure, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", { id: "panels", style: "display:flex;flex-direction:column;height:480px;width:240px" }, [
          sceneNode(Disclosure, { id: "first", fill: true, requiredOpen: true, name: "panels", summary: "Overview", open: true }, {
            indicator: () => sceneNode(Icon, { name: "chevron-down", "aria-hidden": "true" }),
            default: () => sceneNode("div", { id: "scroll", style: "flex:1;min-height:0;overflow:auto" }, sceneNode("p", { style: "height:1800px" }, "Overview content")),
          }),
          sceneNode(Disclosure, { id: "second", fill: true, requiredOpen: true, name: "panels", summary: "Library" }, () => sceneNode("p", "Library content")),
        ]) }).mount("#app");
      `;
      const path = await bundle(`${adapter}-disclosure-fill`, source);
      const body = adapter === "html" ? `
        <div id="panels" style="display:flex;flex-direction:column;height:480px;width:240px">
          <ui-disclosure id="first" fill required-open name="panels" summary="Overview" open>
            <ui-icon slot="indicator" name="chevron-down" aria-hidden="true"></ui-icon>
            <div id="scroll" style="flex:1;min-height:0;overflow:auto"><p style="height:1800px">Overview content</p></div>
          </ui-disclosure>
          <ui-disclosure id="second" fill required-open name="panels" summary="Library"><p>Library content</p></ui-disclosure>
        </div>` : `<div id="app"></div>`;
      const page = await open(path, body, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      await expect.poll(() => page.locator("#first .chevron").count(), { message: "custom indicator replaces the default" }).toBe(0);
      const measure = () => page.evaluate(() => {
        const first = document.querySelector("#first")!;
        const second = document.querySelector("#second")!;
        const trigger = first.querySelector("button")!;
        const scroll = document.querySelector("#scroll")!;
        return {
          first: first.getBoundingClientRect().height, second: second.getBoundingClientRect().height,
          width: first.getBoundingClientRect().width, triggerWidth: trigger.getBoundingClientRect().width,
          background: getComputedStyle(trigger).backgroundColor, shadow: getComputedStyle(trigger).boxShadow,
          scrollHeight: scroll.scrollHeight, visibleHeight: scroll.clientHeight,
        };
      });
      const opened = await measure();
      assert.ok(opened.first > 400 && opened.second < 64, `${adapter}: ${JSON.stringify(opened)}`);
      assert.equal(opened.width, opened.triggerWidth);
      assert.equal(opened.background, "rgba(0, 0, 0, 0)");
      assert.equal(opened.shadow, "none");
      assert.ok(opened.visibleHeight > 300 && opened.scrollHeight > opened.visibleHeight);
      await page.locator("#second button").focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => page.locator("#first button").getAttribute("aria-expanded")).toBe("false");
      await expect.poll(() => page.locator("#second button").getAttribute("aria-expanded")).toBe("true");
      const swapped = await measure();
      assert.ok(swapped.second > 400 && swapped.first < 64);
      await page.locator("#second button").click();
      await expect.poll(() => page.locator("#second button").getAttribute("aria-expanded"), { message: "the required group keeps its final panel open" }).toBe("true");
      await page.close();
    }
  });

  it("animates bounded fill transfer and a persistent custom indicator", async () => {
    const path = await bundle("html-disclosure-motion", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div style="display:flex;flex-direction:column;height:480px;width:240px;--ui-motion-layout:1000ms;--ui-motion-reveal:1000ms">
        <ui-disclosure id="first" fill name="motion" summary="Overview" open><p>Overview content</p></ui-disclosure>
        <ui-disclosure id="second" fill name="motion" summary="Library">
          <ui-icon slot="indicator" name="chevron-up"></ui-icon><p>Library content</p>
        </ui-disclosure>
      </div>
    `, [join(root, "tokens.css")], { reducedMotion: "no-preference" });
    await page.locator("#second button").click();
    await page.waitForTimeout(60);
    const intermediate = await page.evaluate(() => {
      const first = document.querySelector("#first")!;
      const second = document.querySelector("#second")!;
      return {
        first: first.getBoundingClientRect().height,
        second: second.getBoundingClientRect().height,
        indicatorAnimating: Boolean(second.querySelector(".indicator")?.getAnimations().length),
        panelAnimating: Boolean(second.querySelector(".panel")?.getAnimations().length),
      };
    });
    assert.ok(intermediate.first > 64 && intermediate.first < 440, JSON.stringify(intermediate));
    assert.ok(intermediate.second > 64 && intermediate.second < 440, JSON.stringify(intermediate));
    assert.equal(intermediate.indicatorAnimating, true);
    assert.equal(intermediate.panelAnimating, true);
    await page.locator("#first button").click();
    await page.waitForTimeout(1100);
    await expect.poll(() => page.locator("#first button").getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => page.locator("#second button").getAttribute("aria-expanded")).toBe("false");
    assert.ok((await page.locator("#first").boundingBox())!.height > 400);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#second button").click();
    assert.ok((await page.locator("#second").boundingBox())!.height > 400);
    await page.close();
  });

  it("reveals closed content when a fragment targets it and closes its named peer", async () => {
    const path = await bundle("html-disclosure-beforematch", `
      import "@looma-test/runtime";
      window.opens = [];
      document.querySelector("#target").addEventListener("open", (event) => window.opens.push(event.detail));
    `);
    for (const fill of [false, true]) {
      const page = await open(path, `
        <ui-disclosure ${fill ? "fill" : ""} id="peer" name="faq" summary="Peer" open><p>Peer answer</p></ui-disclosure>
        <ui-disclosure ${fill ? "fill" : ""} id="target" name="faq" summary="Target"><p id="answer">Findable answer</p></ui-disclosure>
      `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      await expect.poll(() => page.locator("#target .panel").getAttribute("hidden")).toBe("until-found");
      await page.evaluate(() => { location.hash = "answer"; });
      await page.waitForFunction(() => document.querySelector("#target .trigger")?.getAttribute("aria-expanded") === "true");
      await expect.poll(() => page.locator("#target .panel").getAttribute("hidden")).toBe(null);
      await expect.poll(() => page.locator("#peer .trigger").getAttribute("aria-expanded")).toBe("false");
      assert.deepEqual(await page.evaluate(() => (window as any).opens), [{ open: true, reason: "programmatic", trigger: "programmatic" }]);
      await page.close();
    }
  });

  it("uses named exclusive groups, a rich summary, and an optional heading in HTML", async () => {
    const path = await bundle("html-disclosure-group", `
      import "@looma-test/runtime";
      window.closes = [];
      document.querySelector("#first").addEventListener("close", (event) => window.closes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-disclosure id="first" name="faq" summary="First" heading-level="3"><p>First answer</p></ui-disclosure>
      <ui-disclosure id="second" name="faq" summary="Second" heading-level="3">
        <strong slot="summary">Second <em>updated</em></strong><p>Second answer</p>
      </ui-disclosure>
      <ui-disclosure id="independent" name="other" summary="Independent"><p>Other answer</p></ui-disclosure>
    `, [join(root, "tokens.css")]);
    await expect.poll(() => page.getByRole("heading", { level: 3, name: "First" }).count()).toBe(1);
    await expect.poll(() => page.getByRole("heading", { level: 3, name: "Second updated" }).count()).toBe(1);
    await expect.poll(() => page.locator("#second .summary strong em").count()).toBe(1);
    await page.locator("#first .trigger").click();
    await page.locator("#independent .trigger").click();
    await page.locator("#second .trigger").click();
    await expect.poll(() => page.locator("#first .trigger").getAttribute("aria-expanded")).toBe("false");
    await expect.poll(() => page.locator("#second .trigger").getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => page.locator("#independent .trigger").getAttribute("aria-expanded")).toBe("true");
    assert.deepEqual(await page.evaluate(() => (window as any).closes), [{ open: false, reason: "action", trigger: "pointer" }]);
    await page.close();
  });

  it("keeps named groups and summary slots through the converter", async () => {
    const path = await bundle("converted-disclosure-group", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiDisclosure as Disclosure } from "@looma-test/components";
      createScene({ render: () => sceneNode("div", [
        sceneNode(Disclosure, { id: "first", name: "faq", summary: "First", headingLevel: 2 }, () => sceneNode("p", "First answer")),
        sceneNode(Disclosure, { id: "second", name: "faq", summary: "Second", headingLevel: 2 }, {
          summary: () => sceneNode("strong", "Rich second"),
          default: () => sceneNode("p", "Second answer"),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await expect.poll(() => page.getByRole("heading", { level: 2, name: "Rich second" }).count()).toBe(1);
    await page.locator("#first .trigger").click();
    await page.locator("#second .trigger").click();
    await expect.poll(() => page.locator("#first .trigger").getAttribute("aria-expanded")).toBe("false");
    await page.close();
  });
});
