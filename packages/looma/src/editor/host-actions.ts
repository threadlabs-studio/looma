import type { EditorState } from "@tiptap/pm/state";
import { AllSelection, TextSelection } from "@tiptap/pm/state";

/** Host-owned non-mutating commands for the selected passage. */
export interface LoomaEditorSelectionAction { id: string; label: string; }
/** Host action available at a collapsed caret inside an ephemeral editor range. */
export interface LoomaEditorRangeAction extends LoomaEditorSelectionAction { from: number; to: number; }
/** Matching ranges are grouped into one control for each action ID. */
export interface LoomaEditorRangeActionDetail { id: string; ranges: { from: number; to: number }[]; }
/** Exact editor range captured before focus leaves for a host action. */
export interface LoomaEditorSelectionActionDetail { id: string; from: number; to: number; text: string; before: string; after: string; }

/** Characters of context on each side of a selected passage. */
const CONTEXT = 48;

/**
 * The range actions whose range holds the collapsed text caret.
 * @contract Ranges that are not whole numbers, are empty, or fall outside the document are ignored.
 */
export function rangeActionsAtCaret(state: EditorState, actions: readonly LoomaEditorRangeAction[]): LoomaEditorRangeAction[] {
  const selection = state.selection;
  if (!(selection instanceof TextSelection) || !selection.empty) return [];
  const size = state.doc.content.size;
  return actions.filter(({ from, to }) => Number.isSafeInteger(from) && Number.isSafeInteger(to)
    && from >= 0 && to > from && to <= size && from <= selection.from && selection.from <= to);
}

/** One control per action ID: its label and each distinct range it covers at the caret, in order. */
export function groupRangeActions(actions: readonly LoomaEditorRangeAction[]): Array<{ id: string; label: string; detail: LoomaEditorRangeActionDetail }> {
  const groups = new Map<string, { label: string; ranges: Map<string, { from: number; to: number }> }>();
  for (const { id, label, from, to } of actions) {
    const group = groups.get(id) ?? { label, ranges: new Map() };
    group.ranges.set(`${from}:${to}`, { from, to });
    groups.set(id, group);
  }
  return [...groups].map(([id, { label, ranges }]) => ({ id, label, detail: { id, ranges: [...ranges.values()] } }));
}

/** Whether the selection is a passage that selection actions apply to: nonempty text, or everything. */
export function selectsPassage(state: EditorState): boolean {
  const selection = state.selection;
  return !selection.empty && (selection instanceof TextSelection || selection instanceof AllSelection);
}

/**
 * A selection action's detail for the current passage: its range, its text, and up to 48 characters
 * of context on each side, captured before focus leaves the editor.
 * @failure Returns null when the selection is empty.
 */
export function selectionActionDetail(state: EditorState, id: string): LoomaEditorSelectionActionDetail | null {
  const { from, to } = state.selection;
  if (from === to) return null;
  const doc = state.doc;
  return {
    id, from, to,
    text: doc.textBetween(from, to, "\n"),
    before: doc.textBetween(Math.max(0, from - CONTEXT), from, "\n"),
    after: doc.textBetween(to, Math.min(doc.content.size, to + CONTEXT), "\n"),
  };
}
