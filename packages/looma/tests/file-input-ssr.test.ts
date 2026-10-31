import { JSDOM } from "jsdom";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect, it } from "vitest";
import { UiFileInput as FileInput } from "@threadlabs/looma";

it("renders a named, labelled native file control with no JavaScript dependency for browsing or forms", async () => {
  const html = await renderToString(createSSRApp({ render: () => h("form", [h(FileInput, { inputId: "attachments", name: "attachments", label: "Attachments", multiple: true, accept: ".pdf", required: true })]) }));
  const { window } = new JSDOM(html);
  const input = window.document.querySelector<HTMLInputElement>("input#attachments")!;
  expect(input.type).toBe("file"); expect(input.multiple).toBe(true); expect(input.accept).toBe(".pdf");
  expect(input.required).toBe(true); expect(input.disabled).toBe(false); expect(input.hidden).toBe(false);
  expect(input.getAttribute("aria-label")).toBe("Attachments");
  const entries = [...new window.FormData(window.document.querySelector("form")!)];
  expect(entries).toHaveLength(1); expect(entries[0]![0]).toBe("attachments");
  expect((entries[0]![1] as File).name).toBe("");
});

it("omits disabled file controls and supports an external form association", async () => {
  const html = await renderToString(createSSRApp({ render: () => h("div", [h("form", { id: "external" }), h(FileInput, { form: "external", name: "file", disabled: true })]) }));
  const { window } = new JSDOM(html);
  expect(window.document.querySelector<HTMLInputElement>("input")!.form?.id).toBe("external");
  expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([]);
});
