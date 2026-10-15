// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDefaultEditorExtensions } from "../src/editor/extensions";
import { createFormattingSelection, type LoomaFormattingSelectionOptions } from "../src/editor/formatting-selection";

const editors: Editor[] = [];
afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  vi.useRealTimers();
});

function setup(overrides: Partial<LoomaFormattingSelectionOptions> = {}) {
  const element = document.body.appendChild(document.createElement("div"));
  const editor = new Editor({ element, extensions: getDefaultEditorExtensions(), content: "<p>Hello world</p>" });
  editors.push(editor);
  vi.spyOn(editor, "isFocused", "get").mockReturnValue(true);
  const onHold = vi.fn();
  const formatting = createFormattingSelection({ editor, canHold: () => true, menuOpen: () => false, shownAtCaret: () => false, onHold, ...overrides });
  const text = editor.view.dom.querySelector("p")!;
  const press = (x = 10, time = 100) => ({ button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: 10, timeStamp: time, target: text }) as unknown as PointerEvent;
  return { editor, formatting, onHold, press };
}

describe("formatting selection", () => {
  it("shows the tools for a text selection, not a caret, and not a dismissed selection until the reader selects again", () => {
    const { editor, formatting } = setup();
    editor.commands.setTextSelection(3);
    expect(formatting.active()).toBe(false);
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(formatting.active()).toBe(true);
    formatting.dismiss();
    expect(formatting.active()).toBe(false);
    expect(formatting.dismissed(editor.state.selection)).toBe(true);
    formatting.selectionChanged();
    expect(formatting.active()).toBe(false);
    editor.commands.setTextSelection({ from: 1, to: 4 });
    formatting.selectionChanged();
    expect(formatting.active()).toBe(true);
  });

  it("opens the tools at a caret after a still press of half a second", () => {
    vi.useFakeTimers();
    const { editor, formatting, onHold, press } = setup();
    editor.commands.setTextSelection(3);
    formatting.press.down(press());
    vi.advanceTimersByTime(499);
    expect(onHold).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onHold).toHaveBeenCalledWith(editor.state.selection);
    expect(formatting.active()).toBe(true);
    formatting.release();
    expect(formatting.active()).toBe(false);
  });

  it("cancels the hold when the press moves, ends, or the viewport changes after it began", () => {
    vi.useFakeTimers();
    const { editor, formatting, onHold, press } = setup();
    editor.commands.setTextSelection(3);
    formatting.press.down(press(10));
    formatting.press.move(press(15));
    formatting.press.viewportChanged({ timeStamp: 50 } as Event);
    vi.advanceTimersByTime(500);
    expect(onHold).toHaveBeenCalledTimes(1);
    for (const interrupt of [() => formatting.press.move(press(30)), () => formatting.press.end(press()), () => formatting.press.viewportChanged({ timeStamp: 200 } as Event)]) {
      formatting.press.down(press());
      interrupt();
      vi.advanceTimersByTime(500);
    }
    expect(onHold).toHaveBeenCalledTimes(1);
  });

  it("holds only when allowed, and leaves an open slash or mention menu alone", () => {
    vi.useFakeTimers();
    let allowed = false;
    let menu = true;
    const { editor, formatting, onHold, press } = setup({ canHold: () => allowed, menuOpen: () => menu });
    editor.commands.setTextSelection(3);
    formatting.press.down(press());
    vi.advanceTimersByTime(500);
    allowed = true;
    formatting.press.down(press());
    vi.advanceTimersByTime(500);
    expect(onHold).not.toHaveBeenCalled();
    menu = false;
    formatting.press.down(press());
    vi.advanceTimersByTime(500);
    expect(onHold).toHaveBeenCalledTimes(1);
  });
});
