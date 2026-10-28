import { InputRule, Node, PasteRule } from "@tiptap/core";
import { DOMSerializer, Fragment, Slice, type Node as ProseMirrorNode, type Schema } from "@tiptap/pm/model";
import { NodeSelection, Plugin, Selection, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";

// Footnote IDs as Looma Markdown writes them: `fn:label`, `fnref:label`, and `fnref:label:2` for
// a repeated reference.
const labelFrom = (href: string | null | undefined, prefix: string) => href?.startsWith(`#${prefix}`) ? href.slice(prefix.length + 1) : null;

/** A footnote label as Looma Markdown reads it in `[^label]`: no whitespace and no `]`. */
export const LOOMA_FOOTNOTE_LABEL = /^[^\s\]]+$/;

export const LOOMA_FOOTNOTE_INSERTED = "loomaFootnoteInserted";

const REFERENCE = "loomaFootnoteReference";
const NOTES = "loomaFootnotes";
const NOTE = "loomaFootnote";

const isLabel = (label: string) => LOOMA_FOOTNOTE_LABEL.test(label);

/** Every label a reference or note in `doc` uses. */
function usedLabels(doc: ProseMirrorNode): Set<string> {
  const labels = new Set<string>();
  doc.descendants(node => { if (node.type.name === REFERENCE || node.type.name === NOTE) labels.add(String(node.attrs.label)); });
  return labels;
}

/**
 * The first note for `label` in `doc` and its position.
 * @failure Returns null when no note has that label.
 */
export function findLoomaFootnote(doc: ProseMirrorNode, label: string): { node: ProseMirrorNode; position: number } | null {
  let found: { node: ProseMirrorNode; position: number } | null = null;
  doc.descendants((node, position) => {
    if (found) return false;
    if (node.type.name === NOTE && node.attrs.label === label) { found = { node, position }; return false; }
  });
  return found;
}

// Rebuilds `node` with each footnote reference inside it passed through `change`, in document order.
function mapReferences(node: ProseMirrorNode, change: (reference: ProseMirrorNode) => ProseMirrorNode): ProseMirrorNode {
  if (node.type.name === REFERENCE) return change(node);
  if (node.isLeaf) return node;
  const children: ProseMirrorNode[] = [];
  node.content.forEach(child => children.push(mapReferences(child, change)));
  return node.copy(Fragment.from(children));
}

// The note holding `position`, with the note's start, or null outside every note.
function noteAt(doc: ProseMirrorNode, position: number) {
  const $position = doc.resolve(position);
  for (let depth = $position.depth; depth > 0; depth--) {
    const node = $position.node(depth);
    if (node.type.name === NOTE) return { node, start: $position.before(depth) };
  }
  return null;
}

/**
 * Keeps footnotes on Looma Markdown's rule, so the saved HTML is the HTML Looma Markdown renders for
 * the same document. Notes are numbered by first reference, in the text and then in the notes, and
 * every reference carries its note's number and its place among that note's references. The notes
 * live in one `loomaFootnotes` section at the end of the document, in number order. A note no
 * reference points to leaves the document; a reference with no note gets one back, the note it last
 * had in this editor (so cutting a reference and pasting it keeps its note) or an empty one.
 * @invariant Changing nothing but text inside a note never rebuilds the section.
 */
