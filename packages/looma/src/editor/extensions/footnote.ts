import { InputRule, Node, PasteRule } from "@tiptap/core";
import { DOMSerializer, type Fragment, type Node as ProseMirrorNode, type Schema, Slice } from "@tiptap/pm/model";
import { NodeSelection, Plugin, Selection, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";

// Footnote IDs as Looma Markdown writes them: `fn:label`, `fnref:label`, and `fnref:label:2` for
// a repeated reference.
const labelFrom = (href: string | null | undefined, prefix: string) => href?.startsWith(`#${prefix}`) ? href.slice(prefix.length + 1) : null;

/** A footnote label as Looma Markdown reads it in `[^label]`: no whitespace and no `]`. */
export const LOOMA_FOOTNOTE_LABEL = /^[^\s\]]+$/;

export const LOOMA_FOOTNOTE_INSERTED = "loomaFootnoteInserted";

const REFERENCE = "loomaFootnoteReference";
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
 * Looma Markdown's footnote numbering for `content`, in document order. Notes are numbered by first
 * reference, in the text and then in the notes, and every reference has its note's number and its
 * place among that note's references. The first note for a label is its note, as with Markdown's
 * definitions; any other note, or one nothing refers to, has no number.
 */
function numberFootnotes(content: Fragment) {
  const references: { label: string; note: ProseMirrorNode | null }[] = [];
  const notes: ProseMirrorNode[] = [];
  const first = new Map<string, ProseMirrorNode>();
  const visit = (fragment: Fragment, note: ProseMirrorNode | null): void => fragment.forEach(node => {
    if (node.type.name === REFERENCE) references.push({ label: String(node.attrs.label), note });
    else if (node.type.name === NOTE) {
      notes.push(node);
      if (!first.has(node.attrs.label)) first.set(node.attrs.label, node);
      visit(node.content, node);
    } else visit(node.content, note);
  });
  visit(content, null);
  const order: string[] = [];
  const counts = new Map<string, number>();
  const numbered = new Map<number, { number: number; occurrence: number }>();
  const number = (index: number) => {
    const { label } = references[index];
    if (!counts.has(label)) order.push(label);
    counts.set(label, (counts.get(label) ?? 0) + 1);
    numbered.set(index, { number: order.indexOf(label) + 1, occurrence: counts.get(label)! });
  };
  references.forEach((reference, index) => { if (!reference.note) number(index); });
  // A note may refer to a later note, which then joins the order.
  for (let at = 0; at < order.length; at++) {
    const note = first.get(order[at]);
    references.forEach((reference, index) => { if (note && reference.note === note) number(index); });
  }
  return {
    order,
    counts,
    references: references.map((_reference, index) => numbered.get(index) ?? { number: null, occurrence: 1 }),
    notes: notes.map(note => ({ number: first.get(note.attrs.label) === note && counts.has(note.attrs.label) ? order.indexOf(note.attrs.label) + 1 : null, count: counts.get(note.attrs.label) ?? 1 })),
  };
}

/**
 * Keeps footnotes on Looma Markdown's rule (`numberFootnotes`). Each note stays where its definition
 * is written. Removing a note's last reference removes the note; a reference with no note gets one
 * back at the end of the document, the note it last had in this editor (so cutting a reference and
 * pasting it keeps its note) or an empty one. A note nothing has referred to in this editor, as a
 * document may define one, stays.
 * @invariant Changing nothing but text inside a note never moves or renumbers a note.
 */
