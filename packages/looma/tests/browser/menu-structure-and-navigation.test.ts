import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Menu structure and navigation", () => {
  it("aligns icon and label columns across grouped and iconless items in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-menu-columns`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiMenu as Menu, UiMenuItem as MenuItem, UiMenuGroup as MenuGroup, UiIcon as Icon } from "@looma-test/components";
        createScene({ render: () => sceneNode(Menu, { inline: true, icons: true }, () => [
          sceneNode(MenuItem, { id: "first", value: "edit" }, { icon: () => sceneNode(Icon, { name: "pencil" }), default: () => "Edit", shortcut: () => "Cmd E" }),
          sceneNode(MenuGroup, {}, () => [
            sceneNode(MenuItem, { id: "plain", value: "comments" }, () => "Comments"),
            sceneNode(MenuItem, { id: "link", href: "/history", value: "history" }, { icon: () => sceneNode(Icon, { name: "history" }), default: () => "History", shortcut: () => "Cmd H" }),
            sceneNode(MenuItem, { id: "danger", tone: "danger", value: "delete" }, { icon: () => sceneNode(Icon, { name: "trash-2" }), default: () => "Delete" })
          ])
        ]) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-menu inline icons>
          <ui-menu-item id="first" value="edit"><ui-icon slot="icon" name="pencil"></ui-icon>Edit<span slot="shortcut">Cmd E</span></ui-menu-item>
          <ui-menu-group>
            <ui-menu-item id="plain" value="comments">Comments</ui-menu-item>
            <ui-menu-item id="link" href="/history" value="history"><ui-icon slot="icon" name="history"></ui-icon>History<span slot="shortcut">Cmd H</span></ui-menu-item>
            <ui-menu-item id="danger" tone="danger" value="delete"><ui-icon slot="icon" name="trash-2"></ui-icon>Delete</ui-menu-item>
          </ui-menu-group>
        </ui-menu>` : '<div id="app"></div>', [join(root, "tokens.css")]);
      await page.waitForSelector('#first:is([component~="ui-menu-item"], [data-component~="ui-menu-item"], .ui-menu-item, [ui-menu-item])');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.evaluate(() => {
          const items = ["first", "plain", "link", "danger"].map(id => document.getElementById(id)!);
          return { labels: items.map(item => item.querySelector(".label")!.getBoundingClientRect().left),
            icons: items.map(item => item.querySelector(".icon")?.getBoundingClientRect().width ?? 0),
            shortcuts: [items[0], items[2]].map(item => item.querySelector(".shortcut")!.getBoundingClientRect().right),
            danger: getComputedStyle(items[3]).color, normal: getComputedStyle(items[0]).color };
        });
        assert.ok(Math.max(...geometry.labels) - Math.min(...geometry.labels) < 1, `${adapter}/${width}: labels share one column ${JSON.stringify(geometry)}`);
        assert.deepEqual(geometry.icons, [16, 16, 16, 16], "iconless rows reserve the icon column");
        assert.ok(Math.abs(geometry.shortcuts[0] - geometry.shortcuts[1]) < 1, "shortcut hints share a trailing column");
        assert.notEqual(geometry.danger, geometry.normal, "destructive tone survives column layout");
      }
      await page.getByRole("menuitem", { name: "Edit", exact: true }).focus();
      await page.keyboard.press("ArrowDown");
      assert.equal(await page.locator("#plain").evaluate(el => el === document.activeElement), true);
      await page.close();
    }
  });
  it("dismisses only the top menu when Escape bubbles through its containing popover", async () => {
    const path = await bundle("html-nested-menu-escape", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-button id="settings-trigger">Settings</ui-button>
      <ui-popover id="settings" for="settings-trigger">
        <ui-button id="format-trigger">Formatting</ui-button>
        <ui-menu id="format" for="format-trigger" aria-label="Formatting">
          <ui-menu-item value="plain" type="radio">Plain</ui-menu-item>
          <ui-menu-item value="numbered" type="radio">Numbered</ui-menu-item>
        </ui-menu>
      </ui-popover>
    `, [join(root, "tokens.css")]);
    await page.locator("#settings-trigger").click();
    await page.locator("#format-trigger").click();
    await page.getByRole("menuitemradio", { name: "Plain" }).focus();
    await page.keyboard.press("Escape");
    await expect.poll(() => page.locator("#format-trigger").getAttribute("aria-expanded")).toBe("false");
    await expect.poll(() => page.locator("#settings-trigger").getAttribute("aria-expanded")).toBe("true");
    await page.keyboard.press("Escape");
    await expect.poll(() => page.locator("#settings-trigger").getAttribute("aria-expanded")).toBe("false");
    await page.close();
  });

  it("spaces slotted icons and keeps ghost triggers pressed while overlays are open", async () => {
    const path = await bundle("html-menu-icon-and-ghost-trigger", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-icon-button id="menu-trigger" variant="ghost" label="Page actions"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" /></svg></ui-icon-button>
      <ui-menu id="actions" for="menu-trigger" density="compact" aria-label="Page actions">
        <ui-menu-item id="move" value="move"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h12" /></svg>Move to…</ui-menu-item>
      </ui-menu>
      <ui-button id="popover-trigger" variant="ghost">Details</ui-button>
      <ui-popover id="details" for="popover-trigger">More details.</ui-popover>
    `, [join(root, "tokens.css")]);
    const menuTrigger = page.locator("#menu-trigger");
    const popoverTrigger = page.locator("#popover-trigger");
    const background = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);
    const menuRest = await background("#menu-trigger");
    const popoverRest = await background("#popover-trigger");

    await menuTrigger.click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    await expect.poll(() => menuTrigger.getAttribute("aria-expanded")).toBe("true");
    assert.notEqual(await background("#menu-trigger"), menuRest, "open menu keeps the ghost trigger pressed");
    const gap = await page.locator("#move .label").evaluate((label) => {
      const icon = label.querySelector("svg")!;
      const text = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
      const range = document.createRange();
      range.selectNodeContents(text);
      return range.getBoundingClientRect().left - icon.getBoundingClientRect().right;
    });
    assert.ok(gap >= 6, `menu icon and label need a visible gap, got ${gap}px`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    await expect.poll(() => menuTrigger.getAttribute("aria-expanded")).toBe("false");
    assert.equal(await background("#menu-trigger"), menuRest);

    await popoverTrigger.click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    await expect.poll(() => popoverTrigger.getAttribute("aria-expanded")).toBe("true");
    assert.notEqual(await background("#popover-trigger"), popoverRest, "open popover keeps the ghost trigger pressed");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    await expect.poll(() => popoverTrigger.getAttribute("aria-expanded")).toBe("false");
    assert.equal(await background("#popover-trigger"), popoverRest);
    await page.close();
  });

  it("clears trigger expansion when a converted menu or popover unmounts", async () => {
    const path = await bundle("converted-overlay-trigger-cleanup", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiButton as Button, UiIconButton as IconButton, UiMenu as Menu, UiMenuItem as MenuItem, UiPopover as Popover } from "@looma-test/components";
      const menuVisible = createState(true);
      const popoverVisible = createState(true);
      window.hideOverlays = () => { menuVisible.value = false; popoverVisible.value = false; };
      createScene({ render: () => sceneNode("div", [
        sceneNode(IconButton, { id: "menu-trigger", label: "Actions", variant: "ghost" }, () => "…"),
        menuVisible.value ? sceneNode(Menu, { id: "menu", for: "menu-trigger", open: true }, () => sceneNode(MenuItem, { value: "edit" }, () => "Edit")) : null,
        sceneNode(Button, { id: "popover-trigger", variant: "ghost" }, () => "Details"),
        popoverVisible.value ? sceneNode(Popover, { id: "popover", for: "popover-trigger", open: true }, () => "Details") : null,
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const menuTrigger = page.locator("#menu-trigger");
    const popoverTrigger = page.locator("#popover-trigger");
    await expect.poll(() => menuTrigger.getAttribute("aria-expanded")).toBe("true");
    await expect.poll(() => popoverTrigger.getAttribute("aria-expanded")).toBe("true");
    await page.evaluate(() => (window as any).hideOverlays());
    await page.waitForFunction(() => !document.querySelector("#menu") && !document.querySelector("#popover"));
    await expect.poll(() => menuTrigger.getAttribute("aria-expanded")).not.toBe("true");
    await expect.poll(() => popoverTrigger.getAttribute("aria-expanded")).not.toBe("true");
    await page.close();
  });

  it("collapses consumer-controlled triggers after conditional converted overlays close", async () => {
    for (const kind of ["menu", "popover"]) {
      const path = await bundle(`converted-controlled-${kind}-cleanup`, `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiButton as Button, UiMenu as Menu, UiMenuItem as MenuItem, UiPopover as Popover } from "@looma-test/components";
        const visible = createState(false);
        window.hideOverlay = () => visible.value = false;
        createScene({ render: () => sceneNode("div", [
          sceneNode(Button, { id: "trigger", variant: "field", "aria-expanded": visible.value, onClick: () => visible.value = !visible.value }, () => "Choose color"),
          visible.value ? sceneNode(${kind == "menu" ? "Menu" : "Popover"}, { id: "overlay", for: "trigger", open: true, onClose: () => visible.value = false, onSelect: () => visible.value = false }, () =>
            ${kind == "menu" ? 'sceneNode(MenuItem, { id: "choice", value: "red" }, () => "Red")' : 'sceneNode(Button, { id: "choice", onClick: () => visible.value = false }, () => "Red")'}
          ) : null,
          sceneNode(Button, { id: "outside" }, () => "Outside"),
        ]) }).mount("#app");
      `);
      const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
      const trigger = page.locator("#trigger");
      for (const dismissal of ["choice", "escape", "outside", "trigger", "programmatic"]) {
        await trigger.click();
        await page.locator("#choice").waitFor({ state: "visible" });
        if (dismissal === "escape") await page.keyboard.press("Escape");
        else if (dismissal === "programmatic") await page.evaluate(() => (window as any).hideOverlay());
        else await page.locator(`#${dismissal}`).click();
        await page.waitForFunction(() => !document.querySelector("#overlay"));
        await expect.poll(() => trigger.getAttribute("aria-expanded"), { message: `${kind}: ${dismissal} leaves its controlled trigger collapsed` }).toBe("false");
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
        assert.ok(!(await trigger.evaluate(element => getComputedStyle(element).boxShadow)).includes("inset"), `${kind}: ${dismissal} releases the pressed field surface`);
        if (kind === "menu" && dismissal === "escape") assert.equal(await trigger.evaluate(element => element === document.activeElement), true, "Escape retains keyboard focus on the menu trigger");
      }
      await page.close();
    }
  });

  it("keeps link semantics, groups and separators, and moves through enabled items in HTML", async () => {
    const path = await bundle("html-menu-structure", `
      import "@looma-test/runtime";
      window.selections = [];
      document.querySelector("#menu").addEventListener("select", (event) => window.selections.push(event.detail));
    `);
    const page = await open(path, `
      <ui-menu id="menu" open aria-label="Actions">
        <ui-menu-group label="Files">
          <ui-menu-item id="alpha" value="alpha">Alpha <kbd slot="shortcut">⌘A</kbd></ui-menu-item>
          <ui-menu-item id="disabled" value="disabled" href="#disabled" disabled>Blocked</ui-menu-item>
          <ui-menu-item id="bravo" value="bravo" href="#details">Bravo</ui-menu-item>
        </ui-menu-group>
        <hr id="separator">
        <ui-menu-item id="charlie" value="charlie">Charlie</ui-menu-item>
      </ui-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#menu");
    await expect.poll(() => menu.getByRole("group", { name: "Files" }).count()).toBe(1);
    await expect.poll(() => menu.getByRole("separator").count()).toBe(1);
    assert.equal(await page.locator("#bravo").evaluate((element) => element.localName), "a");
    await expect.poll(() => page.locator("#disabled").getAttribute("href")).toBe(null);
    await expect.poll(() => menu.locator(".shortcut").first().getAttribute("aria-hidden")).toBe("true");
    await page.locator("#alpha").focus();
    const active = () => page.evaluate(() => document.activeElement?.id);
    await page.keyboard.press("ArrowDown");
    assert.equal(await active(), "bravo", "disabled items are skipped");
    await page.keyboard.press("End");
    assert.equal(await active(), "charlie");
    await page.keyboard.press("ArrowDown");
    assert.equal(await active(), "alpha", "arrows wrap");
    await page.keyboard.press("c");
    assert.equal(await active(), "charlie", "typeahead uses the item label, not its shortcut");
    await page.keyboard.press("Home");
    assert.equal(await active(), "alpha");
    await page.locator("#bravo").click();
    await page.waitForFunction(() => location.hash === "#details");
    assert.deepEqual(await page.evaluate(() => (window as any).selections), [{ value: "bravo", trigger: "pointer" }]);
    await page.close();
  });

  it("projects groups and links through the converter and navigates a context menu", async () => {
    const path = await bundle("converted-menu-structure", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiContextMenu as ContextMenu, UiMenuGroup as MenuGroup, UiMenuItem as MenuItem } from "@looma-test/components";
      createScene({ render: () => sceneNode(ContextMenu, { id: "menu", open: true, for: "target" }, () => [
        sceneNode(MenuGroup, { label: "View" }, () => [
          sceneNode(MenuItem, { id: "one", value: "one" }, () => "One"),
          sceneNode(MenuItem, { id: "two", href: "#two", value: "two" }, () => "Two"),
        ]),
        sceneNode(MenuItem, { id: "three", value: "three" }, () => "Three"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<button id="target">Target</button><div id="app"></div>`, [join(root, "tokens.css")]);
    const menu = page.locator("#menu");
    await expect.poll(() => menu.getByRole("group", { name: "View" }).count()).toBe(1);
    assert.equal(await page.locator("#two").evaluate((element) => element.localName), "a");
    await page.locator("#one").focus();
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "three");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "one");
    await page.close();
  });

  it("toggles checkboxes and keeps radio choices exclusive within their groups", async () => {
    const path = await bundle("html-menu-checks", `
      import "@looma-test/runtime";
      window.menuEvents = [];
      document.querySelector("#menu").addEventListener("select", (event) => window.menuEvents.push(["select", event.detail]));
      document.addEventListener("change", (event) => { if (event.target.closest("#menu")) window.menuEvents.push(["change", event.detail]); });
    `);
    const page = await open(path, `
      <ui-menu id="menu" open aria-label="View options">
        <ui-menu-item id="grid" type="checkbox" value="grid">Show grid</ui-menu-item>
        <ui-menu-group label="Sort">
          <ui-menu-item id="name" type="radio" value="name" checked>Name</ui-menu-item>
          <ui-menu-item id="date" type="radio" value="date">Date</ui-menu-item>
        </ui-menu-group>
        <ui-menu-group label="Direction">
          <ui-menu-item id="ascending" type="radio" value="ascending" checked>Ascending</ui-menu-item>
          <ui-menu-item id="descending" type="radio" value="descending">Descending</ui-menu-item>
        </ui-menu-group>
      </ui-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#menu");
    await expect.poll(() => page.locator("#grid").getAttribute("role")).toBe("menuitemcheckbox");
    await expect.poll(() => page.locator("#name").getAttribute("role")).toBe("menuitemradio");
    await expect.poll(() => page.locator("#name").getAttribute("aria-checked")).toBe("true");
    for (const id of ["grid", "date"]) {
      const indicator = page.locator(`#${id} .indicator`);
      assert.equal(await indicator.evaluate((element) => getComputedStyle(element).borderStyle), "solid", `${id} shows an unchecked control`);
      assert.ok((await indicator.boundingBox())?.width, `${id} reserves a visible control`);
    }
    await page.locator("#grid").click();
    await expect.poll(() => page.locator("#grid").getAttribute("aria-checked")).toBe("true");
    assert.equal(await menu.evaluate((element) => getComputedStyle(element).display === "none"), false, "checkable choice keeps menu open");
    await page.locator("#grid").focus();
    await page.keyboard.press("Space");
    await expect.poll(() => page.locator("#grid").getAttribute("aria-checked")).toBe("false");
    await page.locator("#date").click();
    await expect.poll(() => page.locator("#date").getAttribute("aria-checked")).toBe("true");
    await expect.poll(() => page.locator("#name").getAttribute("aria-checked")).toBe("false");
    await expect.poll(() => page.locator("#ascending").getAttribute("aria-checked"), { message: "another group keeps its radio choice" }).toBe("true");
    assert.deepEqual(await page.evaluate(() => (window as any).menuEvents), [
      ["change", { checked: true, value: "grid", type: "checkbox", trigger: "pointer" }],
      ["select", { value: "grid", checked: true, trigger: "pointer" }],
      ["change", { checked: false, value: "grid", type: "checkbox", trigger: "keyboard" }],
      ["select", { value: "grid", checked: false, trigger: "keyboard" }],
      ["change", { checked: false, value: "name", type: "radio", trigger: "pointer" }],
      ["change", { checked: true, value: "date", type: "radio", trigger: "pointer" }],
      ["select", { value: "date", checked: true, trigger: "pointer" }],
    ]);
    await page.close();
  });

  it("keeps a controlled converted check item in sync inside a context menu", async () => {
    const path = await bundle("converted-menu-check", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiContextMenu as ContextMenu, UiMenuItem as MenuItem } from "@looma-test/components";
      const checked = createState(false);
      window.changes = [];
      createScene({ render: () => sceneNode(ContextMenu, { id: "menu", open: true, for: "target" }, () =>
        sceneNode(MenuItem, { id: "grid", type: "checkbox", checked: checked.value, value: "grid", onChange: (event) => { window.changes.push(event.detail); checked.value = event.detail.checked; } }, () => "Show grid"))
      }).mount("#app");
    `);
    const page = await open(path, `<button id="target">Target</button><div id="app"></div>`, [join(root, "tokens.css")]);
    await page.locator("#grid").click();
    await expect.poll(() => page.locator("#grid").getAttribute("aria-checked")).toBe("true");
    assert.deepEqual(await page.evaluate(() => (window as any).changes), [{ checked: true, value: "grid", type: "checkbox", trigger: "pointer" }]);
    await page.close();
  });

  it("keeps checked indicators and keyboard focus visible across themes", async () => {
    const path = await bundle("html-menu-themes", `import "@looma-test/runtime";`);
    const css = ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file));
    const page = await open(path, `<ui-menu open aria-label="Options"><ui-menu-item id="grid" type="checkbox" checked>Show grid</ui-menu-item><ui-menu-item id="date" type="radio" checked>Date</ui-menu-item></ui-menu>`, css);
    // Material gradients can paint an opaque surface while backgroundColor stays transparent.
    // Sample the indicator and its actual neighboring row paint instead of assuming an RGB color.
    const indicatorContrast = async () => {
      const item = page.locator("#grid");
      const geometry = await item.evaluate(item => {
        const row = item.getBoundingClientRect(), indicator = item.querySelector(".indicator")!.getBoundingClientRect();
        return {
          points: [
            [indicator.x - row.x + indicator.width / 2, indicator.y - row.y + 2],
            [indicator.right - row.x + parseFloat(getComputedStyle(item).gap) / 2, indicator.y - row.y + indicator.height / 2],
          ],
          icon: Boolean(item.querySelector(".indicator svg")),
        };
      });
      const base64 = (await item.screenshot({ animations: "disabled" })).toString("base64");
      return page.evaluate(async ({base64,geometry}) => {
        const image = new Image(); image.src = "data:image/png;base64," + base64; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext("2d")!; context.drawImage(image,0,0);
        const [indicator,surface] = geometry.points.map(([x,y]) => [...context.getImageData(Math.floor(x!),Math.floor(y!),1,1).data].slice(0,3));
        const luminance = (color: number[]) => {
          const [r,g,b] = color.map(channel => { const scaled=channel/255; return scaled<=.04045?scaled/12.92:((scaled+.055)/1.055)**2.4; });
          return r!*.2126+g!*.7152+b!*.0722;
        };
        const ink=luminance(indicator!),background=luminance(surface!);
        return {ratio:(Math.max(ink,background)+.05)/(Math.min(ink,background)+.05),icon:geometry.icon,surface:"rgb("+surface!.join(",")+")"};
      }, {base64,geometry});
    };
    for (const [attribute, value] of [["data-theme", "light"], ["data-theme", "dark"], ["data-contrast", "high"]] as const) {
      await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.removeAttribute("data-contrast"); });
      await page.evaluate(([attribute, value]) => document.documentElement.setAttribute(attribute, value), [attribute, value]);
      const result = await indicatorContrast();
      assert.equal(result.icon, true);
      assert.ok(result.ratio >= 3, `${value} checked indicator has ${result.ratio.toFixed(2)}:1 contrast`);
      if (value === "high") {
        const indicator = page.locator("#grid .indicator");
        await indicator.evaluate((element,color) => { (element as HTMLElement).style.backgroundColor=color; },result.surface);
        assert.ok((await indicatorContrast()).ratio < 3,"the pixel probe rejects an indicator that blends into its row");
        await indicator.evaluate(element => { (element as HTMLElement).style.removeProperty("background-color"); });
      }
    }
    await page.emulateMedia({ forcedColors: "active" });
    await page.locator("#grid").focus();
    await page.keyboard.press("ArrowDown");
    const focus = await page.locator("#date").evaluate((item) => ({ style: getComputedStyle(item).outlineStyle, width: getComputedStyle(item).outlineWidth, active: document.activeElement?.id, visible: item.matches(":focus-visible") }));
    assert.equal(focus.style, "solid", JSON.stringify(focus));
    assert.equal(focus.width, "2px");
    await page.close();
  });
});