function footnoteTransaction(state: EditorState, known: Map<string, ProseMirrorNode>): Transaction | null {
  const { doc, schema } = state;
  const sections: { node: ProseMirrorNode; position: number }[] = [];
  const notes = new Map<string, ProseMirrorNode>();
  const body: { node: ProseMirrorNode; position: number }[] = [];
  doc.descendants((node, position) => {
    if (node.type.name === NOTES) {
      sections.push({ node, position });
      // The first note for a label is its note, as with Markdown's definitions.
      node.forEach(note => { if (!notes.has(note.attrs.label)) notes.set(note.attrs.label, note); });
      return false;
    }
    if (node.type.name === REFERENCE) body.push({ node, position });
  });
  if (!sections.length && !body.length) return null;

  const order: string[] = [];
  const counts = new Map<string, number>();
  const numbered = (reference: ProseMirrorNode) => {
    const label = String(reference.attrs.label);
    if (!counts.has(label)) order.push(label);
    counts.set(label, (counts.get(label) ?? 0) + 1);
    const attrs = { ...reference.attrs, number: order.indexOf(label) + 1, occurrence: counts.get(label) };
    return attrs.number === reference.attrs.number && attrs.occurrence === reference.attrs.occurrence ? reference : reference.type.create(attrs, null, reference.marks);
  };
  const transaction = state.tr;
  for (const { node, position } of body) {
    const next = numbered(node);
    if (next !== node) transaction.setNodeMarkup(position, undefined, next.attrs);
  }
  // A note may refer to a later note, which then joins the list.
  const built: ProseMirrorNode[] = [];
  for (let index = 0; index < order.length; index++) {
    const label = order[index];
    const note = notes.get(label) ?? known.get(label) ?? schema.nodes[NOTE].create({ label }, schema.nodes.paragraph.create());
    built.push(mapReferences(note, numbered));
  }
  // Counts are final only once every note's references are numbered.
  const wanted = built.map(note => note.attrs.count === counts.get(note.attrs.label) ? note : note.type.create({ ...note.attrs, count: counts.get(note.attrs.label) }, note.content));
  for (const note of [...notes.values(), ...wanted]) known.set(note.attrs.label, note);

  const section = wanted.length ? schema.nodes[NOTES].create(null, wanted) : null;
  const last = doc.lastChild?.type.name === NOTES ? { node: doc.lastChild, position: doc.content.size - doc.lastChild.nodeSize } : null;
  if (!(section && last && sections.length === 1 && last.node.eq(section)) && (sections.length || section)) {
    // A selection inside a note follows the note to its new place.
    const { selection } = state;
    const inside = noteAt(doc, selection.from);
    const keep = inside && selection.to <= inside.start + inside.node.nodeSize ? { label: inside.node.attrs.label, start: inside.start } : null;
    for (const { node, position } of [...sections].reverse()) if (node !== last?.node) transaction.delete(position, position + node.nodeSize);
    if (last) {
      const position = transaction.mapping.map(last.position);
      if (section) transaction.replaceWith(position, position + last.node.nodeSize, section);
      else transaction.delete(position, position + last.node.nodeSize);
    } else if (section) transaction.insert(transaction.doc.content.size, section);
    const moved = keep && findLoomaFootnote(transaction.doc, keep.label);
    if (keep && moved) {
      const json = selection.toJSON() as { anchor: number; head?: number };
      json.anchor += moved.position - keep.start;
      if (json.head !== undefined) json.head += moved.position - keep.start;
      try { transaction.setSelection(Selection.fromJSON(transaction.doc, json)); } catch { /* the mapped selection stands */ }
    }
  }
  return transaction.docChanged ? transaction : null;
}

// Looma Markdown links each note back to its references at the end of its last paragraph, or in a
// paragraph of their own when the note ends with another block. The editor shows no back-links, so
// they exist only in serialized HTML.
function appendBackLinks(item: HTMLElement, label: string, number: number, count: number) {
  const document = item.ownerDocument;
  let paragraph = item.lastElementChild;
  if (paragraph?.nodeName !== "P") item.append(paragraph = document.createElement("p"));
  for (let occurrence = 1; occurrence <= count; occurrence++) {
    const link = document.createElement("a");
    link.setAttribute("href", `#fnref:${label}${occurrence > 1 ? `:${occurrence}` : ""}`);
    link.setAttribute("data-footnote-backref", "");
    link.setAttribute("aria-label", `Back to reference ${number}${occurrence > 1 ? `-${occurrence}` : ""}`);
    link.append("↩");
    if (occurrence > 1) link.append(Object.assign(document.createElement("sup"), { textContent: String(occurrence) }));
    paragraph.append(" ", link);
  }
}

// ProseMirror caches one serializer per schema; this adds the back-links to each note it writes. It
// wraps that instance's method rather than subclassing DOMSerializer: a bundler that lowers classes
// calls the base as a function, which a native class rejects.
function installSerializer(schema: Schema) {
  const serializer = DOMSerializer.fromSchema(schema);
  if (Object.prototype.hasOwnProperty.call(serializer, "serializeFragment")) return;
  const serializeFragment = serializer.serializeFragment;
  serializer.serializeFragment = function (fragment, options = {}, target) {
    const dom = serializeFragment.call(this, fragment, options, target);
    fragment.forEach((node, _offset, index) => {
      // A note's number is its place in the section, which the numbering keeps in order.
      if (node.type.name === NOTE) appendBackLinks(dom.childNodes[index] as HTMLElement, String(node.attrs.label), index + 1, Number(node.attrs.count) || 1);
    });
    return dom;
  };
}

/**
 * A footnote reference, `[^label]`, saved as `<sup><a data-footnote-ref>`. Typing or pasting
 * `[^label]` makes one; the note it needs is created with it.
 * @invariant `label` names its note. `number` and `occurrence`, the note's number and this
 * reference's place among the note's references, follow the document's order on every change.
 */
