import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";
import { fixtureURL } from "../renderers/fixture";

describe("Link card", () => {
  for (const target of ["html", "converted"] as const) {
    it(`opens clickable destinations in the appropriate tab and preserves edit and removal (${target})`, async () => {
      const longHref = "https://example.com/" + "a-long-path/".repeat(20);
      const path = target === "html"
        ? await bundle("html-link-card", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            for (const card of document.querySelectorAll("#resolved, #unsafe")) {
              for (const name of ["edit", "remove"]) card.addEventListener(name, (event) => window.fixtureEvents.push([card.id, name, event.detail]));
            }
          `)
        : await bundle("converted-link-card", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiEditorLinkCard as EditorLinkCard } from "@looma-test/components";
            window.fixtureEvents = [];
            const record = (id, name) => (event) => window.fixtureEvents.push([id, name, event.detail]);
            createScene({ render: () => [
              sceneNode(EditorLinkCard, { id: "resolved", href: "https://example.com/guide", openHref: "https://example.com/guide", label: "Guide", detail: "Personal / Guides", targetLabel: "Page", onEdit: record("resolved", "edit"), onRemove: record("resolved", "remove") }),
              sceneNode(EditorLinkCard, { id: "address", href: ${JSON.stringify(longHref)}, openHref: ${JSON.stringify(longHref)} }),
              sceneNode(EditorLinkCard, { id: "local", href: "/guide", openHref: "/guide", label: "Local guide" }),
              sceneNode(EditorLinkCard, { id: "absolute", href: location.origin + "/guide", openHref: location.origin + "/guide", label: "Absolute guide" }),
              sceneNode(EditorLinkCard, { id: "sibling", href: "http://other.looma.test/guide", openHref: "http://other.looma.test/guide", label: "Other site" }),
              sceneNode(EditorLinkCard, { id: "unsafe", href: "ftp://files.example.com/archive", onEdit: record("unsafe", "edit"), onRemove: record("unsafe", "remove") }),
            ] }).mount("#app");
          `);
      const origin = new URL(await fixtureURL(path)).origin;
      const page = await open(path, target === "html"
        ? `<ui-editor-link-card id="resolved" href="https://example.com/guide" open-href="https://example.com/guide" label="Guide" detail="Personal / Guides" target-label="Page"></ui-editor-link-card>
           <ui-editor-link-card id="address" href="${longHref}" open-href="${longHref}"></ui-editor-link-card>
           <ui-editor-link-card id="local" href="/guide" open-href="/guide" label="Local guide"></ui-editor-link-card>
           <ui-editor-link-card id="absolute" href="${origin}/guide" open-href="${origin}/guide" label="Absolute guide"></ui-editor-link-card>
           <ui-editor-link-card id="sibling" href="http://other.looma.test/guide" open-href="http://other.looma.test/guide" label="Other site"></ui-editor-link-card>
           <ui-editor-link-card id="unsafe" href="ftp://files.example.com/archive"></ui-editor-link-card>`
        : `<div id="app"></div>`, [join(root, "tokens.css")], {}, async page => {
          await page.context().route(/^https?:\/\/(looma\.test|other\.looma\.test|example\.com)\//, route => route.fulfill({ contentType: "text/html", body: "<h1>Destination</h1>" }));
          await page.route(origin + "/editor", route => route.fulfill({ contentType: "text/html", body: "" }));
          await page.route(origin + "/guide", route => route.fulfill({ contentType: "text/html", body: "<h1>Local guide</h1>" }));
          await page.goto(origin + "/editor");
        });
      const events = () => page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents);
      const resolved = page.locator("#resolved").getByRole("group", { name: "Link actions", exact: true });
      const unsafe = page.locator("#unsafe").getByRole("group", { name: "Link actions", exact: true });
      await resolved.waitFor();
      assert.equal((await resolved.getByLabel("Page: Guide").innerText()).replace(/\s+/g, " ").trim(), "Guide Personal / Guides");
      await expect.poll(() => resolved.getByRole("link", { name: "Open link", exact: true }).getAttribute("href")).toBe("https://example.com/guide");
      await expect.poll(() => unsafe.getByLabel("URL: ftp://files.example.com/archive").count()).toBe(1);
      await expect.poll(() => unsafe.getByRole("link", { name: "Open link" }).count(), { message: "no open-href, no Open link" }).toBe(0);
      const destination = resolved.getByRole("link", { name: "Page: Guide", exact: true });
      await expect.poll(() => destination.getAttribute("href")).toBe("https://example.com/guide");
      await expect.poll(() => destination.getAttribute("target")).toBe("_blank");
      await expect.poll(() => destination.getAttribute("rel")).toContain("noopener");
      await expect.poll(() => unsafe.getByRole("link").count()).toBe(0);
      await resolved.getByRole("button", { name: "Edit link", exact: true }).click();
      await unsafe.getByRole("button", { name: "Remove link", exact: true }).click();
      assert.deepEqual(await events(), [["resolved", "edit", {}], ["unsafe", "remove", {}]]);
      for (const id of ["local", "absolute"]) {
        const links = page.locator(`#${id}`).getByRole("link");
        assert.equal(await links.count(), 2);
        for (const link of await links.all()) await expect.poll(() => link.getAttribute("target")).toBe("_self");
      }
      for (const link of await page.locator("#sibling").getByRole("link").all()) {
        await expect.poll(() => link.getAttribute("target")).toBe("_blank");
      }
      const address = page.locator("#address").getByRole("link", { name: "URL: " + longHref, exact: true });
      assert.equal(await address.getAttribute("href"), longHref);
      await destination.focus();
      assert.equal(await destination.evaluate(el => el === el.ownerDocument.activeElement), true);
      const popupPromise = page.waitForEvent("popup");
      await destination.press("Enter");
      const popup = await popupPromise;
      await popup.waitForLoadState();
      assert.equal(popup.url(), "https://example.com/guide");
      await popup.close();
      await page.setViewportSize({ width: 375, height: 812 });
      if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(process.env.LOOMA_CAPTURE_ARTIFACTS, `link-card-${target}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator("#local").getByRole("link", { name: "Item: Local guide", exact: true }).click();
      await page.waitForURL(origin + "/guide");
      await page.close();
    });
  }
});
