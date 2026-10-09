import type { Editor } from "@tiptap/core";
import { userEvent } from "@vitest/browser/context";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, type App } from "vue";
import { LoomaEditor } from "../src/vue/editor/LoomaEditor";
import "../tokens.css";
import "../theme-light.css";
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
  document.body.innerHTML = "";
  await flushBrowser();
});

describe("LoomaEditor inline chips (real browser)", () => {
  it("places the chip editor below a chip near the top of a narrow page", async () => {
    const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 375 });
    try {
      const host = document.createElement("div");
      host.style.width = "min(480px, 100%)";
      host.style.marginTop = "240px";
      document.body.append(host);
      let editor: Editor | null = null;
      const app = createApp({
        render: () => h(LoomaEditor, { onReady: (instance: Editor) => { editor = instance; } }),
      });
      apps.push(app);
      app.mount(host);
      await flushBrowser();

      editor!.chain().focus().insertContent("Article /chip").run();
      await flushBrowser();
      const chipOption = () => [...(host.querySelectorAll<HTMLElement>(':is([data-component~="ui-editor-slash-menu"], .ui-editor-slash-menu) [role="option"]'))]
        .find((item) => item.textContent?.includes("Chip"));
      await vi.waitFor(() => expect(chipOption()).toBeTruthy(), { timeout: 3000 });
      await userEvent.click(chipOption()!);
      await flushBrowser();

      const chip = host.querySelector<HTMLElement>(".ProseMirror [data-looma-chip]");
      const popover = document.querySelector<HTMLElement>(".looma-editor__chip-popover");
      expect(chip).toBeTruthy();
      expect(popover?.dataset.uiActualPlacement).toBe("bottom");
      expect(popover!.getBoundingClientRect().top).toBeGreaterThanOrEqual(chip!.getBoundingClientRect().bottom);
    } finally {
      if (originalWidth) Object.defineProperty(window, "innerWidth", originalWidth);
    }
  });

  it("creates and edits a colored inline chip through its focused popover", async () => {
    const host = document.createElement("div");
    host.style.width = "min(480px, 100%)";
    document.body.append(host);
    let editor: Editor | null = null;
    const app = createApp({
      render: () => h(LoomaEditor, {
        onReady: (instance: Editor) => { editor = instance; },
      }),
    });
    apps.push(app);
    app.mount(host);
    await flushBrowser();

    editor!.chain().focus().insertContent("Article /chip").run();
    await flushBrowser();
    const menu = host.querySelector<HTMLElement>(':is([data-component~="ui-editor-slash-menu"], .ui-editor-slash-menu)');
    expect(menu?.textContent).toContain("Chip");
    const item = [...(menu?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
      .find((option) => option.textContent?.includes("Chip"));
    expect(item).toBeTruthy();
    await userEvent.click(item!);
    await flushBrowser();
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Chip text"]');
    expect(input).toBeTruthy();
    expect(document.activeElement).toBe(input);
    await userEvent.type(input!, "90% confidence");
    const blue = document.querySelector<HTMLButtonElement>('button[aria-label="Blue chip"]');
    expect(blue).toBeTruthy();
    await userEvent.click(blue!);
    await flushBrowser();

    expect(editor!.getJSON().content?.[0]?.content?.[1]).toEqual({
      type: "loomaChip", attrs: { label: "90% confidence", color: "blue" },
    });
    const chip = host.querySelector<HTMLElement>(".ProseMirror [data-looma-chip]");
    expect(chip?.textContent).toBe("90% confidence");
    expect(chip?.isContentEditable).toBe(false);
    expect(chip?.getAttribute("role")).toBe("button");
    expect(getComputedStyle(chip!).borderRadius).not.toBe("0px");
    expect(getComputedStyle(chip!).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(getComputedStyle(chip!).borderTopColor).not.toBe(getComputedStyle(chip!).backgroundColor);
    await userEvent.keyboard("{Escape}");
    await userEvent.click(chip!);
    await flushBrowser();
    expect(document.activeElement).toBe(input);
    expect(input?.value).toBe("90% confidence");
    expect(blue?.getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  });
});