export const LoomaFootnoteReference = Node.create({
  name: REFERENCE,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    const link = (element: HTMLElement) => element.querySelector(":scope > a[data-footnote-ref]");
    const label = (element: HTMLElement) => labelFrom(link(element)?.getAttribute("href"), "fn:") ?? "";
    return {
      label: { default: "", parseHTML: label, renderHTML: () => ({}) },
      number: { default: null, parseHTML: element => Number(element.textContent) || null, renderHTML: () => ({}) },
      // The ID is `fnref:` and the label, then `:2` for the second reference.
      occurrence: { default: 1, parseHTML: element => Number(link(element)?.id.slice(`fnref:${label(element)}:`.length)) || 1, renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    return [{ tag: "sup", priority: 1100, getAttrs: element => element.querySelector(":scope > a[data-footnote-ref]") ? null : false }];
  },
  renderHTML({ node }) {
    const { label, number, occurrence } = node.attrs as { label: string; number: number | null; occurrence: number };
    return ["sup", ["a", {
      href: `#fn:${label}`, id: `fnref:${label}${occurrence > 1 ? `:${occurrence}` : ""}`, "data-footnote-ref": "", "aria-describedby": "footnote:label",
    }, String(number ?? label)]];
  },
  renderText({ node }) {
    return `[^${node.attrs.label}]`;
  },
  addInputRules() {
    return [new InputRule({
      find: /\[\^([^\s\]]+)\]$/,
      handler: ({ state, range, match }) => { state.tr.replaceWith(range.from, range.to, this.type.create({ label: match[1] })); },
    })];
  },
  addPasteRules() {
    return [new PasteRule({
      find: /\[\^([^\s\]]+)\]/g,
      handler: ({ state, range, match }) => { state.tr.replaceWith(range.from, range.to, this.type.create({ label: match[1] })); },
    })];
  },
  // The reference opens its footnote actions; the host owns the action bar and floating editor.
  // Its number sits in an `a`, as in saved HTML, so it reads as a link in the editor's styles.
  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement("sup");
      dom.dataset.loomaFootnoteRef = "";
      dom.contentEditable = "false";
      dom.setAttribute("role", "button");
      dom.setAttribute("aria-haspopup", "dialog");
      dom.setAttribute("aria-disabled", String(!editor.isEditable));
      dom.tabIndex = 0;
      const number = dom.appendChild(document.createElement("a"));
      const update = (next: ProseMirrorNode) => {
        if (next.type !== node.type) return false;
        const shown = String(next.attrs.number ?? next.attrs.label);
        dom.dataset.label = String(next.attrs.label);
        if (number.textContent !== shown) number.textContent = shown;
        dom.setAttribute("aria-label", `Footnote ${shown}`);
        return true;
      };
      update(node);
      return { dom, update, stopEvent: event => event.type === "click" || event.type === "keydown" };
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaFootnotes: {
      /**
       * Inserts a reference at the selection. A new label (the next free number when none is given)
       * also gets an empty note, and the caret moves into it.
       */
      insertLoomaFootnote: (label?: string) => ReturnType;
      /** Gives a footnote's note and every reference to it a new, unused label. */
      renameLoomaFootnote: (from: string, to: string) => ReturnType;
      /**
       * From a reference (selected, or just before the caret) to the end of its note; from inside a
       * note to just after its first reference.
       */
      goToLoomaFootnote: () => ReturnType;
    };
  }
}

/**
 * The document's notes, saved as `<section data-footnotes>` with its `<ol>`.
 * @invariant It holds only footnotes and stays the document's last block, one section in number order.
 * @ownership It owns footnote numbering and the back-links in serialized HTML for the whole editor.
 */
