import type { AnyExtension, JSONContent } from "@tiptap/core";
import { createEditorSession } from "./session";
import { getCompactEditorExtensions } from "./compact-extensions";

/** Controlled JSON, native identity and editability for a short rich-text field. */
export interface CompactEditorProps { content: JSONContent; label: string; id: string; editable: boolean; }

/**
 * A short-field editor with no framework lifecycle or document-toolbar dependency.
 * @ownership The session owns Tiptap; the host owns its unbound mount and handles changed JSON.
 * @lifecycle `attach` moves the existing view and history; `destroy` releases it when the host is removed.
 * @contract Controlled echoes are ignored, and updates preserve the native textbox’s label, ID and read-only state.
 */
export function createCompactEditorSession(element: HTMLElement, props: CompactEditorProps, extensions: AnyExtension[], change: (content: JSONContent) => void) {
  const attributes = () => ({ role: "textbox", "aria-multiline": "true", "aria-label": props.label, "aria-readonly": String(!props.editable), id: props.id });
  const session = createEditorSession({
    element,
    extensions: [...getCompactEditorExtensions().filter(extension => !extensions.some(supplied => supplied.name === extension.name)), ...extensions],
    content: props.content,
    editable: props.editable,
    editorProps: { attributes: attributes() },
    onUpdate: ({ editor }) => change(editor.getJSON()),
  });
  return {
    editor: session.editor,
    attach: session.attach,
    update(next: CompactEditorProps) {
      Object.assign(props, next);
      session.setContent(next.content);
      session.editor.setOptions({ editable: next.editable, editorProps: { ...session.editor.options.editorProps, attributes: attributes() } });
    },
    focus(position: "start" | "end" = "start") { session.editor.commands.focus(position); },
    destroy: session.destroy,
  };
}

export { getCompactEditorExtensions } from "./compact-extensions";
