import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("List item", () => {
  const longTitle = "A title long enough that it cannot fit on one line of a narrow list and must end in an ellipsis";

  async function checkItem(page: Page) {
    const item = page.locator("#item");
    await item.waitFor();
    // The icon and padding follow the title's link.
    const box = (await page.locator("#icon").boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => location.hash === "#target");
    // A trailing control is its own: it does not follow the link.
    await page.evaluate(() => { history.replaceState(null, "", "#start"); });
    await page.locator("#restore").click();
    assert.equal(await page.evaluate(() => location.hash), "#start");
    assert.equal(await page.evaluate(() => (window as unknown as { restored: number }).restored), 1);
    // One line each, ending in an ellipsis.
    const title = await item.evaluate((element) => {
      const region = element.querySelector(".title") as HTMLElement;
      return { overflowing: region.scrollWidth > region.clientWidth, ellipsis: getComputedStyle(region).textOverflow };
    });
    assert.deepEqual(title, { overflowing: true, ellipsis: "ellipsis" });
    // A link item takes the hover surface; a card is bordered.
    await page.mouse.move(0, 0);
    const before = await item.evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished));
      return getComputedStyle(element).backgroundColor;
    });
    await page.locator("#item a").hover();
    await item.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
    assert.notEqual(await item.evaluate((element) => getComputedStyle(element).backgroundColor), before);
    assert.notEqual(await page.locator("#card").evaluate((element) => getComputedStyle(element).borderTopStyle), "none");
    assert.equal(await page.locator("#list").evaluate((element) => [element.tagName, element.getAttribute("role")].join(" ")), "UL list");
    assert.equal(await item.evaluate((element) => element.tagName), "LI");
  }

  it("aligns leading and trailing marks with the first title line when requested in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const title = "A complete title that wraps on a phone without moving its icon";
      const description = "A longer description that wraps onto several lines and keeps its icon beside the title.";
      const path = await bundle(`${adapter}-list-title-alignment`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiList as List, UiListItem as ListItem, UiIcon as Icon } from "@looma-test/components";
        createScene({render: () => sceneNode(List, null, () => ["title", "center"].map(align => sceneNode(ListItem, {id: align, wrap: true, ...(align === "title" ? {align} : {})}, {
          leading: () => sceneNode(Icon, {name: "file", style: "width:18px;height:18px"}),
          default: () => sceneNode("a", {href: "#destination"}, ${JSON.stringify(title)}),
          description: () => ${JSON.stringify(description)},
          trailing: () => sceneNode(Icon, {name: "chevron-right", style: "width:16px;height:16px"})
        }))) }).mount("#app");
      `);
      const html = ["title", "center"].map(align => `<ui-list-item id="${align}" wrap ${align === "title" ? 'align="title"' : ''}><ui-icon slot="leading" name="file" style="width:18px;height:18px"></ui-icon><a href="#destination">${title}</a><span slot="description">${description}</span><ui-icon slot="trailing" name="chevron-right" style="width:16px;height:16px"></ui-icon></ui-list-item>`).join("");
      const page = await open(path, adapter === "html" ? `<ui-list>${html}</ui-list>` : '<div id="app"></div>', [join(root, "tokens.css")]);
      for (const width of [1280, 375]) {
        await page.setViewportSize({width, height: 720});
        const geometry = await page.evaluate(() => ["title", "center"].map(id => {
          const item = document.getElementById(id)!, title = item.querySelector(".title")!, box = item.getBoundingClientRect();
          const firstLineCenter = title.getBoundingClientRect().top + parseFloat(getComputedStyle(title).lineHeight) / 2;
          const center = (selector: string) => { const rect = item.querySelector(selector)!.getBoundingClientRect(); return (rect.top + rect.bottom) / 2; };
          return {id, leading: center(".leading"), trailing: center(".trailing"), firstLineCenter, rowCenter: (box.top + box.bottom) / 2};
        }));
        assert.ok(Math.abs(geometry[0].leading - geometry[0].firstLineCenter) < 0.5, `${adapter}/${width}: leading mark tracks first line ${JSON.stringify(geometry)}`);
        assert.ok(Math.abs(geometry[0].trailing - geometry[0].firstLineCenter) < 0.5, "trailing mark follows the same line");
        assert.ok(Math.abs(geometry[1].leading - geometry[1].rowCenter) < 0.5, "omitted alignment preserves centered rows");
      }
      await page.close();
    }
  });

  it("follows its title link from anywhere but a trailing control, in HTML", async () => {
    const path = await bundle("html-list-item", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div style="width: 320px">
        <ui-list id="list" aria-label="Pages">
          <ui-list-item id="item">
            <span slot="leading" id="icon" style="display: inline-block; width: 18px; height: 18px">*</span>
            <a href="#target">${longTitle}</a>
            <span slot="description">Edited 2h ago</span>
            <button slot="trailing" id="restore" type="button" onclick="window.restored = (window.restored || 0) + 1">Restore</button>
          </ui-list-item>
          <ui-list-item id="card" variant="card"><a href="#card">Card</a></ui-list-item>
        </ui-list>
      </div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#item:is([component~="ui-list-item"], [data-component~="ui-list-item"], .ui-list-item, [ui-list-item])');
    await checkItem(page);
    await page.close();
  });

  it("follows its title link from anywhere but a trailing control, in converted output", async () => {
    const path = await bundle("converted-list-item", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiList as List, UiListItem as ListItem } from "@looma-test/components";
      window.restored = 0;
      createScene({ render: () => sceneNode("div", { style: "width: 320px" }, [
        sceneNode(List, { id: "list", "aria-label": "Pages" }, () => [
          sceneNode(ListItem, { id: "item" }, {
            leading: () => sceneNode("span", { id: "icon", style: "display: inline-block; width: 18px; height: 18px" }, "*"),
            default: () => sceneNode("a", { href: "#target" }, ${JSON.stringify(longTitle)}),
            description: () => sceneNode("span", "Edited 2h ago"),
            trailing: () => sceneNode("button", { id: "restore", type: "button", onClick: () => { window.restored += 1; } }, "Restore"),
          }),
          sceneNode(ListItem, { id: "card", variant: "card" }, () => sceneNode("a", { href: "#card" }, "Card")),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkItem(page);
    await page.close();
  });
});
