/**
 * Marks the top-level block holding the caret so a stylesheet can show where
 * editing is happening without drawing chrome inside the reading column.
 *
 * The decoration lands on the document's direct child, not on the textblock the
 * caret sits in: a marker that tracked the caret's own line would move on every
 * wrap and every arrow key, and one that tracked a nested list item would step
 * in and out of the list's inset. The outermost block is the stable answer to
 * "where am I", which is the question the marker exists to answer.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/** Class applied to the decorated block; `looma-editor.css` owns its appearance. */
export const LOOMA_ACTIVE_BLOCK_CLASS = "looma-active-block";

/** Plugin state is the editor's focus, so the marker is absent while reading. */
export const LoomaActiveBlockPluginKey = new PluginKey<boolean>("loomaActiveBlock");

/**
 * Decorates the outermost block containing the selection head while the editor
 * has focus.
 *
 * @contract Adds `LOOMA_ACTIVE_BLOCK_CLASS` to at most one top-level block, and
 * nothing at all when the editor is unfocused or not editable. The document is
 * never modified.
 * @invariant Focus is tracked in plugin state rather than read from the editor,
 * so the decoration recomputes on focus and blur even when neither changes the
 * selection.
 * @ownership The consuming stylesheet owns every visual property; this extension
 * owns only which block carries the class.
 */
export const LoomaActiveBlock = Extension.create({
  name: "loomaActiveBlock",

  addProseMirrorPlugins() {
    return [
      new Plugin<boolean>({
        key: LoomaActiveBlockPluginKey,

        state: {
          init: () => false,
          apply: (transaction, focused) => {
            const next = transaction.getMeta(LoomaActiveBlockPluginKey);
            return typeof next === "boolean" ? next : focused;
          },
        },

        props: {
          // Focus and blur do not necessarily change the selection, so without an
          // explicit transaction ProseMirror has no reason to recompute decorations.
          handleDOMEvents: {
            focus: (view) => {
              view.dispatch(view.state.tr.setMeta(LoomaActiveBlockPluginKey, true));
              return false;
            },
            blur: (view) => {
              view.dispatch(view.state.tr.setMeta(LoomaActiveBlockPluginKey, false));
              return false;
            },
          },

          decorations: (state) => {
            if (!LoomaActiveBlockPluginKey.getState(state)) {
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
