import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Form Field error visibility", () => {
  it("shows and describes an authored error only while invalid in HTML", async () => {
    const path = await bundle("html-form-field-error", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-form-field id="valid"><label slot="label">Name</label><ui-input aria-label="Name"></ui-input><small slot="help">A short name.</small><small slot="error" id="valid-error">Required.</small></ui-form-field>
      <ui-form-field id="invalid" invalid><label slot="label">Email</label><ui-input aria-label="Email"></ui-input><small slot="error" id="invalid-error">Enter an email.</small></ui-form-field>
    `, [join(root, "tokens.css")]);
    const valid = page.locator("#valid");
    const invalid = page.locator("#invalid");
    assert.equal(await valid.locator(".error").evaluate((element) => getComputedStyle(element).display), "none");
    assert.ok(!(await valid.locator("input").getAttribute("aria-describedby"))?.includes("valid-error"));
    assert.equal(await invalid.locator(".error").evaluate((element) => getComputedStyle(element).display), "contents");
    assert.ok((await invalid.locator("input").getAttribute("aria-describedby"))?.includes("invalid-error"));
    await page.close();
  });
});
