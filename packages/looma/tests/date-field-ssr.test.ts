import { expect } from "./renderers/test-context";
import { JSDOM } from "jsdom";
import { initialFieldValue } from "../src/components/shared/initial-field-value.js";
import { createHydratedScene, sceneNode } from "@looma-test/scene";
import { renderSceneToString } from "@looma-test/scene";
import { describe, it } from "vitest";
import { UiDateField as DateField } from "@looma-test/components";
import { UiTimeField as TimeField } from "@looma-test/components";

describe("Date Field before upgrade", () => {
  it("renders an editable native date field and submits one canonical entry without JavaScript", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode(DateField, { name: "due", value: "2026-10-30", locale: "en-GB", label: "Due date" })]) }));
    const { window } = new JSDOM(html);
    const input = window.document.querySelector<HTMLInputElement>("[data-date-fallback]")!;
    expect(input.type).toBe("date"); expect(input.disabled).toBe(false);
    expect(input.value).toBe("2026-10-30");
    expect(window.document.querySelector<HTMLInputElement>("[data-date-editor]")!.hidden).toBe(true);
    input.value = "2026-11-01";
    expect([...new window.FormData(window.document.querySelector("form")!)].map(([key, value]) => [key, String(value)])).toEqual([["due", "2026-11-01"]]);
  });
  it("keeps an exact timestamp intact in its text fallback and omits disabled fields", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [
      sceneNode(DateField, { type: "instant", name: "meeting", value: "2026-10-30T18:30:00Z", timeZone: "America/New_York" }),
      sceneNode(DateField, { name: "disabled", value: "2026-10-30", disabled: true }),
    ]) }));
    const { window } = new JSDOM(html);
    expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([["meeting", "2026-10-30T18:30:00Z"]]);
  });
  it("keeps Time Field's native value and label association before JavaScript", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [sceneNode("label", { for: "opening" }, "Opening time"), sceneNode(TimeField, { inputId: "opening", name: "opening", value: "09:30" })]) }));
    const { window } = new JSDOM(html);
    const input = window.document.querySelector<HTMLInputElement>("input#opening")!;
    expect(input.type).toBe("time"); expect(input.labels?.[0]?.textContent).toBe("Opening time");
    expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([["opening", "09:30"]]);
  });
  it("associates the fallback with an explicitly named external form", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("div", [sceneNode("form", { id: "external" }), sceneNode(DateField, { form: "external", name: "due", value: "2026-10-30" })]) }));
    const { window } = new JSDOM(html);
    expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([["due", "2026-10-30"]]);
  });
  it("preserves sub-millisecond times and local date-time serialization before JavaScript", async () => {
    const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode("form", [
      sceneNode(TimeField, { name: "precise", value: "14:30:45.123456789" }),
      sceneNode(DateField, { type: "datetime-local", name: "local", value: "2026-10-30T14:30:45.123456789" }),
      sceneNode(DateField, { type: "datetime-local", name: "space", valueFormat: "space", value: "2026-10-30 14:30" }),
    ]) }));
    const { window } = new JSDOM(html);
    const fields = [...window.document.querySelectorAll<HTMLInputElement>("[data-date-fallback]")];
    expect(fields.map(field => field.type)).toEqual(["text", "text", "text"]);
    expect([...new window.FormData(window.document.querySelector("form")!)]).toEqual([
      ["precise", "14:30:45.123456789"], ["local", "2026-10-30T14:30:45.123456789"], ["space", "2026-10-30 14:30"],
    ]);
    fields[0]!.value = "16:45:59.987654321";
    expect(new window.FormData(window.document.querySelector("form")!).get("precise")).toBe("16:45:59.987654321");
  });
});
it("distinguishes a user-cleared native date from a sanitized invalid external value", () => {
  for (const value of ["not-a-date", "2026-10-30T12:00:00Z"]) {
    const document = new JSDOM('<section><input data-date-fallback type="date"><input data-date-editor hidden><input data-date-value type="hidden"></section>').window.document;
    const field = document.querySelector("section")!;
    const fallback = field.querySelector<HTMLInputElement>("[data-date-fallback]")!;
    field.querySelector<HTMLInputElement>("[data-date-value]")!.value = value;
    fallback.defaultValue = value;
    expect(fallback.value).toBe("");
    expect(initialFieldValue(field, { type: "date" })).toBeUndefined();
    field.querySelector<HTMLInputElement>("[data-date-value]")!.value = "2026-10-30";
    fallback.defaultValue = "2026-10-30"; fallback.value = "";
    expect(initialFieldValue(field, { type: "date" })).toBe("");
  }
});
