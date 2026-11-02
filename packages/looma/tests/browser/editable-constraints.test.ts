import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Editable constraints", () => {
  it("keeps invalid drafts open and uses authored action labels in HTML", async () => {
    const path = await bundle("html-editable-constraints", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-editable id="name" value="Old" label="Name" actions required max-length="4" save-label="Apply" cancel-label="Discard" placeholder="Name"></ui-editable>`, [join(root, "tokens.css")]);
    const editable = page.locator("#name");
    await editable.locator(".preview").click();
    const input = editable.locator("input");
    await expect.poll(() => input.getAttribute("placeholder")).toBe("Name");
    await expect.poll(() => input.getAttribute("maxlength")).toBe("4");
    await input.fill("");
    await editable.getByRole("button", { name: "Apply" }).click();
    assert.equal(await input.evaluate((element) => getComputedStyle(element).visibility), "visible");
    await expect.poll(() => editable.locator(".text").textContent()).toBe("Old");
    await input.evaluate((element) => {
      (element as HTMLInputElement).value = "Valid";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await editable.getByRole("button", { name: "Apply" }).click();
    await expect.poll(() => editable.locator(".text").textContent(), { message: "overlong text does not commit" }).toBe("Old");
    await input.fill("New");
    await editable.getByRole("button", { name: "Apply" }).click();
    await expect.poll(() => editable.locator(".text").textContent()).toBe("New");
    await page.close();
  });
});
