import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';

/** Keep other origins and non-web schemes intact; same-origin links retain path, query, and fragment. */
export function siteRelativeHref(href: string, baseUrl: string): string {
  if (!/^(https?:\/\/|\/\/)/i.test(href.trim())) return href;
  try {
    const base = new URL(baseUrl);
    const url = new URL(href, base);
    if (!/^https?:$/.test(base.protocol) || url.origin !== base.origin || url.username || url.password) return href;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/** Normalize newly created links in the same transaction batch, including paste rules and the picker.
 * @contract Existing document links are preserved until replaced; undo/redo keeps the original editing step.
 * @ownership The editor owns normalization; callers supply a site URL rather than a host callback.
 */
export function createSiteRelativeLinks(baseUrl: string) {
  const key = new PluginKey('looma-site-relative-links');
  return Extension.create({
    name: 'loomaSiteRelativeLinks',
    addProseMirrorPlugins() {
      const editor = this.editor;
      return [new Plugin({
        key,
        appendTransaction(transactions, oldState, newState) {
          if (!editor.isEditable || !transactions.some(transaction => transaction.docChanged) || transactions.some(transaction => transaction.getMeta(key))) return null;
          const mapping = new Mapping();
          for (const transaction of transactions) mapping.appendMapping(transaction.mapping);
          const inverse = mapping.invert();
          const tr = newState.tr;
          newState.doc.descendants((node, position) => {
            if (!node.isText) return;
            const mark = node.marks.find(candidate => candidate.type.name === 'link');
            if (!mark || typeof mark.attrs.href !== 'string') return;
            const href = siteRelativeHref(mark.attrs.href, baseUrl);
            if (href === mark.attrs.href) return;
            const before = inverse.mapResult(position, 1);
            const previous = before.deleted ? null : oldState.doc.nodeAt(before.pos)?.marks.find(candidate => candidate.type.name === 'link');
            if (previous?.attrs.href === mark.attrs.href) return;
            tr.addMark(position, position + node.nodeSize, mark.type.create({ ...mark.attrs, href }));
          });
          return tr.docChanged ? tr.setMeta(key, true) : null;
        },
      })];
    },
  });
}
