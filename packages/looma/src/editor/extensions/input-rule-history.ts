import { Extension } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { Plugin } from "@tiptap/pm/state";

/**
 * Keep the literal trigger in typing history before converting it. Tiptap's
 * usual input rule consumes the final character, so simply closing history
 * would restore an incomplete Markdown delimiter on Undo.
 * @invariant Conversion and subsequent typing are separate history events.
 * @lifecycle Tiptap clears its undoable input rule on typing or caret movement.
 */
export const LoomaInputRuleHistory = Extension.create({
  name: "loomaInputRuleHistory",
  // Suggestion menus and consumer keymaps get Escape before cancellation.
  priority: 50,
  onBeforeCreate() {
    const props = this.editor.options.editorProps;
    this.editor.setOptions({
      editorProps: {
        ...props,
        handleTextInput(view, from, to, text, defaultTransaction) {
          if (props.handleTextInput?.call(props, view, from, to, text, defaultTransaction)) return true;
          if (view.composing) return false;
          const rules = view.state.plugins.find(plugin => plugin.spec.isInputRules);
          if (!rules?.props.handleTextInput) return false;
          view.dispatch((defaultTransaction?.() ?? view.state.tr.insertText(text, from, to)).scrollIntoView());
          const position = view.state.selection.from;
          rules.props.handleTextInput.call(rules, view, position, position, "", defaultTransaction);
          return true;
        },
      },
    });
  },
  addKeyboardShortcuts() {
    return { Escape: () => this.editor.commands.undoInputRule() };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      filterTransaction(tr, state) {
        if (state.plugins.some(plugin => plugin.spec.isInputRules && tr.getMeta(plugin))) closeHistory(tr);
        return true;
      },
      appendTransaction(transactions, _old, state) {
        if (transactions.some(tr => state.plugins.some(plugin => plugin.spec.isInputRules && tr.getMeta(plugin)))) {
          return closeHistory(state.tr);
        }
        return null;
      },
    })];
  },
});
