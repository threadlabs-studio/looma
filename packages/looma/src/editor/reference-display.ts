import { Extension, Node, mergeAttributes, type Editor } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView, NodeView } from "@tiptap/pm/view";
import { validLinkHref } from "./content";

/** Replaceable host-owned presentation, keyed by `link:<id>` or `mention:<id>`. */
export interface LoomaReferenceDisplay { readonly label: string; readonly href?: string }
/** Display values indexed by stable target kind and identity, outside authored document data. */
export type LoomaReferenceMap = Readonly<Record<string, LoomaReferenceDisplay>>;
const referenceDisplayKey = new PluginKey<LoomaReferenceMap>("loomaReferenceDisplay");
const referenceDisplayMeta = "loomaReferenceDisplay";

/**
 * Replaces presentation without editing the document or adding an undo/history entry.
 * @lifecycle Values last until the next replacement or editor destruction; hosts own persistence.
 */
export function setReferenceDisplay(editor: Editor, references: LoomaReferenceMap): void {
  if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(referenceDisplayMeta, references).setMeta("addToHistory", false));
}

/**
 * The current replaceable presentation; absent entries use the saved fallback.
 * @ownership The returned map belongs to the host; replace it rather than mutating it.
 */
export function getReferenceDisplay(editor: Editor): LoomaReferenceMap {
  return (editor.storage.loomaReferencePresentation as { references?: LoomaReferenceMap } | undefined)?.references ?? {};
}

/**
 * Reads current host presentation, with a durable insertion-time fallback for offline copies.
 * @failure Unsafe cached destinations fall back to the saved safe URL or no destination.
 */
export function referenceDisplay(node: ProseMirrorNode, references: LoomaReferenceMap = {}): LoomaReferenceDisplay {
  const kind = node.type.name === "mention" ? "mention" : node.attrs.kind;
  const display = references[`${kind}:${node.attrs.id}`];
  const label = typeof display?.label === "string" ? display.label : typeof node.attrs.label === "string" ? node.attrs.label : String(node.attrs.id ?? "Reference");
  const href = typeof display?.href === "string" ? validLinkHref(display.href) : null;
  return {
    label,
    ...(kind === "link" ? { href: href ?? (typeof node.attrs.href === "string" ? validLinkHref(node.attrs.href) : null) ?? undefined } : {}),
  };
}

/**
 * An automatically labelled link; custom wording remains an ordinary text link.
 * @contract Identity and insertion-time fallback stay in JSON; cached presentation stays outside it.
 */
export const LoomaReference = Node.create({
  name: "loomaReference", inline: true, group: "inline", atom: true,
  addAttributes: () => ({
    id: { default: null, renderHTML: () => ({}) }, kind: { default: "link", renderHTML: () => ({}) }, href: { default: null, renderHTML: () => ({}) }, label: { default: null, renderHTML: () => ({}) }, target: { default: "_self", renderHTML: () => ({}) },
  }),
  // Parse before the ordinary Link mark so HTML copies retain reference identity.
  parseHTML: () => [{ tag: "a[data-looma-reference]", priority: 1001, getAttrs: element => ({
    id: element.getAttribute("data-looma-reference"), kind: "link", href: element.getAttribute("href"), label: element.textContent, target: element.getAttribute("target") ?? "_self",
  }) }],
  renderHTML({ node, HTMLAttributes }) {
    const display = referenceDisplay(node, this.editor ? getReferenceDisplay(this.editor) : {});
    return ["a", mergeAttributes(HTMLAttributes, {
      "data-looma-reference": node.attrs.id, href: display.href,
      target: node.attrs.target === "_blank" ? "_blank" : "_self", rel: "noopener noreferrer",
    }), display.label];
  },
  renderText({ node }) { return referenceDisplay(node, this.editor ? getReferenceDisplay(this.editor) : {}).label; },
});

/**
 * Installs metadata-backed node views for references and existing stable-id mentions.
 * @lifecycle Node views register until destroyed, including across editor reattachment.
 */
export const LoomaReferencePresentation = Extension.create<{ references: LoomaReferenceMap; mentions: boolean }>({
  name: "loomaReferencePresentation",
  addOptions: () => ({ references: {}, mentions: false }),
  addStorage() { return { references: this.options.references }; },
  addProseMirrorPlugins() {
    const initial = this.options.references;
    const refresh = new Set<() => void>();
    const nodeView = (node: ProseMirrorNode, view: EditorView, getPosition: () => number | undefined): NodeView => {
      let current = node;
      const mention = node.type.name === "mention";
      const dom = document.createElement(mention ? "span" : "a");
      if (mention) { dom.className = "looma-mention"; dom.setAttribute("data-type", "mention"); }
      else dom.addEventListener("click", event => {
        if (!(event instanceof MouseEvent) || !view.editable || event.metaKey || event.ctrlKey) return;
        const position = getPosition();
        if (position === undefined) return;
        event.preventDefault();
        view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, position)));
        view.focus();
      });
      const render = () => {
        const display = referenceDisplay(current, referenceDisplayKey.getState(view.state));
        dom.textContent = `${mention ? "@" : ""}${display.label}`;
        if (mention) { dom.setAttribute("data-id", current.attrs.id ?? ""); dom.setAttribute("data-label", display.label); }
        if (!mention) {
          dom.setAttribute("data-looma-reference", current.attrs.id ?? "");
          if (display.href) dom.setAttribute("href", display.href); else dom.removeAttribute("href");
          dom.setAttribute("target", current.attrs.target === "_blank" ? "_blank" : "_self"); dom.setAttribute("rel", "noopener noreferrer");
        }
      };
      refresh.add(render); render();
      return { dom, update(next) { if (next.type !== current.type) return false; current = next; render(); return true; }, destroy: () => { refresh.delete(render); } };
    };
    return [new Plugin<LoomaReferenceMap>({
      key: referenceDisplayKey,
      state: { init: () => initial, apply: (transaction, previous) => {
        const next = transaction.getMeta(referenceDisplayMeta) ?? previous;
        this.storage.references = next;
        return next;
      } },
      props: { nodeViews: { loomaReference: nodeView, ...(this.options.mentions && this.editor.schema.nodes.mention ? { mention: nodeView } : {}) } },
      // Reattaching an editor replaces plugin views while its node views can survive.
      // Each node view owns its registration until its own destroy callback runs.
      view: () => ({ update: (view, previous) => {
        if (referenceDisplayKey.getState(view.state) !== referenceDisplayKey.getState(previous)) refresh.forEach(render => render());
      } }),
    })];
  },
});
