import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";
import { componentRoot } from "../renderers/selectors";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open, look } from "../renderers/browser-driver";

describe("Button as a link", () => {
  for (const adapter of ["HTML", "Converted"]) {
    it(`switches Button roots when href changes in ${adapter}`, async () => {
      const path = await bundle(`button-href-${adapter}`, adapter === "HTML" ? `
        import "@looma-test/runtime";
        import { componentRegistry } from "@nextwebwg/html-next/runtime";
        window.setButtonProps = (props) => {
          for (const id of ["regular", "card"]) componentRegistry.update(document.getElementById(id), props);
        };
      ` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiButton as Button } from "@looma-test/components";
        const props = createState({});
        window.setButtonProps = (next) => { props.value = { ...props.value, ...next }; };
        createScene({ render: () => ["regular", "card"].map(id => sceneNode(Button, {
          id, variant: id === "card" ? "card" : "solid", ...props.value,
        }, () => "Guide")) }).mount("#app");
      `);
      const page = await open(path, adapter === "HTML" ? `
        <ui-button id="regular" variant="solid">Guide</ui-button>
        <ui-button id="card" variant="card">Guide</ui-button>
      ` : '<div id="app"></div>', [join(root, "tokens.css")]);
      try {
        for (const props of [
          { href: "/guide" }, { href: "" }, { loading: true },
          { loading: false, disabled: true }, { disabled: false }, { href: null },
        ]) {
          await page.evaluate(props => (window as unknown as { setButtonProps: (props: Record<string, unknown>) => void }).setButtonProps(props), props);
          const tag = props.href === null ? "button" : "a";
          await page.waitForSelector(`#regular:is(${tag})`);
          for (const id of ["regular", "card"]) {
            const control = page.locator(`#${id}`);
            assert.equal(await control.evaluate(element => element.localName), tag);
            if (tag === "button") {
              await expect.poll(() => control.getAttribute("type")).toBe("button");
              await expect.poll(() => control.getAttribute("href")).toBe(null);
            } else {
              await expect.poll(() => control.getAttribute("type")).toBe(null);
              await expect.poll(() => control.getAttribute("disabled")).toBe(null);
              await expect.poll(() => control.getAttribute("href")).toBe(props.loading || props.disabled ? null : props.href ?? "");
              if (props.loading) {
                await expect.poll(() => control.getAttribute("aria-busy")).toBe("true");
                await control.focus();
                assert.equal(await page.evaluate(() => document.activeElement?.id), id);
                assert.equal(await control.evaluate(element => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))), false);
              }
              if (props.disabled) await expect.poll(() => control.getAttribute("aria-disabled")).toBe("true");
            }
            assert.match(await control.textContent() ?? "", /Guide/);
          }
        }
      } finally {
        await page.close();
      }
    });
  }

  it("renders a real link that looks and responds exactly like the button", async () => {
    const variants = ["outline", "solid", "danger", "ghost", "link"];
    const path = await bundle("converted-button-link", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiButton as Button } from "@looma-test/components";
      const pair = (id, props) => [
        sceneNode(Button, { id: id + "-button", ...props }, () => "Go"),
        sceneNode(Button, { id: id + "-link", href: "#next", ...props }, () => "Go"),
      ];
      createScene({
        render: () => sceneNode("div", [
          ${JSON.stringify(variants)}.flatMap((variant) => pair(variant, { variant })),
          ...pair("large", { size: "lg", tone: "success" }),
          ...pair("off", { variant: "solid", disabled: true }),
          ...pair("off-ghost", { variant: "ghost", disabled: true }),
          sceneNode(Button, { id: "new-tab", href: "https://example.com/", target: "_blank", rel: "noreferrer" }, () => "Docs"),
          sceneNode(Button, { id: "submit", type: "submit" }, () => "Send"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    // End states, not the transition between them.
    await page.addStyleTag({ content: "* { transition: none !important; }" });

    const link = page.locator("#solid-link");
    assert.equal(await link.evaluate((element) => element.localName), "a");
    await expect.poll(() => link.getAttribute("href")).toBe("#next");
    assert.equal(await link.evaluate((element, selector) => element.matches(selector), componentRoot("ui-button")), true);
    for (const attribute of ["type", "disabled", "aria-disabled", "role"]) {
      await expect.poll(() => link.getAttribute(attribute), { message: `a link carries no ${attribute}` }).toBe(null);
    }
    await expect.poll(() => page.locator("#solid-button").getAttribute("type")).toBe("button");
    await expect.poll(() => page.locator("#submit").getAttribute("type")).toBe("submit");
    await expect.poll(() => page.locator("#new-tab").getAttribute("target")).toBe("_blank");
    await expect.poll(() => page.locator("#new-tab").getAttribute("rel")).toBe("noreferrer");

    for (const id of [...variants, "large"]) {
      assert.deepEqual(await look(page, `#${id}-link`), await look(page, `#${id}-button`), `${id} at rest`);
      if (id !== 'link') {
        const buttonBox = (await page.locator(`#${id}-button`).boundingBox())!;
        const linkBox = (await page.locator(`#${id}-link`).boundingBox())!;
        assert.ok(Math.abs(linkBox.height - buttonBox.height) < .6, `${id}: boxed link and button heights match`);
        assert.ok(Math.abs(linkBox.width - buttonBox.width) < .6, `${id}: boxed link and button widths match`);
      }
      await page.hover(`#${id}-button`);
      const hovered = await look(page, `#${id}-button`);
      await page.hover(`#${id}-link`);
      assert.deepEqual(await look(page, `#${id}-link`), hovered, `${id} hovered`);
    }
    assert.equal((await look(page, "#outline-link")).textDecorationLine, "none");
    assert.equal((await look(page, "#link-link")).textDecorationLine, "underline");

    // A disabled link cannot be followed or focused; it says so, and it looks like a disabled button.
    const off = page.locator("#off-link");
    await expect.poll(() => off.getAttribute("href")).toBe(null);
    await expect.poll(() => off.getAttribute("aria-disabled")).toBe("true");
    await expect.poll(() => off.getAttribute("disabled")).toBe(null);
    await expect.poll(() => page.locator("#off-button").getAttribute("aria-disabled")).toBe(null);
    for (const id of ["off", "off-ghost"]) {
      await page.hover(`#${id}-button`, { force: true });
      const disabled = await look(page, `#${id}-button`);
      await page.hover(`#${id}-link`);
      assert.deepEqual(await look(page, `#${id}-link`), disabled, `${id} disabled`);
    }

    await page.focus("#solid-button");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "solid-link");
    assert.equal(await link.evaluate((element) => element.matches(":focus-visible")), true);
    assert.match((await look(page, "#solid-link")).boxShadow, /,/, "the focus halo layers on the shadow");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash === "#next");
    await page.close();
  });

  it("lowers to a link from HTML", async () => {
    const path = await bundle("html-button-link", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-button id="button" variant="solid">Go</ui-button>
      <ui-button id="link" href="#next" variant="solid">Go</ui-button>
      <ui-button id="off" href="#next" variant="solid" disabled>Go</ui-button>
      <ui-button id="submit" type="submit">Send</ui-button>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#off:is([component~="ui-button"], [data-component~="ui-button"], .ui-button, [ui-button])');
    assert.equal(await page.locator("#link").evaluate((element) => element.localName), "a");
    await expect.poll(() => page.locator("#link").getAttribute("href")).toBe("#next");
    await expect.poll(() => page.locator("#link").getAttribute("type")).toBe(null);
    assert.deepEqual(await look(page, "#link"), await look(page, "#button"));
    await expect.poll(() => page.locator("#off").getAttribute("href")).toBe(null);
    await expect.poll(() => page.locator("#off").getAttribute("aria-disabled")).toBe("true");
    await expect.poll(() => page.locator("#button").getAttribute("type")).toBe("button");
    await expect.poll(() => page.locator("#submit").getAttribute("type")).toBe("submit");
    await page.close();
  });
});
