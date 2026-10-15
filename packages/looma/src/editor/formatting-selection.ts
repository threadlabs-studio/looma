import type { Editor } from "@tiptap/core";
import { AllSelection, TextSelection, type Selection } from "@tiptap/pm/state";

export interface LoomaFormattingSelectionOptions {
  editor: Editor;
  /** Whether a press held on the text may open the tools: floating tools, an editable document, no resize in progress. */
  canHold: () => boolean;
  /** Whether a slash or mention menu is open, which a completed hold leaves alone. */
  menuOpen: () => boolean;
  /** Whether something other than a selection, such as a range action at the caret, shows the tools. */
  shownAtCaret: () => boolean;
  /** Opens the tools at the caret a press was held on. */
  onHold: (selection: TextSelection) => void;
}

/**
 * Which selection the editor's floating formatting tools belong to: a text selection, a caret the
 * reader pressed and held, never one the reader dismissed with Escape.
 *
 * @ownership The host owns the tools' surface and the document listeners that feed `press`; this
 * owns the dismissed and held selections and the hold gesture's timer.
 * @lifecycle `destroy()` cancels a pending hold.
 */
export interface LoomaFormattingSelection {
  /** Whether the current selection shows the tools. */
  active(): boolean;
  /** Whether `selection` is the one the reader dismissed. */
  dismissed(selection: Selection): boolean;
  /**
   * Hides the tools for the current selection, or for `selection`, until the reader selects again.
   * Without an argument only a text or whole-document selection is remembered.
   */
  dismiss(selection?: Selection | null): void;
  /** Forgets a dismissal, as when the reader clicks a link. */
  undismiss(): void;
  /** Forgets a held caret. */
  release(): void;
  /** Forgets a dismissed or held selection that no longer matches the editor's. */
  selectionChanged(): void;
  /** Feeds the hold gesture: a still press for half a second on the text opens the tools at its caret. */
  readonly press: {
    down(event: PointerEvent): void;
    move(event: PointerEvent): void;
    end(event: PointerEvent): void;
    cancel(): void;
    /** A viewport change after the press began cancels it; the shared pass may report one from before. */
    viewportChanged(event?: Event): void;
  };
  destroy(): void;
}

const HOLD_MS = 500;
const HOLD_SLOP_PX = 8;

export function createFormattingSelection(options: LoomaFormattingSelectionOptions): LoomaFormattingSelection {
  const { editor } = options;
  let dismissedSelection: Selection | null = null;
  let heldSelection: TextSelection | null = null;
  let held: { id: number; x: number; y: number; time: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    held = null;
  };

  return {
    active() {
      const selection = editor.state.selection;
      return (selection instanceof TextSelection || (selection instanceof AllSelection && Boolean(editor.state.doc.textContent)))
        && !dismissedSelection?.eq(selection)
        && (!selection.empty || Boolean(heldSelection?.eq(selection)) || options.shownAtCaret());
    },
    dismissed: (selection) => Boolean(dismissedSelection?.eq(selection)),
    dismiss(selection) {
      const current = editor.state.selection;
      dismissedSelection = selection !== undefined ? selection
        : current instanceof TextSelection || current instanceof AllSelection ? current : null;
      heldSelection = null;
    },
    undismiss() { dismissedSelection = null; },
    release() { heldSelection = null; },
    selectionChanged() {
      const selection = editor.state.selection;
      if (!dismissedSelection?.eq(selection)) dismissedSelection = null;
      if (!heldSelection?.eq(selection)) heldSelection = null;
    },
    press: {
      down(event) {
        cancel();
        if (!options.canHold() || editor.isDestroyed || event.button !== 0 || !event.isPrimary
          || !(event.target instanceof Element) || !editor.view.dom.contains(event.target)
          || event.target.closest("button, input, select, textarea, [data-looma-image-node]")) return;
        held = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
        timer = setTimeout(() => {
          timer = undefined;
          const selection = editor.state.selection;
          if (!held || !options.canHold() || !editor.isFocused || options.menuOpen() || !(selection instanceof TextSelection)) return;
          dismissedSelection = null;
          heldSelection = selection;
          options.onHold(selection);
        }, HOLD_MS);
      },
      move(event) {
        if (held?.id === event.pointerId && Math.hypot(event.clientX - held.x, event.clientY - held.y) > HOLD_SLOP_PX) cancel();
      },
      end(event) {
        if (held?.id === event.pointerId) cancel();
      },
      cancel,
      viewportChanged(event) {
        if (!event || !held || event.timeStamp >= held.time) cancel();
      },
    },
    destroy: cancel,
  };
}
