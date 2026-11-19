import { Extension } from "@tiptap/core";
import { DOMParser } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

export const LoomaDOMReadback = Extension.create({
  name: "loomaDOMReadback",
  addProseMirrorPlugins() {
    const { schema, rules } = DOMParser.fromSchema(this.editor.schema);
    const parser = new DOMParser(schema, rules);
    const parse = parser.parse.bind(parser);
    // Keep soft newlines as text during DOM readback. Explicit br nodes still
    // parse as hard breaks, and clipboard parsing uses the unchanged parseSlice.
    parser.parse = (node, options) => parse(node, options?.preserveWhitespace === true
      ? { ...options, preserveWhitespace: "full" }
      : options);
    return [new Plugin({ props: { domParser: parser } })];
  },
});
