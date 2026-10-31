import { Extension, type Editor } from "@tiptap/core";

/** Observe the real Tiptap lifecycle through the public extensions request. */
export function captureEditor(created: (editor: Editor) => void) {
  return () => [Extension.create({ name: "consumerEditorCapture", onCreate() { created(this.editor); } })];
}