function footnoteTransaction(state: EditorState, previous: ProseMirrorNode | null, known: Map<string, ProseMirrorNode>): Transaction | null {
  const { doc, schema } = state;
  const references: { node: ProseMirrorNode; position: number }[] = [];
  const notes: { node: ProseMirrorNode; position: number }[] = [];
  doc.descendants((node, position) => {
    if (node.type.name === REFERENCE) references.push({ node, position });
    if (node.type.name === NOTE) notes.push({ node, position });
  });
  if (!references.length && !notes.length) return null;
  // A note deleted by this change is the one its references get back.
  previous?.descendants(node => { if (node.type.name === NOTE && !known.has(node.attrs.label)) known.set(node.attrs.label, node); });
  const numbering = numberFootnotes(doc.content);
  const transaction = state.tr;
  // Attribute changes keep every position, so these can use the positions read above.
  const update = ({ node, position }: { node: ProseMirrorNode; position: number }, attrs: Record<string, unknown>) => {
    if (Object.entries(attrs).some(([key, value]) => node.attrs[key] !== value)) transaction.setNodeMarkup(position, undefined, { ...node.attrs, ...attrs });
  };
  references.forEach((reference, index) => update(reference, numbering.references[index]));
  notes.forEach((note, index) => { update(note, numbering.notes[index]); known.set(note.node.attrs.label, note.node); });
  const referenced = new Set<string>();
  previous?.descendants(node => { if (node.type.name === REFERENCE) referenced.add(String(node.attrs.label)); });
  for (const { node, position } of [...notes].reverse()) {
    if (referenced.has(node.attrs.label) && !numbering.counts.has(node.attrs.label)) transaction.delete(transaction.mapping.map(position), transaction.mapping.map(position + node.nodeSize));
  }
  for (const label of numbering.order) {
    if (notes.some(({ node }) => node.attrs.label === label)) continue;
    const note = known.get(label) ?? schema.nodes[NOTE].create({ label }, schema.nodes.paragraph.create());
    transaction.insert(transaction.doc.content.size, note.type.create({ ...note.attrs, number: numbering.order.indexOf(label) + 1, count: numbering.counts.get(label) }, note.content));
  }
  return transaction.docChanged ? transaction : null;
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

// Saved HTML collects the notes as Looma Markdown renders them: one `<section data-footnotes>` after
// the content, in number order, each note an `<li>` with its back-links; a note nothing refers to
// renders nothing. ProseMirror caches one serializer per schema; this wraps that instance's method
// rather than subclassing DOMSerializer: a bundler that lowers classes calls the base as a function,
// which a native class rejects. Only the outermost call, which has no target, collects.
function installSerializer(schema: Schema) {
  const serializer = DOMSerializer.fromSchema(schema);
  if (Object.prototype.hasOwnProperty.call(serializer, "serializeFragment")) return;
  const serializeFragment = serializer.serializeFragment;
  serializer.serializeFragment = function (fragment, options = {}, target) {
    const dom = serializeFragment.call(this, fragment, options, target);
    if (target) return dom;
    // The numbers are worked out here, so HTML saved before the editor numbers a document is right.
    const numbering = numberFootnotes(fragment);
    const references = [...dom.querySelectorAll<HTMLElement>("a[data-footnote-ref]")];
    const elements = [...dom.querySelectorAll<HTMLElement>("[data-looma-footnote]")];
    if (references.length !== numbering.references.length || elements.length !== numbering.notes.length) return dom;
    references.forEach((link, index) => {
      const { number, occurrence } = numbering.references[index];
      const label = labelFrom(link.getAttribute("href"), "fn:");
      if (number !== null) link.textContent = String(number);
      link.id = `fnref:${label}${occurrence > 1 ? `:${occurrence}` : ""}`;
    });
    const document = dom.ownerDocument!;
    const items: { number: number; item: HTMLElement }[] = [];
    elements.forEach((element, index) => {
      const { number, count } = numbering.notes[index];
      const label = element.getAttribute("data-label") ?? "";
      element.remove();
      if (number === null) return;
      const item = document.createElement("li");
      item.id = `fn:${label}`;
      item.append(...element.querySelector(":scope > li")!.childNodes);
      appendBackLinks(item, label, number, count);
      items.push({ number, item });
    });
    if (!items.length) return dom;
    const section = document.createElement("section");
    section.setAttribute("data-footnotes", "");
    section.className = "footnotes";
    section.append(Object.assign(document.createElement("h2"), { id: "footnote:label", className: "sr-only", textContent: "Footnotes" }));
    section.append(document.createElement("ol"));
    section.lastElementChild!.append(...items.sort((a, b) => a.number - b.number).map(({ item }) => item));
    dom.append(section);
    return dom;
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaFootnotes: {
      /**
       * Inserts a reference at the selection. A new label (the next free number when none is given)
       * also gets an empty note at the end of the document, and the caret moves into it.
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

// Each editor's last note for each label. Tiptap shares an extension's storage between the editors
// that use the extension, so this is kept per editor.
const known = new WeakMap<object, Map<string, ProseMirrorNode>>();
const knownNotes = (editor: object) => known.get(editor) ?? known.set(editor, new Map()).get(editor)!;

/**
 * One note, `[^label]: …`, where its definition is written. Saved HTML collects the notes into
 * one `<section data-footnotes>` whose `<li id="fn:label">` items read back as notes.
 * @invariant `number` is its place in the numbering, or null when nothing refers to it; `count` is
 * how many references point to it. Its back-links are presentation: the editor reads past them and
 * writes them only into saved HTML.
 * @ownership It owns footnote numbering and the notes section in serialized HTML for the whole editor.
 */
export const LoomaFootnote = Node.create({
  name: NOTE,
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      label: { default: "", parseHTML: element => element.getAttribute("data-label") ?? labelFrom(`#${element.id}`, "fn:") ?? "", renderHTML: () => ({}) },
      number: { default: null, renderHTML: () => ({}) },
      count: { default: 1, parseHTML: element => element.querySelectorAll("a[data-footnote-backref]").length || 1, renderHTML: () => ({}) },
    };
  },
  parseHTML() {
    return [
      { tag: "section[data-footnotes]", priority: 1100, skip: true },
      { tag: "section[data-footnotes] > h2", priority: 1100, ignore: true },
      { tag: "section[data-footnotes] > ol", priority: 1100, skip: true },
      { tag: "section[data-footnotes] > ol > li", priority: 1100 },
      { tag: ":is(ol, ul)[data-looma-footnote]", priority: 1100, contentElement: ":scope > li" },
      { tag: "a[data-footnote-backref]", priority: 1100, ignore: true },
    ];
  },
  // In the editor a note is a one-item list, so the native list marker shows its number where it
  // is written; a note without a number has a bullet.
  renderHTML({ node }) {
    const { label, number } = node.attrs as { label: string; number: number | null };
    return [number === null ? "ul" : "ol", { "data-looma-footnote": "", "data-label": label, id: `fn:${label}`, ...(number === null ? {} : { start: number }) }, ["li", 0]];
  },
  onBeforeCreate() {
    installSerializer(this.editor.schema);
  },
  onCreate() {
    const transaction = footnoteTransaction(this.editor.state, null, knownNotes(this.editor));
    if (transaction) this.editor.view.dispatch(transaction.setMeta("addToHistory", false));
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      appendTransaction: (transactions, oldState, state) => transactions.some(transaction => transaction.docChanged)
        ? footnoteTransaction(state, oldState.doc, knownNotes(this.editor)) : null,
      props: {
        // A pasted note ends the paste, so the text after the caret never joins it.
        transformPasted: slice => slice.openEnd && slice.content.lastChild?.type.name === NOTE ? new Slice(slice.content, slice.openStart, 0) : slice,
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
          tr.insert(tr.doc.content.size, state.schema.nodes[NOTE].create({ label: name }, state.schema.nodes.paragraph.create()));
          // Inside the new note's paragraph.
          tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 2));
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
