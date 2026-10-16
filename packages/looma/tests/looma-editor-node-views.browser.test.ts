import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { updateComponentProps } from "@nextwebwg/html-next/runtime";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import "../tokens.css";
import "../vue/components.css";

const apps: App[] = [];

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

afterEach(async () => {
  for (const app of apps.splice(0)) app.unmount();
  await flushBrowser();
  document.body.innerHTML = "";
});

async function mountEditor(html: string) {
  const host = document.body.appendChild(document.createElement("div"));
  let editor: Editor | null = null;
  const app = createApp({ render: () => h(LoomaEditor, { onReady: (instance: Editor) => { editor = instance; } }) });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  editor!.commands.setContent(html);
  await flushBrowser();
  return { host, editor: editor! };
}

const state = (element: Element) => element.getAttribute("data-ui-separator-state") ?? "";

describe("LoomaEditor node views", () => {
  it("draws a divider with Separator, selects it on click, and disconnects it once the node is removed", async () => {
    const { host, editor } = await mountEditor("<p>Before</p><hr><p>After</p>");
    const divider = host.querySelector<HTMLElement>('.ProseMirror [data-component~="ui-separator"]')!;
    expect(divider.tagName).toBe("HR");
    expect(state(divider).split(" ")).toContain("selectable");
    expect(divider.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    await userEvent.click(divider);
    await vi.waitFor(() => expect(state(divider).split(" ")).toContain("selected"));
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);

    // While connected, a prop update renders at once; once ProseMirror removes the node, it waits.
    updateComponentProps(divider, { emphasis: "strong" });
    await vi.waitFor(() => expect(state(divider).split(" ")).toContain("emphasis=strong"));
    editor.commands.deleteSelection();
    await flushBrowser();
    expect(divider.isConnected).toBe(false);
    const before = state(divider);
    updateComponentProps(divider, { emphasis: "normal", selectable: false });
    await flushBrowser();
    expect(state(divider)).toBe(before);
  });

  it("leaves a read-only divider unselectable", async () => {
    const { host, editor } = await mountEditor("<p>Before</p><hr><p>After</p>");
    editor.setEditable(false);
    await flushBrowser();
    const divider = host.querySelector<HTMLElement>('.ProseMirror [data-component~="ui-separator"]')!;
    await vi.waitFor(() => expect(state(divider).split(" ")).not.toContain("selectable"));
  });
});
