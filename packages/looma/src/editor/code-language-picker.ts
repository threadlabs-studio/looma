import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";

/** The code block the selection lies in: its position, saved language (`auto` when none), text, and element. */
export interface LoomaCodeBlockAtSelection {
  readonly pos: number;
  readonly language: string;
  readonly text: string;
  readonly element: HTMLElement;
}

/** The code block holding the whole selection, or null when the selection is elsewhere or spans blocks. */
export function codeBlockAtSelection(editor: Editor): LoomaCodeBlockAtSelection | null {
  const { $from, $to } = editor.state.selection;
  const block = $from.parent;
  if (block.type.name !== "codeBlock" || !$from.sameParent($to)) return null;
  const pos = $from.before();
  const element = editor.view.nodeDOM(pos);
  if (!(element instanceof HTMLElement)) return null;
  const language = typeof block.attrs.language === "string" && block.attrs.language ? block.attrs.language : "auto";
  return { pos, language, text: block.textContent, element };
}

/**
 * The picker's choices: Auto, naming the detected language when there is one; a saved language the
 * catalog lacks, marked unavailable, so it stays selected; then every catalog language.
 */
export function codeLanguageChoices(language: string, detected: string | null, names: readonly string[]): Array<{ value: string; label: string }> {
  return [
    { value: "auto", label: detected ? `Auto (${detected.toUpperCase()})` : "Auto" },
    ...(language !== "auto" && !names.includes(language) ? [{ value: language, label: `${language.toUpperCase()} (unavailable)` }] : []),
    ...names.map((name) => ({ value: name, label: name.toUpperCase() })),
  ];
}

/** Space, in pixels, the picker needs above a code block; with less it sits below. */
const ROOM_ABOVE = 76;

/** Centers the picker over the code block, above it when there is room and below it otherwise. */
export function codeLanguagePickerPlacement(block: DOMRect): { top: string; left: string; transform: string } {
  const above = block.top > ROOM_ABOVE;
  return {
    top: `${above ? block.top - 8 : block.bottom + 8}px`,
    left: `${block.left + block.width / 2}px`,
    transform: `translate(-50%, ${above ? "-100%" : "0"})`,
  };
}

/**
 * Saves `value` as the language of the code block at `pos`, as its own undo step; `auto` clears it.
 * @failure Returns false, and changes nothing, for a language outside `names` or no code block at `pos`.
 */
export function setCodeBlockLanguage(editor: Editor, pos: number, value: string, names: readonly string[]): boolean {
  const language = value === "auto" ? null : value;
  if (language !== null && !names.includes(language)) return false;
  const node = editor.state.doc.nodeAt(pos);
  if (node?.type.name !== "codeBlock") return false;
  editor.view.dispatch(closeHistory(editor.state.tr));
  editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, language }));
  editor.view.dispatch(closeHistory(editor.state.tr));
  return true;
}
