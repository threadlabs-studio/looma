import { page, userEvent } from "@vitest/browser/context";
import { afterEach, expect, it } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import type { Editor, JSONContent } from "@tiptap/core";
import { LoomaCompactEditor, LoomaCompactContent } from "../vue/editor/compact/index.js";
import { LoomaEditor } from "../vue/editor/index.js";
import "../tokens.css";
import "../theme-light.css";
import "../vue/components.css";
let app: App;
afterEach(() => { app?.unmount(); document.body.innerHTML = ""; });

it.each(["compact", "document"])("%s editing cancels Markdown with Escape and isolates conversion in undo history", async (kind) => {
  let editor!: Editor;
  const host = document.createElement("div"); document.body.append(host);
  const model = ref<JSONContent>({ type: "doc", content: [{ type: "paragraph" }] });
  const props = { label: "Writing", modelValue: model.value, onReady: (value: Editor) => { editor = value; },
    "onUpdate:modelValue": (value: JSONContent) => { model.value = value; } };
  app = createApp({ render: () => kind === "compact" ? h(LoomaCompactEditor, { ...props, modelValue: model.value }) : h(LoomaEditor, { ...props, modelValue: model.value, toolbarMode: "sticky" }) });
  app.mount(host); await nextTick(); await nextTick();
  const field = page.getByRole("textbox", { name: "Writing" });
  await field.click();
  const mod = /Mac|iP(hone|[oa]d)/.test(navigator.platform) ? "Meta" : "Control";
  for (const [source, tag] of [["**bold**", "strong"], ["*italic*", "em"], ["`code`", "code"]]) {
    await field.fill(""); await userEvent.keyboard(source);
    expect(editor.view.dom.querySelector(tag)).not.toBeNull();
    await userEvent.keyboard("{Escape}");
    expect(editor.getText()).toBe(source);
    expect(editor.view.dom.querySelector(tag)).toBeNull();
    const literal = editor.getHTML(); await userEvent.keyboard("{Escape}");
    expect(editor.getHTML()).toBe(literal);

    await field.fill(""); await userEvent.keyboard(source);
    await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
    expect(editor.getText()).toBe(source);
    expect(editor.view.dom.querySelector(tag)).toBeNull();
    await userEvent.keyboard(`{${mod}>}{Shift>}z{/Shift}{/${mod}}`);
    expect(editor.view.dom.querySelector(tag)).not.toBeNull();
    await userEvent.keyboard("!"); await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
    expect(editor.view.dom.querySelector(tag)).not.toBeNull();
    expect(editor.getText()).not.toContain("!");
    await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
    expect(editor.getText()).toBe(source);
    expect(editor.view.dom.querySelector(tag)).toBeNull();
  }
  await field.fill(""); await userEvent.keyboard("**keep**!"); await userEvent.keyboard("{Escape}");
  expect(editor.getHTML()).toContain("<strong>keep</strong>");
  await field.fill(""); await userEvent.keyboard("**stay**");
  const end = editor.state.selection.from;
  await userEvent.keyboard("{ArrowLeft}");
  await expect.poll(() => editor.state.selection.from).toBeLessThan(end);
  await userEvent.keyboard("{Escape}");
  expect(editor.getHTML()).toContain("<strong>stay</strong>");
  if (kind === "document") {
    editor.commands.setContent("<p></p>"); await field.click(); await userEvent.keyboard("**toolbar**");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    expect(editor.getHTML()).toBe("<p>**toolbar**</p>");
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    expect(editor.getHTML()).toBe("<p><strong>toolbar</strong></p>");
    for (const [source, tag] of [["# ", "h1"], ["- ", "ul"], ["```", "pre"]]) {
      editor.commands.setContent("<p></p>"); await field.click(); await userEvent.keyboard(source);
      expect(editor.view.dom.querySelector(tag)).not.toBeNull();
      await userEvent.keyboard("{Escape}");
      expect(editor.getText()).toBe(source);
      expect(editor.view.dom.querySelector(tag)).toBeNull();
    }
    editor.commands.setContent("<p></p>"); await field.click(); await userEvent.keyboard("/heading");
    await expect.element(page.getByRole("option", { name: /Heading 1/i })).toBeVisible();
    const content = editor.getHTML(); await userEvent.keyboard("{Escape}");
    await expect.element(page.getByRole("option", { name: /Heading 1/i })).not.toBeInTheDocument();
    expect(editor.getHTML()).toBe(content);
  }
});

it("formats short text through native shortcuts and Markdown without document controls", async () => {
  await page.viewport(375, 650);
  const model = ref<JSONContent>({ type: "doc", content: [{ type: "paragraph" }] });
  const id = ref("message");
  let editor!: Editor;
  const host = document.createElement("div"); document.body.append(host);
  app = createApp({ render: () => h("div", [h(LoomaCompactEditor, { id: id.value, label: "Comment", modelValue: model.value,
    "onUpdate:modelValue": value => { model.value = value; }, onReady: value => { editor = value; } }), h(LoomaCompactContent, { content: model.value })]) });
  app.mount(host);
  const initialHeight = host.querySelector(".looma-compact-editor")!.getBoundingClientRect().height;
  await nextTick(); await nextTick();
  expect(host.querySelector(".looma-compact-editor")!.getBoundingClientRect().height).toBe(initialHeight);
  const field = page.getByRole("textbox", { name: "Comment" });
  await field.click();
  const mod = navigator.userAgent.includes("Mac OS X") ? "Meta" : "Control";
  await userEvent.keyboard(`{${mod}>}b{/${mod}}Bold{${mod}>}b{/${mod}} {${mod}>}i{/${mod}}italic{${mod}>}i{/${mod}} `);
  await userEvent.keyboard("`run()` ");
  await expect.element(field).toHaveTextContent("Bold italic run()");
  expect(editor.getHTML()).toContain("<strong>Bold</strong>");
  expect(editor.getHTML()).toContain("<em>italic</em>");
  expect(editor.getHTML()).toContain("<code>run()</code>");
  await userEvent.keyboard("**typed** ");
  expect(editor.getHTML()).toContain("<strong>typed</strong>");
  const before = JSON.stringify(model.value);
  await userEvent.keyboard(`{${mod}>}z{/${mod}}`);
  expect(JSON.stringify(model.value)).not.toBe(before);
  await userEvent.keyboard(`{${mod}>}{Shift>}z{/Shift}{/${mod}}`);
  expect(JSON.stringify(model.value)).toBe(before);
  expect(host.querySelector('[role="toolbar"]')).toBeNull();
  expect(host.scrollWidth).toBeLessThanOrEqual(375);
  model.value = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Restored", marks: [{ type: "bold" }] }] }] };
  await nextTick(); await expect.element(field).toHaveTextContent("Restored");
  expect(host.querySelector(".looma-compact-content strong")?.textContent).toBe("Restored");
  id.value = "next-message"; await nextTick();
  expect(host.querySelector('[role="textbox"]')?.id).toBe("next-message");
});
