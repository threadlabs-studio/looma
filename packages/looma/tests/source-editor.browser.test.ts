import { page, userEvent } from "@vitest/browser/context";
import { afterEach, expect, it } from "vitest";
import { createApp, h, ref, type App } from "vue";
import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import { UiEditor } from "../src/components/ui-editor/ui-editor.html";
import { UiCompactEditor } from "../src/components/ui-compact-editor/ui-compact-editor.html";
import { UiCompactContent } from "../src/components/ui-compact-content/ui-compact-content.html";
import "../tokens.css";
import "../theme-light.css";

let app: App;
afterEach(() => { app?.unmount(); document.body.replaceChildren(); });
const empty = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });

for (const [name, Component] of [["document", UiEditor], ["compact", UiCompactEditor]] as const) {
  it(`edits and round-trips controlled ${name} content through the HTML Next Vite plugin`, async () => {
    let editor: Editor | undefined;
    const created: Editor[] = [];
    const model = ref(empty());
    const host = document.body.appendChild(document.createElement("div"));
    const capture = Extension.create({ name: "consumerEditor", onCreate() { editor = this.editor; created.push(this.editor); } });
    app = createApp({ render: () => h(Component, {
      content: model.value, label: "Writing",
      ...(name === "document" ? { toolbarMode: "sticky", codeLanguages: () => ({}) } : { id: "source-message" }),
      extensions: () => [capture],
      onChange: (event: CustomEvent<{ content: JSONContent }>) => { model.value = event.detail.content; },
    }) });
    app.mount(host);
    const field = page.getByRole("textbox", { name: "Writing" });
    await expect.element(field).toBeVisible();
    await expect.poll(() => editor).toBeDefined();
    await field.click();
    await userEvent.keyboard("**A proper component**");
    await expect.poll(() => model.value.content?.[0]?.content?.[0]?.marks?.[0]?.type).toBe("bold");
    expect(editor!.getHTML()).toContain("<strong>A proper component</strong>");
    await userEvent.keyboard("{Escape}");
    expect(editor!.getText()).toBe("**A proper component**");
    model.value = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Updated by the host" }] }] };
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(created).toHaveLength(1);
    await expect.element(field).toHaveTextContent("Updated by the host");
    if (name === "document") await expect.element(page.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
    const destination = document.body.appendChild(document.createElement("div"));
    const root = host.firstElementChild!;
    const undo = editor!.can().undo();
    destination.append(root);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    expect(created).toHaveLength(1);
    expect(editor!.isDestroyed).toBe(false);
    expect(editor!.can().undo()).toBe(undo);
    if (name === "compact") {
      const focus = destination.appendChild(document.createElement("button"));
      focus.textContent = "Continue writing";
      focus.setAttribute("commandfor", "source-message");
      focus.setAttribute("command", "--focus-end");
      await page.getByRole("button", { name: "Continue writing", exact: true }).click();
      await userEvent.keyboard("!");
      await expect.element(field).toHaveTextContent("Updated by the host!");
    }
    app.unmount();
    await expect.poll(() => editor!.isDestroyed).toBe(true);
  });
}

it("renders compact JSON as escaped semantic HTML through the source component", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  app = createApp({ render: () => h(UiCompactContent, { content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>literal</script>", marks: [{ type: "bold" }, { type: "italic" }] }, { type: "hardBreak" }, { type: "text", text: "Next line" }] }] } }) });
  app.mount(host);
  await expect.poll(() => host.querySelector("strong")?.textContent).toBe("<script>literal</script>");
  expect(host.querySelector("em strong")).not.toBeNull();
  expect(host.querySelector("script")).toBeNull();
  expect(host.querySelector("br")).not.toBeNull();
});