export const LoomaFootnotes = Node.create({
  name: NOTES,
  group: "block",
  content: `${NOTE}+`,
  isolating: true,
  parseHTML() {
    return [{ tag: "section[data-footnotes]", contentElement: "ol" }];
  },
  renderHTML() {
    return ["section", { "data-footnotes": "", class: "footnotes" }, ["h2", { id: "footnote:label", class: "sr-only" }, "Footnotes"], ["ol", 0]];
  },
  onBeforeCreate() {
    installSerializer(this.editor.schema);
  },
  onCreate() {
    const transaction = footnoteTransaction(this.editor.state, this.storage.known);
    if (transaction) this.editor.view.dispatch(transaction.setMeta("addToHistory", false));
  },
  addStorage: () => ({ known: new Map<string, ProseMirrorNode>() }),
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction: (transactions, _oldState, state) => transactions.some(transaction => transaction.docChanged)
        ? footnoteTransaction(state, this.storage.known) : null,
      props: {
        // Pasted notes (Markdown definitions, or a rendered document's notes) leave the slice, so they
        // never merge with the text after the caret, and join the document's notes as the notes of
        // the pasted references. A slice of one note's text pastes as text.
        transformPasted: slice => {
          const kept: ProseMirrorNode[] = [];
          slice.content.forEach(node => {
            if (node.type.name === NOTES) node.forEach(note => { this.storage.known.set(note.attrs.label, note); });
            else kept.push(node);
          });
          if (!kept.length || kept.length === slice.content.childCount) return slice;
          const content = Fragment.from(kept);
          const open = Slice.maxOpen(content);
          return new Slice(content, kept[0] === slice.content.firstChild ? slice.openStart : open.openStart, kept.at(-1) === slice.content.lastChild ? slice.openEnd : open.openEnd);
        },
      },
    })];
  },
  addCommands() {
    return {
      insertLoomaFootnote: label => ({ state, tr, dispatch }) => {
        const name = label ?? (() => {
          const used = usedLabels(state.doc);
          let next = 1;
          while (used.has(String(next))) next++;
          return String(next);
        })();
        const { $from, $to } = state.selection;
        if (!isLabel(name) || !$from.parent.canReplaceWith($from.index(), $to.index(), state.schema.nodes[REFERENCE])) return false;
        if (!dispatch) return true;
        const position = tr.selection.from;
        tr.replaceSelectionWith(state.schema.nodes[REFERENCE].create({ label: name }));
        let occurrence = 0;
        tr.doc.descendants((node, offset) => { if (offset <= position && node.type.name === REFERENCE && node.attrs.label === name) occurrence++; });
        tr.setMeta(LOOMA_FOOTNOTE_INSERTED, { label: name, occurrence });
        if (!findLoomaFootnote(tr.doc, name)) {
          const note = state.schema.nodes[NOTE].create({ label: name }, state.schema.nodes.paragraph.create());
          const last = tr.doc.lastChild;
          // The numbering moves the note to its place; the caret goes with it.
          if (last?.type.name === NOTES) tr.insert(tr.doc.content.size - 1, note);
          else tr.insert(tr.doc.content.size, state.schema.nodes[NOTES].create(null, note));
          tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 3));
        }
        tr.scrollIntoView();
        return true;
      },
      renameLoomaFootnote: (from, to) => ({ state, tr, dispatch }) => {
        if (!isLabel(to) || usedLabels(state.doc).has(to) || !findLoomaFootnote(state.doc, from)) return false;
        if (dispatch) state.doc.descendants((node, position) => {
          if ((node.type.name === REFERENCE || node.type.name === NOTE) && node.attrs.label === from) tr.setNodeMarkup(position, undefined, { ...node.attrs, label: to });
        });
        return true;
      },
      goToLoomaFootnote: () => ({ state, tr, dispatch }) => {
        const { selection } = state;
        const reference = selection instanceof NodeSelection ? selection.node : selection.empty ? selection.$from.nodeBefore : null;
        if (reference?.type.name === REFERENCE) {
          const note = findLoomaFootnote(state.doc, reference.attrs.label);
          if (!note) return false;
          if (dispatch) tr.setSelection(Selection.near(state.doc.resolve(note.position + note.node.nodeSize - 1), -1)).scrollIntoView();
          return true;
        }
        const note = noteAt(state.doc, selection.from);
        let first = -1;
        // ponytail: the first reference, not the one the writer came from; track that if writers ask.
        if (note) state.doc.descendants((node, position) => {
          if (first >= 0) return false;
          if (node.type.name === REFERENCE && node.attrs.label === note.node.attrs.label) first = position;
        });
        if (first < 0) return false;
        if (dispatch) tr.setSelection(TextSelection.create(state.doc, first + 1)).scrollIntoView();
        return true;
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      "Mod-Alt-f": () => this.editor.commands.insertLoomaFootnote(),
      "Mod-Alt-n": () => this.editor.commands.goToLoomaFootnote(),
    };
  },
});

/**
 * One note, `[^label]: …`, saved as `<li id="fn:label">`.
 * @invariant It exists only inside `LoomaFootnotes`. `count` is how many references point to it. Its
 * back-links are presentation: the editor reads past them and writes them only into saved HTML.
 */
export const LoomaFootnote = Node.create({
  name: NOTE,
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      label: { default: "", parseHTML: element => labelFrom(`#${element.id}`, "fn:") ?? "", renderHTML: () => ({}) },
      count: { default: 1, parseHTML: element => element.querySelectorAll("a[data-footnote-backref]").length || 1, renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    return [
      { tag: "li", priority: 1100, context: `${NOTES}/` },
      { tag: "a[data-footnote-backref]", priority: 1100, ignore: true },
    ];
  },
  renderHTML({ node }) {
    return ["li", { id: `fn:${node.attrs.label}` }, 0];
  },
});
