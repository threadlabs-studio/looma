import type { Editor, JSONContent } from "@tiptap/core";
import { page } from "@vitest/browser/context";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import "../vue/components.css";
import "../tokens.css";
import "../theme-light.css";

const apps: App[] = [];
afterEach(() => {
  apps.splice(0).forEach((app) => app.unmount());
  document.body.innerHTML = "";
});

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

const tasks: JSONContent = {
  type: "doc",
  content: [{
    type: "taskList",
    content: [
      { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Read the changelog" }] }] },
      { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] },
    ],
  }],
};

async function mountEditor() {
  const host = document.body.appendChild(document.createElement("div"));
  let editor: Editor | null = null;
  const app = createApp({ render: () => h(LoomaEditor, { modelValue: tasks, onReady: (instance: Editor) => { editor = instance; } }) });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  return { editor: editor!, host };
}

async function violations(root: Element) {
  const results = await axe.run(root, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] } });
  return results.violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.html).join(" ")}`);
}

describe("LoomaEditor task items", () => {
  it("names each checkbox by its item's text as the reader edits, and in saved HTML", async () => {
    const { editor, host } = await mountEditor();
    await expect.element(page.getByRole("checkbox", { name: "Read the changelog", exact: true })).toBeInTheDocument();
    await expect.element(page.getByRole("checkbox", { name: "Task", exact: true })).toBeInTheDocument();
    expect(await violations(host.querySelector('ul[data-type="taskList"]')!)).toEqual([]);

    // The name follows the text: the checkbox points at the item's own content.
    editor.commands.insertContentAt(editor.state.doc.content.size - 3, "Run the migration");
    await flushBrowser();
    await expect.element(page.getByRole("checkbox", { name: "Run the migration", exact: true })).toBeInTheDocument();

    const saved = document.body.appendChild(document.createElement("main"));
    saved.innerHTML = editor.getHTML();
    expect([...saved.querySelectorAll("input[type=checkbox]")].map((box) => box.getAttribute("aria-label")))
      .toEqual(["Read the changelog", "Run the migration"]);
    expect(await violations(saved)).toEqual([]);
    // Saved HTML reads back as the same tasks.
    editor.commands.setContent(saved.innerHTML);
    expect(editor.getJSON().content?.[0]).toEqual(expect.objectContaining({ type: "taskList" }));
    expect(editor.state.doc.textContent).toBe("Read the changelogRun the migration");
  });
});
