import { expect } from "../renderers/test-context";
import { fixtureURL } from "../renderers/fixture";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, browser, bundle, open, look } from "../renderers/browser-driver";

describe("Shared block vocabulary", () => {
  it("draws every callout tone with its own icon and an optional heading in HTML and converted", async () => {
    const tones = ["note", "tip", "info", "important", "warning", "danger", "caution", "success"];
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-callout-vocabulary`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCallout as Callout } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", {}, [
          ...${JSON.stringify(tones)}.map(tone => sceneNode(Callout, { id: tone, tone }, () => tone + " message")),
          sceneNode(Callout, { id: "titled", tone: "tip", heading: "Before you start" }, () => "Body"),
        ]) }).mount("#app");
      `);
      const body = adapter === "html" ? tones.map(tone => `<ui-callout id="${tone}" tone="${tone}">${tone} message</ui-callout>`).join("")
        + `<ui-callout id="titled" tone="tip" heading="Before you start">Body</ui-callout>` : "";
      const page = await open(path, `<div id="app">${body}</div>`, [join(root, "tokens.css")]);
      const look = (id: string) => page.locator(`#${id}`).evaluate(element => ({
        icon: element.querySelector(".icon svg")?.innerHTML ?? "",
        surface: getComputedStyle(element).backgroundColor,
      }));
      const looks = Object.fromEntries(await Promise.all(tones.map(async tone => [tone, await look(tone)])));
      for (const tone of tones) assert.ok(looks[tone].icon, `${adapter}/${tone}: draws an icon`);
      assert.deepEqual(looks.caution, looks.danger, `${adapter}: caution is an alias of danger`);
      const distinct = ["note", "tip", "info", "important", "warning", "danger", "success"];
      assert.equal(new Set(distinct.map(tone => looks[tone].icon)).size, distinct.length, `${adapter}: each tone has its own icon`);
      assert.equal(looks.tip.surface, looks.info.surface, `${adapter}: advice shares the information palette`);
      const surfaceTones = distinct.filter(tone => tone !== "tip");
      assert.equal(new Set(surfaceTones.map(tone => looks[tone].surface)).size, surfaceTones.length, `${adapter}: other semantic families retain distinct surfaces`);
      await expect.poll(() => page.locator("#titled .heading").textContent()).toBe("Before you start");
      await expect.poll(() => page.locator("#info .heading").count(), { message: "no heading element without a heading" }).toBe(0);
      await page.close();
    }
  });

  it("syncs authored tab values across different labels and preserves a missing choice", async () => {
    const path = await bundle("html-tabs-values", `import "@looma-test/runtime";`);
    const markup = (id: string, labels: string[], values: string[], initial = "") => `<ui-tabs id="${id}" group="language" value="${initial}">${labels.map((label, index) => `<section id="${id}-${index}" aria-label="${label}" data-value="${values[index]}">${label}</section>`).join("")}</ui-tabs>`;
    const page = await open(path, markup("one", ["JavaScript", "TypeScript"], ["js", "ts"], "ts") + markup("two", ["JavaScript example", "Typed example"], ["js", "ts"]) + markup("other", ["Python", "Ruby"], ["py", "rb"]), [join(root, "tokens.css")]);
    await expect.poll(() => page.locator("#one-1").isVisible(), { message: "initial value selects an authored data-value" }).toBe(true);
    await page.locator("#one").getByRole("tab", { name: "TypeScript", exact: true }).click();
    await expect.poll(() => page.locator("#two-1").isVisible(), { message: "stable values synchronize labels with different wording" }).toBe(true);
    await expect.poll(() => page.locator("#other-0").isVisible(), { message: "a group without the selected value keeps its current panel" }).toBe(true);
    await page.evaluate(() => {
      for (const id of ["unlabelled-one", "unlabelled-two"]) {
        const tabs = document.createElement("ui-tabs");
        tabs.id = id;
        tabs.setAttribute("group", "unlabelled");
        tabs.innerHTML = `<section id="${id}-first">First</section><section id="${id}-second">Second</section>`;
        document.body.append(tabs);
      }
    });
    await page.locator("#unlabelled-one").getByRole("tab", { name: "Tab 2", exact: true }).click();
    await expect.poll(() => page.locator("#unlabelled-two-second").isVisible(), { message: "unlabelled panels retain their generated-label group fallback" }).toBe(true);
    await page.close();
  });

  it("syncs grouped tabs by label across the page and remembers the choice", async () => {
    const path = await bundle("html-tabs-group", `
      import "@looma-test/runtime";
      window.selections = [];
      document.addEventListener("select", (event) => window.selections.push([event.target.id, event.detail.value, event.detail.trigger]));
    `);
    const markup = (id: string, group: string) => `
      <ui-tabs id="${id}" label="${id}" group="${group}">
        <section id="${id}-pnpm" aria-label="pnpm">pnpm</section>
        <section id="${id}-npm" aria-label="npm">npm</section>
      </ui-tabs>`;
    const fixture = new URL(await fixtureURL(path));
    const html = `<!doctype html><html><body>${markup("install", "pm")}${markup("run", "pm")}${markup("other", "")}<script type="module" src="http://looma.test${fixture.pathname}"></script></body></html>`;
    const context = await browser.newContext();
    await context.route("http://looma.test/**", async route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/") return route.fulfill({ body: html, contentType: "text/html" });
      const response = await route.fetch({ url: fixture.origin + url.pathname + url.search });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto("http://looma.test/");
    await page.waitForTimeout(50);
    await page.locator("#install").getByRole("tab", { name: "npm", exact: true }).click();
    await expect.poll(() => page.locator("#run").getByRole("tab", { name: "npm", exact: true }).getAttribute("aria-selected"), { message: "a grouped peer selects the same label" }).toBe("true");
    await expect.poll(() => page.locator("#run-npm").isVisible()).toBe(true);
    await expect.poll(() => page.locator("#other").getByRole("tab", { name: "pnpm", exact: true }).getAttribute("aria-selected"), { message: "ungrouped tabs keep their own selection" }).toBe("true");
    assert.deepEqual(await page.evaluate(() => (window as any).selections), [["install", "install-npm", "pointer"], ["run", "run-npm", "programmatic"]]);
    await page.reload();
    await page.waitForTimeout(50);
    for (const id of ["install", "run"]) await expect.poll(() => page.locator(`#${id}-npm`).isVisible(), { message: `${id} restores the remembered choice` }).toBe(true);
    await expect.poll(() => page.locator("#other-pnpm").isVisible()).toBe(true);
    await context.unrouteAll({ behavior: "wait" });
    await context.close();
  });
});
