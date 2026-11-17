import { Extension } from "@tiptap/core";
import { DOMParser, type ParseOptions } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

class EditorDOMParser extends DOMParser {
  override parse(node: Node, options?: ParseOptions) {
    // ProseMirror otherwise treats every literal newline in the edited DOM
    // as a hard break. Keep soft newlines as text and parse explicit br nodes
    // as usual. Clipboard parsing uses parseSlice, which keeps its own policy.
    return super.parse(node, options?.preserveWhitespace === true ? { ...options, preserveWhitespace: "full" } : options);
  }
}

export const LoomaDOMReadback = Extension.create({
  name: "loomaDOMReadback",
  addProseMirrorPlugins() {
    const { schema, rules } = DOMParser.fromSchema(this.editor.schema);
    return [new Plugin({ props: { domParser: new EditorDOMParser(schema, rules) } })];
  },
});
