import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import { componentRegistry, lowerDocument, RequestEvent } from "@nextwebwg/html-next/runtime";
import { page, userEvent } from "@vitest/browser/context";
import { afterAll, afterEach, expect, it } from "vitest";
import { stop } from "../dist/index.js";
import "../tokens.css";
import "../theme-light.css";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); document.body.replaceChildren(); });
afterAll(() => stop?.());

for (const tag of ["ui-editor", "ui-compact-editor"]) {
  it(`edits and replaces controlled content in native ${tag}`, async () => {
    let editor: Editor | undefined;
    const created: Editor[] = [];
    const capture = Extension.create({ name: "nativeConsumer", onCreate() { editor = this.editor; created.push(this.editor); } });
    const wrapper = document.body.appendChild(document.createElement("div"));
    cleanups.push(RequestEvent.respond(wrapper, "extensions", () => [capture]));
    const invocation = document.createElement(tag);
    invocation.setAttribute("label", "Native writing");
    if (tag === "ui-compact-editor") invocation.setAttribute("id", "native-message");
    if (tag === "ui-editor") invocation.setAttribute("toolbar-mode", "sticky");
    wrapper.append(invocation);
    lowerDocument(document, { props: new Map([[invocation, { content: { type: "doc", content: [{ type: "paragraph" }] } }]]) });
    const field = page.getByRole("textbox", { name: "Native writing" });
    await expect.element(field).toBeVisible();
    await expect.poll(() => editor).toBeDefined();
    if (tag === "ui-compact-editor") expect(wrapper.querySelectorAll("#native-message")).toHaveLength(1);
    const root = wrapper.querySelector<HTMLElement>(`[data-component~="${tag}"]`)!;
    const metadataWrites: string[] = [];
    const metadata = new MutationObserver(records => {
      for (const record of records) if (record.attributeName?.endsWith("-prop-content")) metadataWrites.push(record.attributeName);
    });
    metadata.observe(root, { attributes: true });
    let changed: JSONContent | undefined;
    wrapper.addEventListener("change", event => {
      if (event.target !== root) return;
      changed = (event as CustomEvent<{ content: JSONContent }>).detail?.content;
      if (changed) componentRegistry.update(root, { content: changed });
    });
    await field.click();
    await userEvent.keyboard("**Native HTML**");
    expect(editor!.getHTML()).toContain("<strong>Native HTML</strong>");
    expect(changed).toEqual(editor!.getJSON());
    componentRegistry.update(root, { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Replaced" }] }] } });
    await expect.element(field).toHaveTextContent("Replaced");
    if (tag === "ui-compact-editor") {
      const focus = wrapper.appendChild(document.createElement("button"));
      focus.textContent = "Continue writing";
      focus.setAttribute("commandfor", "native-message");
      focus.setAttribute("command", "--focus-end");
      await page.getByRole("button", { name: "Continue writing", exact: true }).click();
      await userEvent.keyboard("!");
      await expect.element(field).toHaveTextContent("Replaced!");
    }
    expect(created).toHaveLength(1);
    const destination = document.body.appendChild(document.createElement("div"));
    const undo = editor!.can().undo();
    destination.append(root);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(created).toHaveLength(1);
    expect(editor!.isDestroyed).toBe(false);
    expect(editor!.can().undo()).toBe(undo);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(metadataWrites).toEqual([]);
    metadata.disconnect();
    root.remove();
    await expect.poll(() => editor!.isDestroyed).toBe(true);
  });
}

it("renders standalone compact JSON as escaped native semantic HTML", async () => {
  const wrapper = document.body.appendChild(document.createElement("div"));
  const invocation = wrapper.appendChild(document.createElement("ui-compact-content"));
  const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>literal</script>", marks: [{ type: "bold" }, { type: "italic" }] }, { type: "hardBreak" }, { type: "text", text: "Next line" }] }] };
  lowerDocument(document, { props: new Map([[invocation, { content }]]) });
  await expect.poll(() => wrapper.querySelector("strong")?.textContent).toBe("<script>literal</script>");
  expect(wrapper.querySelector("em strong")).not.toBeNull();
  expect(wrapper.querySelector("script")).toBeNull();
  expect(wrapper.querySelector("br")).not.toBeNull();
});
