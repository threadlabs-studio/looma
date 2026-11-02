import assert from "node:assert/strict";

import { describe, it } from "vitest";

import { bundle, open } from "../renderers/browser-driver";

describe("Input with files", () => {
  for (const mode of ["HTML", "Converted"] as const) {
    it(`keeps ${mode} file selection and its native change event through prop updates`, async () => {
      const path = await bundle(`file-input-${mode.toLowerCase()}`, mode === "HTML" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiInput as Input } from "@looma-test/components";
        const disabled = createState(false);
        window.setFileDisabled = (value) => { disabled.value = value; };
        createScene({ render: () => sceneNode(Input, { id: "upload", type: "file", name: "upload", disabled: disabled.value }) }).mount("#app");
      `);
      const page = await open(path, mode === "HTML"
        ? '<form><ui-input id="upload" type="file" name="upload"></ui-input></form>'
        : '<form><div id="app"></div></form>', []);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.evaluate(() => {
          const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
          input.addEventListener("change", (event) => {
            (window as unknown as { selectedFile: string }).selectedFile = (event.target as HTMLInputElement).files?.[0]?.name ?? "";
          });
        });
        const input = page.locator("input[type=file]");
        await input.setInputFiles({ name: "records.csv", mimeType: "text/csv", buffer: Buffer.from("name\nAda\n") });
        assert.equal(await page.evaluate(() => (window as unknown as { selectedFile: string }).selectedFile), "records.csv");
        for (const disabled of [true, false]) {
          await page.evaluate(({ mode, disabled }) => {
            if (mode === "HTML") document.querySelector("#upload")!.toggleAttribute("disabled", disabled);
            else (window as unknown as { setFileDisabled(value: boolean): void }).setFileDisabled(disabled);
          }, { mode, disabled });
          await page.waitForFunction((disabled) => document.querySelector<HTMLInputElement>("input[type=file]")!.disabled === disabled, disabled);
          assert.equal(await input.evaluate((element) => (element as HTMLInputElement).files?.[0]?.name), "records.csv");
        }
        assert.equal(await page.evaluate(() => (new FormData(document.querySelector("form")!).get("upload") as File).name), "records.csv");
        await input.evaluate((element) => { (element as HTMLInputElement).value = ""; });
        assert.equal(await input.evaluate((element) => (element as HTMLInputElement).files?.length), 0);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
});
