import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("converted form controls", () => {
  it("select the model's option, and style named slots without slot attributes", async () => {
    const path = await bundle("converted-form", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiFormField as FormField, UiSelect as Select } from "@looma-test/components";
      const topic = createState("help");
      window.topic = topic;
      createScene({
        render: () => sceneNode(FormField, null, {
          label: () => sceneNode("label", { id: "topic-label", for: "topic" }, "Topic"),
          default: () => sceneNode(Select, { id: "topic", value: topic.value, "bind:value": (value) => { topic.value = value; } }, () => [
            sceneNode("option", { value: "problem" }, "Problem"),
            sceneNode("option", { value: "help" }, "Help"),
            sceneNode("option", { value: "privacy" }, "Privacy"),
          ]),
          help: () => sceneNode("p", { id: "topic-help" }, "Pick one."),
        }),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const select = page.locator("#topic");
    await expect.poll(() => select.inputValue()).toBe("help");
    await page.evaluate(() => { (window as unknown as { topic: { value: string } }).topic.value = "privacy"; });
    await page.waitForFunction(() => (document.querySelector("#topic") as HTMLSelectElement).value === "privacy");
    await select.selectOption("problem");
    assert.equal(await page.evaluate(() => (window as unknown as { topic: { value: string } }).topic.value), "problem");

    const fontSize = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).fontSize);
    assert.equal(await fontSize("#topic-label"), "16px");
    assert.equal(await fontSize("#topic-help"), "14px");
    // A named slot in converted output has no slot attribute; the field still links its help to the control.
    await expect.poll(() => select.getAttribute("aria-describedby")).toBe("topic-help");
    await page.close();
  });
});
