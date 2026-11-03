import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Multiline input group behavior", () => {
  it("gives a subtle multiline composer one shared frame with a bottom-end icon action in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-subtle-composer`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiIcon as Icon, UiIconButton as IconButton, UiInputGroup as InputGroup, UiTextarea as Textarea } from "@looma-test/components";
        createScene({ render: () => [sceneNode(InputGroup, { id: "composer", multiline: true, variant: "subtle" }, {
          default: () => sceneNode(Textarea, { id: "message", rows: 3, "aria-label": "Message" }),
          action: () => sceneNode(IconButton, { id: "send", variant: "solid", label: "Send message" }, () => sceneNode(Icon, { name: "check" })),
        }), sceneNode(InputGroup, { id: "ordinary" }, () => sceneNode(Textarea, { "aria-label": "Ordinary" }))] }).mount("#app");
      `);
      const page = await open(path, adapter === "converted" ? '<div id="app"></div>' : `
        <ui-input-group id="composer" multiline variant="subtle"><ui-textarea id="message" rows="3" aria-label="Message"></ui-textarea><ui-icon-button id="send" slot="action" variant="solid" label="Send message"><ui-icon name="check"></ui-icon></ui-icon-button></ui-input-group>
        <ui-input-group id="ordinary"><ui-textarea aria-label="Ordinary"></ui-textarea></ui-input-group>`,
      [join(root, "tokens.css")]);
      try {
        await page.addStyleTag({ content: "* { transition: none !important; } body { font-family: var(--ui-font-family-sans); }" });
        for (const width of [1280, 375]) for (const dir of ["ltr", "rtl"]) {
          await page.setViewportSize({ width, height: 720 });
          await page.locator("html").evaluate((element, dir) => element.setAttribute("dir", dir), dir);
          const surface = await page.locator("#composer").evaluate(element => {
            const style = getComputedStyle(element), box = element.getBoundingClientRect();
            const input = element.querySelector("textarea")!, field = input.getBoundingClientRect(), action = element.querySelector("button")!.getBoundingClientRect();
            const probe = document.createElement("span");
            probe.style.borderColor = "var(--ui-border)"; probe.style.backgroundColor = "var(--ui-surface-muted)"; element.append(probe);
            const expected = getComputedStyle(probe), result = { border: style.borderTopColor, expectedBorder: expected.borderTopColor, surface: style.backgroundColor, expectedSurface: expected.backgroundColor,
              innerBorder: getComputedStyle(input).borderTopWidth, innerSurface: getComputedStyle(input).backgroundColor, inside: action.bottom < box.bottom && action.top >= field.bottom,
              end: getComputedStyle(element).direction === "ltr" ? box.right - action.right : action.left - box.left, overflow: document.documentElement.scrollWidth > innerWidth };
            probe.remove(); return result;
          });
          assert.equal(surface.border, surface.expectedBorder, "the subtle composer uses a decorative neutral edge");
          assert.equal(surface.surface, surface.expectedSurface, "the composer uses the standard muted surface");
          assert.equal(surface.innerBorder, "0px", "the textarea adds no inner frame");
          assert.equal(surface.innerSurface, "rgba(0, 0, 0, 0)", "the textarea shares its group's surface");
          assert.equal(surface.inside, true, "the icon action stays inside the frame below the text");
          assert.ok(surface.end <= 10, "the action sits at the logical end");
          assert.equal(surface.overflow, false);
        }
        assert.notEqual(await page.locator("#composer").evaluate(element => getComputedStyle(element).borderTopColor), await page.locator("#ordinary").evaluate(element => getComputedStyle(element).borderTopColor), "the default input frame remains stronger");
        await page.locator("#message").focus();
        assert.notEqual(await page.locator("#composer").evaluate(element => getComputedStyle(element).boxShadow), "none", "the quiet composer retains the input focus ring");
        await page.locator("html").evaluate(element => element.setAttribute("dir", "ltr"));
        await page.locator("#message").blur();
        if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, ".test-build", `${adapter}-subtle-composer-375.png`) });
      } finally { await page.close(); }
    }
  });

  for (const adapter of ["HTML", "Converted"] as const) {
    it(`reserves textarea text space for a top-end action in ${adapter}, including changing labels at narrow widths`, async () => {
      const source = adapter === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiButton as Button, UiInputGroup as InputGroup, UiTextarea as Textarea } from "@looma-test/components";
        const pending = createState(false);
        const label = createState("Send");
        window.setPending = value => { pending.value = value; };
        window.setLabel = value => { label.value = value; };
        createScene({ render: () => sceneNode(InputGroup, { id: "group", multiline: true, actionPosition: "top-end" }, {
          default: () => sceneNode(Textarea, { id: "message", rows: 4, "aria-label": "Message" }),
          action: () => sceneNode(Button, { id: "send", pending: pending.value }, () => label.value),
        }) }).mount("#app");`;
      const path = await bundle(`top-end-${adapter}`, source);
      const page = await open(path, adapter === "HTML" ? `
        <ui-input-group id="group" multiline action-position="top-end">
          <ui-textarea id="message" rows="4" aria-label="Message"></ui-textarea>
          <ui-button id="send" slot="action">Send</ui-button>
        </ui-input-group>` : `<div id="app"></div>`, adapter === "HTML" ? [join(root, "tokens.css")] : [join(root, "tokens.css")]);
      const field = page.getByRole("textbox", { name: "Message" }), send = page.locator("#send");
      for (const width of [800, 375, 240]) {
        await page.setViewportSize({ width, height: 812 });
        await field.fill("A long first line that must wrap before it reaches the action.\nAnother line.");
        for (const label of ["Send", "Send message", "En cours…"]) {
          if (adapter === "HTML") await send.evaluate((element, text) => { element.textContent = text; }, label);
          else await page.evaluate(text => (window as unknown as { setLabel(value: string): void }).setLabel(text), label);
          await page.waitForTimeout(50);
          const textBox = (await field.boundingBox())!, action = (await send.boundingBox())!;
          assert.ok(action.y >= textBox.y && action.y < textBox.y + 16, "action is inside the textarea at its top");
          assert.ok(action.x >= textBox.x && action.x + action.width <= textBox.x + textBox.width, "action is inside its right edge");
          const padding = await field.evaluate(element => parseFloat(getComputedStyle(element).paddingRight));
          assert.ok(textBox.x + textBox.width - padding < action.x, "textarea text ends before the action");
          assert.ok(action.y + action.height < textBox.y + textBox.height - 16, "native bottom-right resize grip remains clear");
          assert.equal(await field.evaluate(element => getComputedStyle(element).resize), "vertical");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
      }
      await page.evaluate(native => {
        if (native) document.querySelector("#send")!.setAttribute("pending", "");
        else (window as unknown as { setPending: (value: boolean) => void }).setPending(true);
      }, adapter === "HTML");
      await page.waitForTimeout(50);
      const pendingField = (await field.boundingBox())!, pendingAction = (await send.boundingBox())!;
      const pendingPadding = await field.evaluate(element => parseFloat(getComputedStyle(element).paddingRight));
      assert.ok(pendingField.x + pendingField.width - pendingPadding < pendingAction.x, "actual pending indicator has reserved space");
      await page.locator("#group").evaluate(element => element.setAttribute("dir", "rtl"));
      await page.waitForTimeout(50);
      const rtlField = (await field.boundingBox())!, rtlAction = (await send.boundingBox())!;
      const rtlPadding = await field.evaluate(element => parseFloat(getComputedStyle(element).paddingLeft));
      assert.ok(rtlField.x + rtlPadding > rtlAction.x + rtlAction.width, "logical end padding follows RTL placement");
      await page.locator("#group .action").evaluate(element => element.remove());
      await page.waitForTimeout(50);
      assert.ok(await field.evaluate(element => parseFloat(getComputedStyle(element).paddingLeft)) < 20, "removing the action restores normal text space");
      await field.focus();
      assert.notEqual(await page.locator("#group").evaluate(element => getComputedStyle(element).boxShadow), "none");
      await page.close();
    });
  }

  it("shares frame, labeling and native form behavior for a multiline HTML textarea at 375px", async () => {
    const path = await bundle("html-multiline-input-group", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form">
        <label for="message">Message</label>
        <ui-input-group id="multiline" multiline>
          <ui-textarea id="message" name="message" rows="3" value="A draft"></ui-textarea>
          <span slot="suffix">Plain text</span>
          <ui-button id="send" slot="action" type="submit">Send</ui-button>
        </ui-input-group>
      </form>
      <ui-textarea id="standalone" aria-label="Standalone"></ui-textarea>
    `, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    await page.addStyleTag({ content: "* { transition: none !important; }" });
    const group = page.locator("#multiline"), textarea = page.getByRole("textbox", { name: "Message" });
    assert.equal(await textarea.evaluate(element => getComputedStyle(element).borderTopWidth), "0px");
    assert.notEqual(await page.getByRole("textbox", { name: "Standalone" }).evaluate(element => getComputedStyle(element).borderTopWidth), "0px", "standalone textarea framing is unchanged");
    const frame = (await group.boundingBox())!, field = (await textarea.boundingBox())!, action = (await page.locator("#send").boundingBox())!;
    assert.ok(action.y >= field.y + field.height);
    assert.ok(action.x >= frame.x && action.x + action.width <= frame.x + frame.width);
    await group.locator(".action").click({ position: { x: 2, y: 2 } });
    assert.equal(await textarea.evaluate(element => element === document.activeElement), true);
    assert.match(await textarea.getAttribute("aria-describedby") ?? "", /affix/);
    const focusShadow = await group.evaluate(element => getComputedStyle(element).boxShadow);
    assert.notEqual(focusShadow, "none");
    await textarea.fill("First line\nSecond line");
    assert.equal(await page.locator("#form").evaluate(element => new FormData(element as HTMLFormElement).get("message")), "First line\nSecond line");
    await page.locator("#form").evaluate(element => {
      element.addEventListener("submit", event => { event.preventDefault(); element.setAttribute("data-submitted", "true"); });
    });
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect.poll(() => page.locator("#form").getAttribute("data-submitted")).toBe("true");
    await textarea.focus();
    await textarea.evaluate(element => element.setAttribute("aria-invalid", "true"));
    assert.notEqual(await group.evaluate(element => getComputedStyle(element).boxShadow), focusShadow);
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await group.evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    await page.emulateMedia({ forcedColors: "none" });
    await textarea.evaluate(element => { element.removeAttribute("aria-invalid"); (element as HTMLTextAreaElement).disabled = true; });
    assert.equal(await group.evaluate(element => getComputedStyle(element).cursor), "not-allowed");
    assert.equal(await page.locator("#form").evaluate(element => new FormData(element as HTMLFormElement).has("message")), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.close();
  });
});
