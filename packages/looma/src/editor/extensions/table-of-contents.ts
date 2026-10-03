import { Extension, Node, type NodeViewRenderer } from "@tiptap/core";
import { DOMSerializer, type DOMOutputSpec, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, type EditorState } from "@tiptap/pm/state";

/** Formatting affects presentation only; heading order remains document order. */
export type LoomaTableOfContentsFormat = "plain" | "bulleted" | "numbered";

/** Persisted TOC choices; entries themselves are always derived from headings. */
export interface LoomaTableOfContentsConfig {
  format: LoomaTableOfContentsFormat;
  depth: 1 | 2 | 3;
}

/**
 * One current heading for navigation or host projections.
 * @lifecycle Positions belong to the supplied document; recompute after edits.
 * IDs stay with headings across renames and moves once a TOC assigns anchors.
 */
export interface LoomaTableOfContentsEntry {
  id: string;
  text: string;
  level: number;
  depth: number;
  position: number;
}

/** Normalize loaded configuration without persisting unsupported presentation values. */
export function normalizeTableOfContentsConfig(attributes: Record<string, unknown>): LoomaTableOfContentsConfig {
  return {
    format: attributes.format === "bulleted" || attributes.format === "numbered" ? attributes.format : "plain",
    depth: attributes.depth === 1 || attributes.depth === 2 ? attributes.depth : 3,
  };
}

/**
 * Derives nonempty headings throughout the document, independent of TOC placement.
 * @contract Depth is a maximum heading level. Relative nesting follows existing
 * ancestors rather than inserting artificial entries for skipped levels.
 */
export function getTableOfContentsEntries(doc: ProseMirrorNode, depth = 3): LoomaTableOfContentsEntry[] {
  const entries: LoomaTableOfContentsEntry[] = [];
  const ancestors: number[] = [];
  doc.descendants((node, position) => {
    if (node.type.name !== "heading" || node.attrs.level > depth || !node.textContent.trim()) return;
    const level = Number(node.attrs.level);
    while (ancestors.length && ancestors[ancestors.length - 1] >= level) ancestors.pop();
    entries.push({ id: String(node.attrs.id ?? ""), text: node.textContent.trim(), level, depth: ancestors.length, position });
    ancestors.push(level);
  });
  return entries;
}

interface Branch {
  entry: LoomaTableOfContentsEntry;
  children: Branch[];
}

/** Shared nesting for semantic HTML and the adapter's component composition. */
export function tableOfContentsTree(entries: LoomaTableOfContentsEntry[]): Branch[] {
  const roots: Branch[] = [];
  const parents: Branch[] = [];
  for (const entry of entries) {
    const branch: Branch = { entry, children: [] };
    parents.length = entry.depth;
    (parents[entry.depth - 1]?.children ?? roots).push(branch);
    parents.push(branch);
  }
  return roots;
}

function anchorTransaction(state: EditorState) {
  let hasToc = false;
  const headings: { node: ProseMirrorNode; position: number }[] = [];
  state.doc.descendants((node, position) => {
    if (node.type.name === "loomaTableOfContents") hasToc = true;
    if (node.type.name === "heading") headings.push({ node, position });
  });
  if (!hasToc) return null;
  const reserved = new Set(headings.map(({ node }) => String(node.attrs.id ?? "")).filter(Boolean));
  const used = new Set<string>();
  const transaction = state.tr;
  let sequence = 1;
  for (const { node, position } of headings) {
    let id = typeof node.attrs.id === "string" ? node.attrs.id : "";
    if (!id || /\s/.test(id) || used.has(id)) {
      do { id = `looma-heading-${sequence++}`; } while (reserved.has(id) || used.has(id));
      transaction.setNodeMarkup(position, undefined, { ...node.attrs, id });
    }
    used.add(id);
  }
  return transaction.docChanged ? transaction : null;
}

const LoomaHeadingAnchors = Extension.create({
  name: "loomaHeadingAnchors",
  addGlobalAttributes() {
    return [{ types: ["heading"], attributes: { id: { default: null } } }];
  },
  onCreate() {
    const transaction = anchorTransaction(this.editor.state);
    if (transaction) this.editor.view.dispatch(transaction.setMeta("addToHistory", false));
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction: (transactions, _oldState, state) => transactions.some(transaction => transaction.docChanged)
        ? anchorTransaction(state) : null,
    })];
  },
});

