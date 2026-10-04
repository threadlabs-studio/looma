import { Extension, getText, getTextSerializersFromSchema, Node, type Editor, type NodeViewRenderer } from "@tiptap/core";
import { DOMParser, Fragment } from "@tiptap/pm/model";

/** Saved presentation; a reader's temporary toggle never changes these values. */
export interface LoomaExpandAttributes {
  summary: string;
  open: boolean;
}

interface ExpandOptions { nodeView: NodeViewRenderer | null }

/**
 * Reveals collapsed ancestors before a host navigates to a document position.
 * @contract Navigation changes presentation only, including in read-only mode.
 */
export async function revealLoomaExpandAt(editor: Editor, position: number): Promise<void> {
  const { node } = editor.view.domAtPos(position);
  const target = node instanceof Element ? node : node.parentElement;
  const pending: Promise<void>[] = [];
  target?.dispatchEvent(new CustomEvent("looma-editor-reveal", { bubbles: true, detail: { pending } }));
  await Promise.all(pending);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaExpand: {
      /** Insert an independent section and place the caret in its body. */
      insertLoomaExpand: (attributes?: Partial<LoomaExpandAttributes>) => ReturnType;
      /** Leave an enclosing section by creating an ordinary paragraph after it. */
      exitLoomaExpand: () => ReturnType;
    };
  }
}

/**
 * A block container whose summary and initial expansion survive serialization.
 * @ownership The document owns attributes/body; node views own reader toggles.
 * @lifecycle Default views unregister their editor subscriptions on destroy.
 */
export const LoomaExpand = Node.create<ExpandOptions>({
  name: "loomaExpand",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addOptions: () => ({ nodeView: null }),
  addAttributes() {
    return {
      summary: { default: "Details", parseHTML: element => element.querySelector(":scope > summary")?.textContent ?? "Details", renderHTML: () => ({}) },
      open: { default: false, parseHTML: element => element.hasAttribute("open"), renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    return [{ tag: "details", getContent: (element, schema) => {
      if (!(element instanceof Element)) return Fragment.from(schema.nodes.paragraph.create());
      const body = element.ownerDocument.createElement("div");
      const authoredBody = element.querySelector(":scope > [data-looma-expand-body]");
      for (const child of (authoredBody ?? element).childNodes) {
        if (child instanceof Element && child.localName === "summary") continue;
        body.append(child.cloneNode(true));
      }
      const content = DOMParser.fromSchema(schema).parse(body).content;
      return content.size ? content : Fragment.from(schema.nodes.paragraph.create());
    } }];
  },
  renderHTML({ node }) {
    return ["details", { "data-looma-expand": "", ...(node.attrs.open ? { open: "" } : {}) },
      ["summary", {}, String(node.attrs.summary)], ["div", { "data-looma-expand-body": "" }, 0],
    ];
  },
  renderText({ node }) {
    return `${node.attrs.summary}\n${getText(node, { textSerializers: getTextSerializersFromSchema(node.type.schema) })}`;
  },
  addCommands() {
    return {
      insertLoomaExpand: (attributes = {}) => ({ chain, state, dispatch }) => {
        const from = state.selection.from;
        const content = { type: this.name, attrs: { summary: attributes.summary ?? "Details", open: attributes.open === true }, content: [{ type: "paragraph" }] };
        if (!dispatch) return chain().insertContent(content).run();
        return chain().insertContent(content).command(({ tr, commands }) => {
          let body = -1;
          tr.doc.descendants((node, position) => {
            if (node.type.name === this.name && position >= from - 1 && body < 0) body = position + 2;
          });
          return body >= 0 && commands.setTextSelection(body);
        }).run();
      },
      exitLoomaExpand: () => ({ state, chain }) => {
        const { $from } = state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name !== this.name) continue;
          const after = $from.after(depth);
          return chain().insertContentAt(after, { type: "paragraph" }).setTextSelection(after + 1).run();
        }
        return false;
      },
    };
  },
  addExtensions() {
    // Shortcut priority must not change the schema's default block from paragraph.
    return [Extension.create({
      name: "loomaExpandExit",
      priority: 110,
      addKeyboardShortcuts() { return { "Mod-Enter": () => this.editor.commands.exitLoomaExpand() }; },
    })];
  },
  addNodeView() {
    if (this.options.nodeView) return this.options.nodeView;
    return ({ editor, node }) => {
      const dom = document.createElement("details");
      dom.dataset.loomaExpand = "";
      const summary = document.createElement("summary");
      summary.contentEditable = "false";
      const contentDOM = document.createElement("div");
      contentDOM.dataset.loomaExpandBody = "";
      dom.append(summary, contentDOM);
      let current = node;
      let editable = editor.isEditable;
      dom.open = editable || Boolean(node.attrs.open);
      summary.textContent = node.attrs.summary;
      const reveal = () => { dom.open = true; };
      const refresh = () => {
        if (editable !== editor.isEditable) { editable = editor.isEditable; dom.open = editable || Boolean(current.attrs.open); }
      };
      dom.addEventListener("looma-editor-reveal", reveal);
      editor.on("update", refresh);
      return {
        dom, contentDOM,
        update(next) {
          if (next.type !== current.type) return false;
          if (next.attrs.open !== current.attrs.open) dom.open = editor.isEditable || Boolean(next.attrs.open);
          current = next; summary.textContent = next.attrs.summary; refresh(); return true;
        },
        stopEvent: event => summary.contains(event.target as globalThis.Node),
        ignoreMutation: mutation => mutation.type !== "selection" && !contentDOM.contains(mutation.target),
        destroy() { dom.removeEventListener("looma-editor-reveal", reveal); editor.off("update", refresh); },
      };
    };
  },
});
