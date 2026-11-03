import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open, look } from "../renderers/browser-driver";

describe("Nav item", () => {
  const longDescription = "A description long enough that it cannot fit on one line of a narrow rail and must end in an ellipsis";

  // A colour as the page computes it, for comparing with a computed style.
  const resolveColor = (page: Page, color: string) => page.evaluate((value) => {
    const probe = document.body.appendChild(document.createElement("i"));
    probe.style.color = value;
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, color);

  it("shares configurable selection colors between compact navigation and tree rows", async () => {
    const path = await bundle("html-shared-navigation-selection", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div style="--ui-selection-surface:rgb(230,220,255);--ui-selection-text:rgb(81,50,140);width:240px">
        <ui-nav-item id="compact-nav" density="compact" current="page" as="a" href="#overview">Overview</ui-nav-item>
        <ui-nav-item id="plain-nav" density="compact" as="a" href="#activity">Activity</ui-nav-item>
        <ui-tree density="compact" label="Documents">
          <ui-tree-item id="selected-tree" selected label="Guide"><ui-icon slot="leading" name="file-text" aria-hidden="true"></ui-icon></ui-tree-item>
          <ui-tree-item id="colored-tree" selected label="Reference"><ui-icon slot="leading" name="file-text" aria-hidden="true" style="color:rgb(180,60,40)"></ui-icon></ui-tree-item>
          <ui-tree-item id="plain-tree" label="Notes"></ui-tree-item>
        </ui-tree>
      </div>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const look = (selector: string) => page.locator(selector).evaluate(el => {
      const s = getComputedStyle(el);
      return { surface: s.backgroundColor, text: s.color, size: s.fontSize, height: el.getBoundingClientRect().height };
    });
    const nav = await look("#compact-nav");
    const tree = await look("#selected-tree > .row");
    assert.equal(nav.surface, "rgb(230, 220, 255)");
    assert.equal(tree.surface, nav.surface);
    assert.equal(tree.text, nav.text);
    assert.equal(nav.text, "rgb(81, 50, 140)");
    assert.equal((await look("#compact-nav .label")).size, tree.size);
    assert.equal(nav.height, tree.height);
    assert.notEqual((await look("#plain-nav")).surface, nav.surface);
    assert.notEqual((await look("#plain-tree > .row")).surface, tree.surface);
    assert.equal(await page.locator("#selected-tree .leading svg").evaluate(el => getComputedStyle(el).color), nav.text);
    assert.equal(await page.locator("#colored-tree .leading svg").evaluate(el => getComputedStyle(el).color), "rgb(180, 60, 40)");
    await page.close();
  });

  it("separates rounded surface selection from straight continuous line selection", async () => {
    const path = await bundle("html-navigation-selection-geometry", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div style="--ui-accent-line-width:5px;--ui-selection-radius:13px">
        <ui-nav-item id="surface" current="page">Overview</ui-nav-item>
        <ui-nav-item id="line" variant="line" current="page">Reports</ui-nav-item>
      </div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#surface:is([component~="ui-nav-item"], [data-component~="ui-nav-item"], .ui-nav-item, [ui-nav-item])');
    await expect.poll(() => page.locator("#surface .indicator").isVisible(), { message: "rounded surface selection has no edge stripe" }).toBe(false);
    assert.equal(await page.locator("#surface").evaluate(el => getComputedStyle(el).borderRadius), "13px");
    assert.equal(await page.locator("#line").evaluate(el => getComputedStyle(el).borderRadius), "0px");
    const row = (await page.locator("#line").boundingBox())!;
    const marker = (await page.locator("#line .indicator").boundingBox())!;
    assert.equal(marker.width, 5);
    assert.equal(marker.y, row.y);
    assert.equal(marker.height, row.height);
    await page.close();
  });

  async function checkNavItem(page: Page) {
    await page.locator("#page").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1, `${what}: ${a} vs ${b}`);

    // current states aria-current: the page by default, or the kind of place asked for.
    await expect.poll(() => page.locator("#page").getAttribute("aria-current")).toBe("page");
    await expect.poll(() => page.locator("#step").getAttribute("aria-current")).toBe("step");
    await expect.poll(() => page.locator("#other").getAttribute("aria-current")).toBe(null);

    // Surface rows use one shape: all corners follow the shared radius and no inset stripe.
    await expect.poll(() => page.locator("#page .indicator").isVisible()).toBe(false);
    await expect.poll(() => page.locator("#rtl .indicator").isVisible()).toBe(false);
    const look = (id: string) => page.locator(id).evaluate((element) => {
      const style = getComputedStyle(element);
      return { surface: style.backgroundColor, weight: Number(style.fontWeight), radius: style.borderRadius };
    });
    const [current, other] = [await look("#page"), await look("#other")];
    assert.notEqual(current.surface, other.surface, "the current item takes the selected surface");
    assert.equal(current.weight, other.weight, "selection keeps the resting label weight");
    assert.equal(current.radius, "8px");
    const line = await box("#line");
    const marker = await box("#line .indicator");
    near(marker.width, 1, "the line uses the shared 1px accent weight");
    near(marker.y, line.y, "the line begins at the top");
    near(marker.height, line.height, "the line spans the complete row");
    assert.equal((await look("#line")).radius, "0px");
    const rtlLine = await box("#rtl-line");
    const rtlMarker = await box("#rtl-line .indicator");
    near(rtlMarker.x + rtlMarker.width, rtlLine.x + rtlLine.width, "a continuous line mirrors in RTL");

    // A link item is a real link: it navigates, and target and rel reach it.
    const link = page.locator("#other");
    assert.equal(await link.evaluate((element) => element.localName), "a");
    await expect.poll(() => link.getAttribute("type")).toBe(null);
    await expect.poll(() => page.locator("#page").getAttribute("target")).toBe("_self");
    await expect.poll(() => page.locator("#page").getAttribute("rel")).toBe("bookmark");
    await expect.poll(() => page.getByRole("link", { name: "Invoices" }).count()).toBe(1);
    await link.click();
    await page.waitForFunction(() => location.hash === "#invoices");

    // A button item is a button that never submits, and fires its click.
    const button = page.locator("#view");
    assert.equal(await button.evaluate((element) => element.localName), "button");
    await expect.poll(() => button.getAttribute("type")).toBe("button");
    await button.click();
    assert.equal(await page.evaluate(() => (window as unknown as { clicks: number }).clicks), 1);

    // Keyboard focus shows a ring, and Enter presses the focused item.
    await page.locator("#other").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "view");
    const ring = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { visible: element.matches(":focus-visible"), outline: `${style.outlineStyle} ${style.outlineWidth}` };
    });
    assert.deepEqual(ring, { visible: true, outline: "solid 2px" });
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => (window as unknown as { clicks: number }).clicks), 2);

    // Label and description are one line each, ending in an ellipsis.
    const lines = await page.locator("#long").evaluate((element) => [".label", ".description"].map((part) => {
      const region = element.querySelector(part) as HTMLElement;
      const style = getComputedStyle(region);
      return { overflowing: region.scrollWidth > region.clientWidth, ellipsis: style.textOverflow, wrap: style.whiteSpace };
    }));
    assert.deepEqual(lines[1], { overflowing: true, ellipsis: "ellipsis", wrap: "nowrap" });
    assert.deepEqual([lines[0].ellipsis, lines[0].wrap], ["ellipsis", "nowrap"]);

    // System colors keep a complete surface outline or a continuous line; focus stays separate.
    await page.emulateMedia({ forcedColors: "active" });
    const selectedOutline = await page.locator("#page").evaluate((element) => {
      const s = getComputedStyle(element);
      return { width: s.outlineWidth, color: s.outlineColor };
    });
    assert.deepEqual(selectedOutline, { width: "1px", color: await resolveColor(page, "Highlight") });
    await expect.poll(() => page.locator("#page .indicator").isVisible()).toBe(false);
    assert.equal(await page.locator("#line .indicator").evaluate(el => getComputedStyle(el).borderInlineStartColor), await resolveColor(page, "Highlight"));
    await page.emulateMedia({ forcedColors: "none" });
  }

  it("marks the current item with coherent surface or line geometry and works as a link or a button, in HTML", async () => {
    const path = await bundle("html-nav-item", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <script>window.clicks = 0;</script>
      <nav aria-label="Main" style="width: 240px">
        <ui-list>
          <li><ui-nav-item id="page" as="a" href="#shipments" target="_self" rel="bookmark" current="true"><span slot="leading">*</span>Shipments</ui-nav-item></li>
          <li><ui-nav-item id="other" as="a" href="#invoices">Invoices</ui-nav-item></li>
          <li><ui-nav-item id="view" onclick="window.clicks += 1">Overview</ui-nav-item></li>
          <li><ui-nav-item id="step" current="step">Team</ui-nav-item></li>
          <li><ui-nav-item id="line" variant="line" current="page">Reports</ui-nav-item></li>
          <li><ui-nav-item id="long">Customer<span slot="description">${longDescription}</span></ui-nav-item></li>
        </ui-list>
      </nav>
      <nav aria-label="RTL" dir="rtl" style="width: 240px"><ui-nav-item id="rtl" current="true">Shipments</ui-nav-item><ui-nav-item id="rtl-line" variant="line" current="true">Reports</ui-nav-item></nav>`,
    [join(root, "tokens.css")]);
    await page.waitForSelector('#long:is([component~="ui-nav-item"], [data-component~="ui-nav-item"], .ui-nav-item, [ui-nav-item])');
    await checkNavItem(page);
    await page.close();
  });

  it("marks the current item with coherent surface or line geometry and works as a link or a button, in converted output", async () => {
    const path = await bundle("converted-nav-item", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiList as List, UiNavItem as NavItem } from "@looma-test/components";
      window.clicks = 0;
      const item = (props, slots) => sceneNode("li", [sceneNode(NavItem, props, slots)]);
      createScene({ render: () => [
        sceneNode("nav", { "aria-label": "Main", style: "width: 240px" }, [sceneNode(List, null, () => [
          item({ id: "page", as: "a", href: "#shipments", target: "_self", rel: "bookmark", current: "true" }, { leading: () => sceneNode("span", "*"), default: () => "Shipments" }),
          item({ id: "other", as: "a", href: "#invoices" }, () => "Invoices"),
          item({ id: "view", onClick: () => { window.clicks += 1; } }, () => "Overview"),
          item({ id: "step", current: "step" }, () => "Team"),
          item({ id: "line", variant: "line", current: "page" }, () => "Reports"),
          item({ id: "long" }, { default: () => "Customer", description: () => sceneNode("span", ${JSON.stringify(longDescription)}) }),
        ])]),
        sceneNode("nav", { "aria-label": "RTL", dir: "rtl", style: "width: 240px" }, [sceneNode(NavItem, { id: "rtl", current: "true" }, () => "Shipments"), sceneNode(NavItem, { id: "rtl-line", variant: "line", current: "true" }, () => "Reports")]),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkNavItem(page);
    await page.close();
  });
});