function contentsHtml(doc: ProseMirrorNode, config: LoomaTableOfContentsConfig): DOMOutputSpec {
  const branches = tableOfContentsTree(getTableOfContentsEntries(doc, config.depth));
  const list = (items: Branch[]): DOMOutputSpec => [
    config.format === "plain" ? "div" : config.format === "numbered" ? "ol" : "ul",
    { role: "list" },
    ...items.map(({ entry, children }): DOMOutputSpec => [
      config.format === "plain" ? "div" : "li", { role: "listitem" }, ["a", { href: `#${entry.id}` }, entry.text], ...(children.length ? [list(children)] : []),
    ]),
  ];
  return ["nav", { "data-looma-toc": "", "data-format": config.format, "data-depth": config.depth, "aria-label": "Table of contents" },
    ["strong", {}, "Table of contents"],
    branches.length ? list(branches) : ["p", {}, "Add headings to build your table of contents."],
  ];
}

/**
 * Scrolls within this editor so multiple documents cannot cross-navigate by ID.
 * @contract Reader navigation does not edit content or invoke link-editing UI.
 */
export function navigateTableOfContents(editor: import("@tiptap/core").Editor, id: string) {
  const target = [...editor.view.dom.querySelectorAll<HTMLElement>("h1[id], h2[id], h3[id]")].find(heading => heading.id === id);
  if (!target) return;
  target.scrollIntoView({ block: "start", behavior: "auto" });
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
}

interface TableOfContentsOptions {
  nodeView: NodeViewRenderer | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaTableOfContents: {
      /** Insert configuration; headings and links are derived from the document. */
      insertLoomaTableOfContents: (config?: Partial<LoomaTableOfContentsConfig>) => ReturnType;
    };
  }
}

/**
 * Automatic whole-document navigation with durable configuration only.
 * @ownership The schema owns configuration/anchors; node views derive entries.
 * @lifecycle Headless views subscribe to transactions and unsubscribe on destroy.
 */
export const LoomaTableOfContents = Node.create<TableOfContentsOptions>({
  name: "loomaTableOfContents",
  group: "block",
  atom: true,
  selectable: true,
  isolating: true,
  addOptions: () => ({ nodeView: null }),
  addExtensions: () => [LoomaHeadingAnchors],
  addAttributes() {
    return {
      format: { default: "plain", parseHTML: element => normalizeTableOfContentsConfig({ format: element.getAttribute("data-format") }).format, renderHTML: () => ({}) },
      depth: { default: 3, parseHTML: element => normalizeTableOfContentsConfig({ depth: Number(element.getAttribute("data-depth")) }).depth, renderHTML: () => ({}) },
    };
  },
  parseHTML: () => [{ tag: "nav[data-looma-toc]" }],
  renderHTML({ node }) {
    // Tiptap renders the initial DOM before assigning its EditorView. A schema-
    // only serializer has no document context; hosts can use the entry helper.
    return contentsHtml(this.editor?.view?.state.doc ?? node, normalizeTableOfContentsConfig(node.attrs));
  },
  addCommands() {
    return { insertLoomaTableOfContents: (config = {}) => ({ commands }) => commands.insertContent({
      type: this.name, attrs: normalizeTableOfContentsConfig(config),
    }) };
  },
  addNodeView() {
    if (this.options.nodeView) return this.options.nodeView;
    return ({ editor, node }) => {
      const dom = document.createElement("div");
      dom.contentEditable = "false";
      let current = node;
      const render = () => {
        const { dom: content } = DOMSerializer.renderSpec(document, contentsHtml(editor.state.doc, normalizeTableOfContentsConfig(current.attrs)));
        dom.replaceChildren(content);
      };
      dom.addEventListener("click", event => {
        const anchor = (event.target as Element).closest("a");
        if (!anchor) return;
        event.preventDefault();
        navigateTableOfContents(editor, anchor.getAttribute("href")!.slice(1));
      });
      editor.on("transaction", render);
      render();
      return {
        dom,
        update(next) { if (next.type !== current.type) return false; current = next; render(); return true; },
        stopEvent: () => true,
        ignoreMutation: () => true,
        destroy: () => { editor.off("transaction", render); },
      };
    };
  },
});
