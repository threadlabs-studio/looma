import { userEvent } from "@vitest/browser/context";
import type { Editor, JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, h, nextTick, ref, type App } from "vue";
import {
  LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS,
  LOOMA_ACTIVE_BLOCK_CLASS,
  LOOMA_ACTIVE_BLOCK_TYPING_IDLE_MS,
} from "../src/editor/extensions/active-block";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import "../tokens.css";
import "../vue/components.css";

const apps: App[] = [];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function flushBrowser() {
  for (let index = 0; index < 4; index += 1) {
    await nextTick();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

async function mountEditor() {
  const modelValue = ref<JSONContent>({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "First" }] },
      { type: "paragraph", content: [{ type: "text", text: "Second" }] },
    ],
  });
  const host = document.createElement("div");
  document.body.append(host);
  let editor: Editor | null = null;
  const app = createApp({
    render: () => h(LoomaEditor, {
      modelValue: modelValue.value,
      "onUpdate:modelValue": (value: JSONContent) => { modelValue.value = value; },
      onReady: (instance: Editor) => { editor = instance; },
    }),
  });
  apps.push(app);
  app.mount(host);
  await flushBrowser();
  return { editor: editor!, host };
}

const marked = (host: HTMLElement) => host.querySelectorAll(`.${LOOMA_ACTIVE_BLOCK_CLASS}`).length;

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.innerHTML = "";
});

describe("active block marker", () => {
  it("marks the block being edited, and steps aside while text is typed", async () => {
    const { editor, host } = await mountEditor();
    editor.commands.focus("end");
    await flushBrowser();
    expect(marked(host)).toBe(1);

    await userEvent.keyboard("abc");
    await flushBrowser();
    expect(marked(host)).toBe(0);

    await wait(LOOMA_ACTIVE_BLOCK_TYPING_IDLE_MS + 150);
    await flushBrowser();
    expect(marked(host)).toBe(1);
  });

  it("stays while focus visits the editor's own controls or leaves only briefly", async () => {
    const { editor, host } = await mountEditor();
    editor.commands.focus("end");
    await flushBrowser();
    expect(marked(host)).toBe(1);

    // A control inside the editor root, the way the toolbar and menus are.
    const control = document.createElement("button");
    control.textContent = "Bold";
    host.querySelector(".looma-editor")!.append(control);
    control.focus();
    await wait(LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS + 100);
    await flushBrowser();
    expect(marked(host)).toBe(1);

    // Focus that leaves and comes straight back does not blink the marker.
    const outside = document.createElement("button");
    document.body.append(outside);
    editor.commands.focus();
    outside.focus();
    editor.commands.focus();
    await wait(LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS + 100);
    await flushBrowser();
    expect(marked(host)).toBe(1);

    // Focus that really leaves removes it.
    outside.focus();
    await wait(LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS + 100);
    await flushBrowser();
    expect(marked(host)).toBe(0);
  });

  it("fades in rather than snapping on, as a thin, light line", async () => {
    const { editor, host } = await mountEditor();
    editor.commands.focus("end");
    await flushBrowser();
    const block = host.querySelector(`.${LOOMA_ACTIVE_BLOCK_CLASS}`)!;
    const marker = getComputedStyle(block, "::before");
    expect(marker.animationName).toBe("looma-active-block-in");
    expect(marker.width).toBe("1px");
  });
});
