/**
 * Marks the top-level block holding the caret so a stylesheet can show where
 * editing is happening without drawing chrome inside the reading column.
 *
 * The decoration lands on the document's direct child, not on the textblock the
 * caret sits in: a marker that tracked the caret's own line would move on every
 * wrap and every arrow key, and one that tracked a nested list item would step
 * in and out of the list's inset. The outermost block is the stable answer to
 * "where am I", which is the question the marker exists to answer.
 *
 * The marker is a cue for finding your place, so it stays out of the way while
 * the place is obvious: it is absent while text is being typed and returns once
 * typing pauses, and a focus change that stays within the editor (the toolbar,
 * a menu) or that returns at once does not blink it off.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Class applied to the decorated block; `looma-editor.css` owns its appearance. */
export const LOOMA_ACTIVE_BLOCK_CLASS = "looma-active-block";

/** How long typing must pause before the marker returns. */
export const LOOMA_ACTIVE_BLOCK_TYPING_IDLE_MS = 800;

/** How long focus may be away before the marker treats the editor as unfocused. */
export const LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS = 200;

interface ActiveBlockState {
  focused: boolean;
  typing: boolean;
}

/** Plugin state is the editor's focus and whether text is being typed. */
export const LoomaActiveBlockPluginKey = new PluginKey<ActiveBlockState>("loomaActiveBlock");

const blurTimers = new WeakMap<EditorView, ReturnType<typeof setTimeout>>();

function setActiveBlockState(view: EditorView, next: Partial<ActiveBlockState>) {
  view.dispatch(view.state.tr.setMeta(LoomaActiveBlockPluginKey, next));
}

function cancelPendingBlur(view: EditorView) {
  clearTimeout(blurTimers.get(view));
  blurTimers.delete(view);
}

/**
 * Decorates the outermost block containing the selection head while the editor
 * has focus and text is not being typed.
 *
 * @contract Adds `LOOMA_ACTIVE_BLOCK_CLASS` to at most one top-level block, and
 * nothing at all when the editor is unfocused, not editable, or being typed in.
 * The document is never modified.
 * @invariant Focus is tracked in plugin state rather than read from the editor,
 * so the decoration recomputes on focus and blur even when neither changes the
 * selection. A blur only takes effect once focus has stayed away for
 * `LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS`, and never when focus moved to an element
 * inside the editor's own root.
 * @ownership The consuming stylesheet owns every visual property; this extension
 * owns only which block carries the class, and when.
 */
export const LoomaActiveBlock = Extension.create({
  name: "loomaActiveBlock",

  addProseMirrorPlugins() {
    return [
      new Plugin<ActiveBlockState>({
        key: LoomaActiveBlockPluginKey,

        state: {
          init: () => ({ focused: false, typing: false }),
          apply: (transaction, previous) => {
            const meta = transaction.getMeta(LoomaActiveBlockPluginKey) as Partial<ActiveBlockState> | undefined;
            const next = { ...previous, ...meta };
            // Any edit counts as typing; the view below clears it once edits pause.
            if (transaction.docChanged && meta?.typing === undefined) next.typing = true;
            return next.focused === previous.focused && next.typing === previous.typing ? previous : next;
          },
        },

        view: () => {
          let idleTimer: ReturnType<typeof setTimeout> | undefined;
          return {
            update: (view, previousState) => {
              if (!LoomaActiveBlockPluginKey.getState(view.state)?.typing) {
                clearTimeout(idleTimer);
                return;
              }
              // Each edit restarts the pause; other transactions leave it running.
              if (view.state.doc.eq(previousState.doc)) return;
              clearTimeout(idleTimer);
              idleTimer = setTimeout(() => setActiveBlockState(view, { typing: false }), LOOMA_ACTIVE_BLOCK_TYPING_IDLE_MS);
            },
            destroy: () => clearTimeout(idleTimer),
          };
        },

        props: {
          // Focus and blur do not necessarily change the selection, so without an
          // explicit transaction ProseMirror has no reason to recompute decorations.
          handleDOMEvents: {
            focus: (view) => {
              cancelPendingBlur(view);
              if (!LoomaActiveBlockPluginKey.getState(view.state)?.focused) setActiveBlockState(view, { focused: true });
              return false;
            },
            blur: (view, event) => {
              const destination = (event as FocusEvent).relatedTarget;
              const root = view.dom.closest(".looma-editor") ?? view.dom.parentElement;
              // Focus moving to the editor's own toolbar or menus is still editing.
              if (destination instanceof Node && root?.contains(destination)) return false;
              cancelPendingBlur(view);
              blurTimers.set(view, setTimeout(() => {
                blurTimers.delete(view);
                if (!view.isDestroyed && !view.hasFocus()) setActiveBlockState(view, { focused: false });
              }, LOOMA_ACTIVE_BLOCK_BLUR_GRACE_MS));
              return false;
            },
          },

          decorations: (state) => {
            const active = LoomaActiveBlockPluginKey.getState(state);
            if (!active?.focused || active.typing) {
              return null;
            }
            const { $head } = state.selection;
            // depth 0 is the document itself: a selection there has no block to mark.
            if ($head.depth === 0) {
              return null;
            }
            const from = $head.before(1);
            const block = state.doc.nodeAt(from);
            if (!block) {
              return null;
            }
            return DecorationSet.create(state.doc, [
              Decoration.node(from, from + block.nodeSize, {
                class: LOOMA_ACTIVE_BLOCK_CLASS,
              }),
            ]);
          },
        },
      }),
    ];
  },
});
