import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { componentRoot } from "../renderers/selectors";
const scrollRoot = componentRoot("ui-scroll-area");

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Dialog close policy and presentation", () => {
  for (const adapter of ["html", "converted"]) {
    for (const alert of [false, true]) it(`keeps ${adapter} ${alert ? "alert" : "regular"} dialog content inset and actions equally padded with early or late CSS`, async () => {
      const path = await bundle(`${adapter}-${alert ? "alert" : "regular"}-dialog-spacing`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiButton as Button, UiDialog as Dialog } from "@looma-test/components";
        createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, modal: true, alert: ${alert}, label: "Publish changes?" }, {
          default: () => sceneNode("p", { id: "message" }, "Your edits will be visible to everyone with access to this project."),
          actions: () => [sceneNode(Button, { variant: "outline" }, () => "Cancel"), sceneNode(Button, {}, () => "Publish")],
        }) }).mount("#app");
      `);
      const css = [join(root, "tokens.css"), join(root, "theme-light.css")];
      for (const width of [1024, 375]) {
        for (const late of [false, true]) {
          const page = await open(path, adapter === "html" ? `
            <ui-dialog id="dialog" open modal ${alert ? "alert" : ""} label="Publish changes?">
              <p id="message">Your edits will be visible to everyone with access to this project.</p>
              <ui-button slot="actions" variant="outline">Cancel</ui-button><ui-button slot="actions">Publish</ui-button>
            </ui-dialog>
          ` : '<div id="app"></div>', late ? [] : css, { viewport: { width, height: 720 }, reducedMotion: "reduce" });
          if (late) for (const stylesheet of css) await page.addStyleTag({ path: stylesheet });
          await page.waitForFunction(() => document.querySelector<HTMLDialogElement>("#dialog")?.open);
          const geometry = await page.locator("#dialog").evaluate(element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const message = element.querySelector("#message")!.getBoundingClientRect();
            const title = element.querySelector(".title")!.getBoundingClientRect();
            const footer = element.querySelector("footer")!;
            const action = footer.lastElementChild!.getBoundingClientRect();
            const body = element.querySelector(".body")!.getBoundingClientRect();
            return {
              titleTop: title.top - rect.top - parseFloat(style.borderTopWidth),
              left: message.left - rect.left - parseFloat(style.borderLeftWidth),
              right: rect.right - message.right - parseFloat(style.borderRightWidth),
              title: title.left - rect.left - parseFloat(style.borderLeftWidth),
              actionRight: rect.right - action.right - parseFloat(style.borderRightWidth),
              actionBottom: rect.bottom - action.bottom - parseFloat(style.borderBottomWidth),
              bodyTop: message.top - body.top, bodyBottom: body.bottom - message.bottom,
              gutter: parseFloat(getComputedStyle(footer).paddingInlineEnd),
              height: rect.height, viewportHeight: innerHeight, scroll: element.scrollHeight - element.clientHeight,
            };
          });
          const near = (actual: number, expected: number, message: string) => assert.ok(Math.abs(actual - expected) < 1, `${adapter}, ${width}px, late CSS ${late}: ${message}: ${JSON.stringify(geometry)}`);
          near(geometry.left, geometry.gutter, "body aligns with the title and footer gutter");
          near(geometry.right, geometry.gutter, "body has equal side padding");
          near(geometry.title, geometry.gutter, "title aligns with the body");
          if (alert) near(geometry.titleTop, geometry.gutter, "alert title has the same top inset as the side and bottom gutters");
          near(geometry.actionRight, geometry.gutter, "actions keep their end gutter");
          near(geometry.actionBottom, geometry.gutter, "actions have equal bottom and side gutters");
          near(geometry.bodyTop, 12, "paragraph's outer top margin does not inflate the body inset");
          near(geometry.bodyBottom, geometry.gutter, "paragraph's outer bottom margin does not inflate the body inset");
          assert.ok(geometry.height < geometry.viewportHeight / 2, "short content stays compact");
          assert.equal(geometry.scroll, 0, "the outer dialog does not scroll");
          await page.close();
        }
      }
    });

    it(`keeps ${adapter} dialog chrome pinned while the body grows, scrolls, and shrinks`, async () => {
      const path = await bundle(`${adapter}-dialog-scroll`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiButton as Button, UiDialog as Dialog } from "@looma-test/components";
        createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, modal: true, label: "Review changes" }, {
          default: () => sceneNode("div", { id: "content" }, "Short content"),
          actions: () => sceneNode(Button, {}, () => "Accept"),
        }) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-dialog id="dialog" open modal label="Review changes"><div id="content">Short content</div><ui-button slot="actions">Accept</ui-button></ui-dialog>
      ` : '<div id="app"></div>', [join(root, "tokens.css")],
        { viewport: { width: 375, height: 600 }, reducedMotion: "reduce" });
      const dialog = page.locator("#dialog");
      const short = await dialog.boundingBox();
      await page.locator("#content").evaluate(element => { element.innerHTML = "<p>Review this change.</p>".repeat(80); });
      const tall = await dialog.boundingBox();
      assert.ok(short && tall && tall.height > short.height && tall.y >= 16 && tall.y + tall.height <= 584, "growth stops at both viewport gutters");
      const scroller = page.locator('#dialog :is([component~="ui-scroll-area"], [data-component~="ui-scroll-area"], .ui-scroll-area, [ui-scroll-area])');
      assert.equal(await scroller.evaluate(element => element.scrollHeight > element.clientHeight), true, "long content scrolls inside Scroll Area");
      const pinned = await page.locator("#dialog header, #dialog footer").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().y));
      await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
      assert.ok(await scroller.evaluate(element => element.scrollTop) > 0);
      assert.deepEqual(await page.locator("#dialog header, #dialog footer").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().y)), pinned, "header and actions stay pinned while scrolling");
      await page.locator("#content").evaluate(element => { element.textContent = "Short content"; });
      const shrunk = await dialog.boundingBox();
      assert.ok(shrunk && Math.abs(shrunk.height - short!.height) < 1, "removing long content restores the compact height");
      await page.close();
    });
  }

  const isOpen = (id: string) => `document.querySelector("#${id}").open`;

  it("fits short content with equal action gutters and caps growing HTML and converted bodies at the viewport", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-dialog-content-size`, adapter === "html" ? `
        import "@looma-test/runtime";
        window.setLines = (count) => { document.querySelector("#content").textContent = Array(count).fill("Content line").join("\\n"); };
      ` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiButton as Button, UiDialog as Dialog } from "@looma-test/components";
        const lines = createState(1);
        window.setLines = (count) => { lines.value = count; };
        createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, label: "Details" }, {
          default: () => sceneNode("p", { id: "content" }, Array(lines.value).fill("Content line").join("\\n")),
          actions: () => sceneNode(Button, "Done"),
        }) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-dialog id="dialog" open label="Details"><p id="content">Content line</p><ui-button slot="actions">Done</ui-button></ui-dialog>' : '<div id="app"></div>',
        [join(root, "tokens.css"), join(root, "theme-light.css")], { viewport: { width: 1100, height: 600 }, reducedMotion: "reduce" });
      await page.addStyleTag({ content: "body {font:16px/24px system-ui} p {white-space:pre-line; margin-block:20px}" });
      const measure = () => page.locator("#dialog").evaluate((element, scrollRoot) => {
        const rect = element.getBoundingClientRect();
        const body = element.querySelector(".body")!;
        const content = element.querySelector("#content")!;
        const action = element.querySelector("footer button")!.getBoundingClientRect();
        const scroll = body.querySelector<HTMLElement>(scrollRoot)!;
        const border = parseFloat(getComputedStyle(element).borderBottomWidth);
        return { height: rect.height, top: rect.top, bottom: rect.bottom, contentHeight: content.getBoundingClientRect().height,
          marginStart: parseFloat(getComputedStyle(content).marginTop), marginEnd: parseFloat(getComputedStyle(content).marginBottom),
          bottomInset: rect.bottom - border - action.bottom, inlineInset: parseFloat(getComputedStyle(body).paddingLeft),
          scrolls: scroll.scrollHeight > scroll.clientHeight, actionBottom: action.bottom,
        };
      }, scrollRoot);
      const short = await measure();
      assert.equal(short.bottomInset, short.inlineInset, `${adapter}: actions have the same bottom and side gutters`);
      assert.equal(short.marginStart + short.marginEnd, 0, `${adapter}: paragraph edge margins do not inflate the dialog`);
      assert.ok(short.height < 200, `${adapter}: one line does not create an oversized dialog (${short.height}px)`);
      await page.evaluate(() => (window as any).setLines(60));
      await page.waitForFunction(selector => { const scroll = document.querySelector(selector)!; return scroll.scrollHeight > scroll.clientHeight; }, scrollRoot);
      const tall = await measure();
      assert.ok(tall.height > short.height && tall.top >= 16 && tall.bottom <= 584, `${adapter}: growth stops at viewport gutters`);
      assert.equal(tall.scrolls, true);
      assert.ok(tall.actionBottom <= 560, `${adapter}: actions remain visible when the body overflows`);
      await page.evaluate(() => (window as any).setLines(1));
      await page.waitForFunction(() => document.querySelector("#dialog")!.getBoundingClientRect().height < 200);
      assert.equal((await measure()).height, short.height, `${adapter}: shrinking restores intrinsic height`);
      await page.close();
    }
  });

  it("animates content growth and shrinkage, retargets an active resize, and respects reduced motion in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-dialog-height-motion`, adapter === "html" ? `
        import "@looma-test/runtime";
        window.setLines = count => { document.querySelector("#content").textContent = Array(count).fill("Content line").join("\\n"); };
      ` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiDialog as Dialog } from "@looma-test/components";
        const lines = createState(1);
        window.setLines = count => { lines.value = count; };
        createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, label: "Details" }, () => sceneNode("p", { id: "content" }, Array(lines.value).fill("Content line").join("\\n"))) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-dialog id="dialog" open label="Details"><p id="content">Content line</p></ui-dialog>' : '<div id="app"></div>',
        [join(root, "tokens.css")], { viewport: { width: 1100, height: 1000 }, reducedMotion: "no-preference" });
      await page.addStyleTag({ content: 'body {font:16px/24px system-ui} p {white-space:pre-line} #dialog {--ui-dialog-duration:200ms}' });
      await page.waitForFunction(() => document.querySelector("#dialog")!.getAnimations().length === 0);
      const short = await page.locator("#dialog").evaluate(element => element.getBoundingClientRect().height);
      const sample = async (lines: number, retarget = 0) => page.locator("#dialog").evaluate(async (element, { lines, retarget }) => {
        (window as any).setLines(lines);
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const frames = [];
        for (let frame = 0; frame < 30; frame++) {
          if (frame === 3 && retarget) (window as any).setLines(retarget);
          await new Promise(requestAnimationFrame);
          frames.push(element.getBoundingClientRect().height);
        }
        return frames;
      }, { lines, retarget });
      const growing = await sample(8);
      const tall = growing.at(-1)!;
      assert.ok(growing.some(height => height > short + 1 && height < tall - 1), `${adapter}: growth has intermediate rendered heights`);
      const shrinking = await sample(1);
      assert.ok(shrinking.some(height => height > short + 1 && height < tall - 1), `${adapter}: shrinkage has intermediate rendered heights`);
      assert.ok(Math.abs(shrinking.at(-1)! - short) < 1);
      const retargeted = await sample(8, 4);
      assert.ok(Math.abs(retargeted.at(-1)! - (short + 3 * 24)) < 1, `${adapter}: rapid content changes settle at the latest intrinsic height`);
      const capped = await sample(60);
      assert.ok(capped.some(height => height > retargeted.at(-1)! + 1 && height < 967), `${adapter}: growth animates toward the viewport cap`);
      assert.ok(Math.abs(capped.at(-1)! - 968) < 1, `${adapter}: animated growth respects both 16px viewport gutters`);
      assert.equal(await page.locator(scrollRoot).evaluate(element => element.scrollHeight > element.clientHeight), true);
      const uncapped = await sample(4);
      assert.ok(uncapped.some(height => height > retargeted.at(-1)! + 1 && height < 967), `${adapter}: shrinkage animates away from the viewport cap`);
      assert.ok(Math.abs(uncapped.at(-1)! - retargeted.at(-1)!) < 1);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const immediate = await sample(1);
      assert.ok(immediate.every(height => Math.abs(height - short) < 1), `${adapter}: reduced motion changes height immediately`);
      await page.close();
    }
  });

  it("keeps HTML and converted non-modal dialogs above transformed, clipped ancestors without a backdrop", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-dialog-top-layer`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiDialog as Dialog } from "@looma-test/components";
        createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, label: "Details" }, () => sceneNode("p", "Body")) }).mount("#app");
      `);
      const page = await open(path, `
        <div id="card" style="transform: translateY(-2px); overflow: hidden; width: 160px; height: 80px">
          ${adapter === "html" ? '<ui-dialog id="dialog" open label="Details"><p>Body</p></ui-dialog>' : '<div id="app"></div>'}
        </div>
        <div style="position: fixed; inset: 0; z-index: 2147483647; background: red"></div>
      `, [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "reduce" });
      const dialog = page.locator("#dialog");
      assert.equal(await dialog.evaluate((element) => element.matches(":popover-open")), true, `${adapter}: non-modal dialogs belong to the top layer`);
      assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
      assert.equal(await dialog.evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
      const geometry = await dialog.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const body = element.querySelector(".body")!;
        return {
          centerX: box.x + box.width / 2, centerY: box.y + box.height / 2,
          viewportX: innerWidth / 2, viewportY: innerHeight / 2,
          paintedAbove: element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)),
          padding: parseFloat(getComputedStyle(body).paddingLeft),
        };
      });
      assert.ok(Math.abs(geometry.centerX - geometry.viewportX) < 2 && Math.abs(geometry.centerY - geometry.viewportY) < 2, `${adapter}: dialog stays viewport-centered`);
      assert.equal(geometry.paintedAbove, true, `${adapter}: the dialog paints above ordinary page stacking contexts`);
      assert.ok(geometry.padding > 0, `${adapter}: the nested scroll component does not erase dialog body spacing`);
      await dialog.getByRole("button", { name: "Close" }).click();
      await page.waitForFunction(() => !(document.querySelector("#dialog") as HTMLDialogElement).open);
      assert.equal(await dialog.evaluate((element) => element.matches(":popover-open")), false, `${adapter}: closing releases the top layer`);
      await page.close();
    }
  });

  it("honors authored close commands outside a non-modal dialog", async () => {
    const path = await bundle("html-dialog-external-close", `import "@looma-test/runtime";`);
    const page = await open(path, '<button id="dismiss" command="close" commandfor="dialog">Dismiss dialog</button><ui-dialog id="dialog" open label="Details">Body</ui-dialog>', [join(root, "tokens.css")]);
    await page.locator("#dismiss").click();
    await page.waitForTimeout(50);
    assert.equal(await page.locator("#dialog").evaluate((dialog: HTMLDialogElement) => dialog.open), false);
    assert.equal(await page.locator("#dialog").evaluate((dialog) => dialog.matches(":popover-open")), false);
    await page.close();
  });

  it("keeps nested modal dialogs open with only one visible backdrop", async () => {
    const path = await bundle("html-dialog-nested-backdrops", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-dialog id="parent" open modal label="Parent">
        <button id="child-trigger">Open child</button>
        <ui-dialog id="child" for="child-trigger" modal label="Child">Child content</ui-dialog>
      </ui-dialog>
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "styles/ui-dialog.css")], { reducedMotion: "reduce" });
    await page.locator("#child-trigger").click();
    await page.waitForFunction(() => document.querySelector("#child")!.matches(":modal"));
    const backdrops = () => page.evaluate(() => ["parent", "child"].map((id) => getComputedStyle(document.getElementById(id)!, "::backdrop").backgroundColor));
    const [parent, child] = await backdrops();
    assert.equal(parent, "rgba(0, 0, 0, 0)", "the lower modal backdrop is transparent");
    assert.notEqual(child, "rgba(0, 0, 0, 0)", "the top modal supplies the backdrop");
    assert.equal(await page.locator("#parent").evaluate((element) => (element as HTMLDialogElement).open), true);
    await page.locator("#child").getByRole("button", { name: "Close" }).click();
    await page.waitForFunction(() => !document.querySelector("#child")!.matches(":modal"));
    assert.notEqual((await backdrops())[0], "rgba(0, 0, 0, 0)", "the parent backdrop returns when the child closes");
    await page.locator("#child-trigger").click();
    await page.waitForFunction(() => document.querySelector("#child")!.matches(":modal"));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#child")!.matches(":modal"));
    assert.equal(await page.locator("#parent").evaluate((element) => (element as HTMLDialogElement).open), true, "Escape closes only the top modal");
    await page.close();
  });

  it("shares one backdrop when a modal Search Shell opens inside a modal Dialog", async () => {
    const path = await bundle("html-dialog-search-shell-backdrop", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-dialog id="parent" open modal label="Parent">
        <ui-search-shell id="search" open modal label="Search"><input slot="search" aria-label="Query"></ui-search-shell>
      </ui-dialog>
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "styles/ui-dialog.css"), join(root, "styles/ui-search-shell.css")], { reducedMotion: "reduce" });
    const search = page.locator("#search dialog");
    await page.waitForFunction(() => document.querySelector("#search dialog")?.matches(":modal"));
    assert.equal(await page.locator("#parent").evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
    assert.notEqual(await search.evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await search.evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
    await search.evaluate((element: HTMLDialogElement) => element.close());
    await page.waitForFunction(() => !document.querySelector("#search dialog")?.open);
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#parent")!, "::backdrop").backgroundColor !== "rgba(0, 0, 0, 0)");
    assert.notEqual(await page.locator("#parent").evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
    await page.close();
  });

  it("is non-modal by default, like native show(): no backdrop, no scroll lock, Escape and outside presses do not close it", async () => {
    const path = await bundle("html-dialog-default", `
      import "@looma-test/runtime";
      const dialog = document.querySelector("#dialog");
      window.dialogEvents = [];
      dialog.addEventListener("open", (event) => window.dialogEvents.push({ type: "open", ...event.detail }));
      dialog.addEventListener("close", (event) => window.dialogEvents.push({ type: "close", ...event.detail }));
    `);
    const page = await open(path, `<ui-button id="trigger">Open</ui-button><button id="outside">Outside</button><ui-dialog id="dialog" for="trigger" label="Details"><button id="inside">Inside</button></ui-dialog>`, [join(root, "tokens.css")]);
    await page.locator("#trigger").click();
    const dialog = page.locator("#dialog");
    await page.waitForFunction(isOpen("dialog"));
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
    await expect.poll(() => dialog.getAttribute("closedby")).toBe("none");
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-ui-scroll-lock")), false);
    // Focus moves into the dialog, and the rest of the page stays usable.
    assert.equal(await page.evaluate(() => document.querySelector("#dialog")!.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    await page.locator("#outside").click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "outside");
    assert.equal(await dialog.evaluate((element) => (element as HTMLDialogElement).open), true);
    // The header close button is the visible exit.
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.waitForFunction(`!${isOpen("dialog")}`);
    assert.equal(await page.evaluate(() => document.activeElement?.closest("#trigger") !== null), true, "focus returns to the trigger");
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), [
      { type: "open", open: true, reason: "action", trigger: "pointer" },
      { type: "close", open: false, reason: "action", trigger: "pointer" },
    ]);
    await page.close();
  });

  it("opens modally with modal, locks scroll, closes on Escape, returns focus, and reports trigger and close events", async () => {
    const path = await bundle("html-dialog-close-policy", `
      import "@looma-test/runtime";
      const dialog = document.querySelector("#dialog");
      window.dialogEvents = [];
      dialog.addEventListener("open", (event) => window.dialogEvents.push({ type: "open", ...event.detail }));
      dialog.addEventListener("close", (event) => window.dialogEvents.push({ type: "close", ...event.detail }));
    `);
    const page = await open(path, `<ui-button id="trigger">Open</ui-button><ui-dialog id="dialog" for="trigger" modal label="Details"><button id="inside">Inside</button></ui-dialog>`, [join(root, "tokens.css")]);
    await page.locator("#trigger").click();
    const dialog = page.locator("#dialog");
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    await expect.poll(() => dialog.getAttribute("closedby")).toBe("closerequest");
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-ui-scroll-lock")), true);
    assert.equal(await page.evaluate(() => document.querySelector("#dialog")!.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    await page.waitForFunction(`!${isOpen("dialog")}`);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-ui-scroll-lock")), false);
    assert.equal(await page.evaluate(() => document.activeElement?.closest("#trigger") !== null), true);
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), [
      { type: "open", open: true, reason: "action", trigger: "pointer" },
      { type: "close", open: false, reason: "escape", trigger: "keyboard" },
    ]);
    await page.close();
  });

  it("keeps modeless as a no-op: non-modal alone, and modal wins when both are set", async () => {
    const path = await bundle("html-dialog-modeless", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-dialog id="modeless" open modeless label="Modeless">Body</ui-dialog>
      <ui-dialog id="both" open modal modeless label="Both">Body</ui-dialog>
    `, [join(root, "tokens.css")]);
    assert.equal(await page.locator("#modeless").evaluate((element) => element.matches(":modal")), false);
    await expect.poll(() => page.locator("#modeless").getAttribute("closedby")).toBe("none");
    assert.equal(await page.locator("#both").evaluate((element) => element.matches(":modal")), true);
    await expect.poll(() => page.locator("#both").getAttribute("closedby")).toBe("closerequest");
    await page.close();
  });

  it("follows closedby in each mode", async () => {
    const path = await bundle("html-dialog-closedby", `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.openPolicyDialog = id => componentRegistry.update(document.getElementById(id), { open: true });
    `);
    for (const modal of [false, true]) {
      const attribute = modal ? " modal" : "";
      const page = await open(path, `
        <ui-dialog id="any"${attribute} closedby="any" label="Any">Body</ui-dialog>
        <ui-dialog id="request"${attribute} closedby="closerequest" label="Request">Body</ui-dialog>
        <ui-dialog id="none"${attribute} closedby="none" label="None">Body</ui-dialog>
      `, [join(root, "tokens.css")]);
      // Controller imports can finish in any order. Open explicitly to establish the stack.
      for (const id of ["any", "request", "none"]) {
        await page.evaluate(id => (window as any).openPolicyDialog(id), id);
        await page.waitForFunction(isOpen(id));
      }
      // The last opened dialog is on top of the stack; each close uncovers the next.
      await page.keyboard.press("Escape");
      await page.mouse.click(4, 4);
      assert.equal(await page.evaluate(isOpen("none")), true, `closedby="none" ignores Escape and outside presses (modal: ${modal})`);
      await page.locator("#none").getByRole("button", { name: "Close" }).click();
      await page.waitForFunction(`!${isOpen("none")}`);
      await page.mouse.click(4, 4);
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(isOpen("request")), true, `closedby="closerequest" ignores outside presses (modal: ${modal})`);
      await page.keyboard.press("Escape");
      await page.waitForFunction(`!${isOpen("request")}`);
      await page.mouse.click(4, 4);
      await page.waitForFunction(`!${isOpen("any")}`);
      await page.close();
    }
  });

  it("switches between non-modal and modal while open in converted output, and keeps the close default in step", async () => {
    const path = await bundle("converted-dialog-modal-switch", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiDialog as Dialog } from "@looma-test/components";
      const modal = createState(false);
      window.dialogModal = modal;
      createScene({ render: () => sceneNode(Dialog, { id: "dialog", open: true, modal: modal.value, label: "Switch" }, () => "Body") }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const dialog = page.locator("#dialog");
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
    await expect.poll(() => dialog.getAttribute("closedby")).toBe("none");
    await page.evaluate(() => { (window as any).dialogModal.value = true; });
    await page.waitForFunction(() => document.querySelector("#dialog")!.matches(":modal"));
    await expect.poll(() => dialog.getAttribute("closedby")).toBe("closerequest");
    await page.evaluate(() => { (window as any).dialogModal.value = false; });
    await page.waitForFunction(() => !document.querySelector("#dialog")!.matches(":modal"));
    await expect.poll(() => dialog.getAttribute("closedby")).toBe("none");
    assert.equal(await page.evaluate(isOpen("dialog")), true);
    await page.close();
  });

  it("separates outside dismissal from Escape and keeps alerts modal and action-only when requested", async () => {
    const path = await bundle("html-dialog-alert", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-dialog id="dialog" open modal closedby="any" label="Info">Body</ui-dialog>
      <ui-button id="alert-trigger">Show alert</ui-button>
      <ui-dialog id="alert" for="alert-trigger" alert closedby="none" label="Delete?">Body<button commandfor="alert" command="close">Cancel</button></ui-dialog>
      <ui-button id="alert-default-trigger">Discard</ui-button>
      <ui-dialog id="alert-default" for="alert-default-trigger" alert label="Discard?">Body</ui-dialog>
    `, [join(root, "tokens.css")]);
    await page.mouse.click(4, 4);
    await page.waitForFunction(`!${isOpen("dialog")}`);
    const alert = page.locator("#alert");
    await page.locator("#alert-trigger").click();
    await expect.poll(() => alert.getAttribute("role")).toBe("alertdialog");
    assert.equal(await alert.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await alert.locator(".close").evaluate((element) => getComputedStyle(element).display), "none");
    await page.keyboard.press("Escape");
    assert.equal(await alert.evaluate((element) => (element as HTMLDialogElement).open), true);
    await alert.getByText("Cancel").click();
    await page.waitForFunction(`!${isOpen("alert")}`);
    // An alert without modal is still modal, with the modal close default.
    await page.locator("#alert-default-trigger").click();
    await page.waitForFunction(isOpen("alert-default"));
    assert.equal(await page.locator("#alert-default").evaluate((element) => element.matches(":modal")), true);
    await expect.poll(() => page.locator("#alert-default").getAttribute("closedby")).toBe("closerequest");
    await page.close();
  });

  it("supports size choices while retaining the local width hook", async () => {
    const path = await bundle("html-dialog-size", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-dialog id="small" open size="sm" label="Small">Body</ui-dialog>
      <ui-dialog id="large" open size="lg" label="Large">Body</ui-dialog>
      <ui-dialog id="custom" open size="sm" style="--ui-dialog-max-width: 520px" label="Custom">Body</ui-dialog>
      <ui-dialog id="full" open size="fullscreen" label="Full">Body</ui-dialog>
    `, [join(root, "tokens.css")]);
    const measure = async (id: string) => page.locator(id).evaluate((element) => ({ modal: element.matches(":modal"), width: Number.parseFloat(getComputedStyle(element).width), height: Number.parseFloat(getComputedStyle(element).height) }));
    const small = await measure("#small");
    const large = await measure("#large");
    const custom = await measure("#custom");
    const full = await measure("#full");
    assert.equal(small.modal, false);
    assert.ok(small.width < large.width && large.width < full.width);
    assert.ok(custom.width > small.width && custom.width < large.width);
    assert.ok(Math.abs(full.height - (await page.evaluate(() => window.innerHeight))) < 2);
    await page.close();
  });

  it("reports a controlled converted open once when the consumer changes it", async () => {
    const path = await bundle("converted-dialog-open", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiDialog as Dialog } from "@looma-test/components";
      const open = createState(false);
      window.dialogEvents = [];
      createScene({ render: () => [
        sceneNode("button", { id: "show", onClick: () => { open.value = true; } }, "Show"),
        sceneNode(Dialog, { id: "dialog", open: open.value, label: "Details", onOpen: (event) => window.dialogEvents.push(event.detail) }, () => "Body"),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), []);
    await page.locator("#show").click();
    await page.waitForFunction(() => (document.querySelector("#dialog") as HTMLDialogElement).open);
    assert.equal(await page.locator("#dialog").evaluate((element) => element.matches(":modal")), false);
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), [{ open: true, reason: "programmatic", trigger: "programmatic" }]);
    await page.close();
  });
});
