import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Checkbox and Switch name", () => {
  // Like a native checkbox: checked sends name=value, unchecked sends nothing.
  const check = async (page: Page) => {
    await page.locator("#alerts input").waitFor();
    const entries = () => page.locator("#form").evaluate((form) =>
      Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));
    assert.deepEqual(await entries(), [["terms", "on"]]);
    await page.locator("#news input").check();
    await page.locator("#alerts input").check();
    assert.deepEqual(await entries(), [["terms", "on"], ["news", "weekly"], ["alerts", "push"]]);
  };

  it("submits a checked box with its form in HTML", async () => {
    const path = await bundle("html-checkbox-name", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <form id="form">
        <ui-checkbox name="terms" checked>Terms</ui-checkbox>
        <ui-checkbox id="news" name="news" value="weekly">News</ui-checkbox>
        <ui-switch id="alerts" name="alerts" value="push">Alerts</ui-switch>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("submits a checked box with its form in converted output", async () => {
    const path = await bundle("converted-checkbox-name", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCheckbox as Checkbox, UiSwitch as Switch } from "@looma-test/components";
      createScene({
        render: () => sceneNode("form", { id: "form" }, [
          sceneNode(Checkbox, { name: "terms", checked: true }, () => "Terms"),
          sceneNode(Checkbox, { id: "news", name: "news", value: "weekly" }, () => "News"),
          sceneNode(Switch, { id: "alerts", name: "alerts", value: "push" }, () => "Alerts"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
