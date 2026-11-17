import { Node } from '@tiptap/core';
import { parseDocument } from 'htmlparser2';

/** A retained original; its host owns storage, access and download behavior. */
export interface FileAttachmentAttrs { href: string; name: string; size: number; contentType: string; }

/** Reject malformed metadata and active URL schemes before rendering a file action. */
export function fileAttachmentAttrs(value: Record<string, unknown>): FileAttachmentAttrs {
  const { href, name, size, contentType } = value;
  if (typeof href !== 'string' || !href || href !== href.trim() || /[\u0000-\u001f\u007f]/.test(href)
    || typeof name !== 'string' || !name.trim() || !Number.isSafeInteger(size) || Number(size) < 0
    || typeof contentType !== 'string') throw new Error('Invalid file attachment');
  const url = new URL(href, 'https://files.example.invalid/');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid file attachment URL');
  return { href, name, size: Number(size), contentType };
}

/** The same decimal byte units used by upload receipts. */
export function fileAttachmentSize(size: number): string {
  if (size < 1000) return `${size} B`;
  if (size < 1_000_000) return `${Number((size / 1000).toFixed(1))} KB`;
  return `${Number((size / 1_000_000).toFixed(1))} MB`;
}
const escape = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Portable HTML keeps the original link, filename and byte count without editor chrome. */
export function fileAttachmentHtml(value: Record<string, unknown>): string {
  const a = fileAttachmentAttrs(value);
  return `<div data-looma-file-attachment="" data-href="${escape(a.href)}" data-name="${escape(a.name)}" data-size="${a.size}" data-content-type="${escape(a.contentType)}"><a href="${escape(a.href)}" target="_blank" rel="noopener noreferrer">${escape(a.name)}</a> <span>${fileAttachmentSize(a.size)}</span></div>`;
}

/** Read only the complete authored attachment shape; refuse extra executable or lost content. */
export function readFileAttachmentHtml(html: string): FileAttachmentAttrs | null {
  const roots = parseDocument(html).children.filter(n => n.type !== 'text' || n.data.trim());
  const root = roots[0];
  if (roots.length !== 1 || root?.type !== 'tag' || root.name !== 'div' || !Object.hasOwn(root.attribs, 'data-looma-file-attachment')) return null;
  if (Object.keys(root.attribs).some(key => !['data-looma-file-attachment', 'data-href', 'data-name', 'data-size', 'data-content-type'].includes(key))) throw new Error('Unsupported attachment attributes');
  const a = fileAttachmentAttrs({ href: root.attribs['data-href'], name: root.attribs['data-name'], size: Number(root.attribs['data-size']), contentType: root.attribs['data-content-type'] });
  let children = root.children.filter(n => n.type !== 'text' || n.data.trim());
  if (children.length === 1 && children[0]?.type === 'tag' && children[0].name === 'p' && !Object.keys(children[0].attribs).length) children = children[0].children.filter(n => n.type !== 'text' || n.data.trim());
  const [link, size] = children;
  const plain = (nodes: typeof root.children): string => nodes.map(n => {
    if (n.type === 'text') return n.data;
    if (n.type === 'tag' && n.name === 'p' && !Object.keys(n.attribs).length && n.children.every(c => c.type === 'text')) return n.children.map(c => c.type === 'text' ? c.data : '').join('');
    throw new Error('Unsupported attachment content');
  }).join('').replace(/^\n+|\n+$/g, '');
  if (children.length !== 2 || link?.type !== 'tag' || link.name !== 'a' || size?.type !== 'tag' || size.name !== 'span'
    || link.attribs.href !== a.href || Object.keys(link.attribs).some(key => !['href', 'target', 'rel'].includes(key)) || Object.keys(size.attribs).length
    || plain(link.children) !== a.name || plain(size.children) !== fileAttachmentSize(a.size)) throw new Error('Unsupported attachment content');
  return a;
}

/** A movable, atomic file block. Its rich view composes the standard card action. */
export const LoomaFileAttachment = Node.create({
  name: 'loomaFileAttachment', group: 'block', atom: true, draggable: true,
  addAttributes() { return { href: { default: '' }, name: { default: '' }, size: { default: 0 }, contentType: { default: 'application/octet-stream' } }; },
  parseHTML() { return [{ tag: 'div[data-looma-file-attachment]', getAttrs: element => {
    try { return fileAttachmentAttrs({ href: element.getAttribute('data-href'), name: element.getAttribute('data-name'), size: Number(element.getAttribute('data-size')), contentType: element.getAttribute('data-content-type') }); } catch { return false; }
  } }]; },
  renderHTML({ node }) {
    let a: FileAttachmentAttrs;
    try { a = fileAttachmentAttrs(node.attrs); } catch { return ['div', {}, 'Unavailable attachment']; }
    return ['div', { 'data-looma-file-attachment': '', 'data-href': a.href, 'data-name': a.name, 'data-size': a.size, 'data-content-type': a.contentType },
      ['a', { href: a.href, target: '_blank', rel: 'noopener noreferrer' }, a.name], ' ', ['span', {}, fileAttachmentSize(a.size)]];
  },
  renderText({ node }) {
    try { const a = fileAttachmentAttrs(node.attrs); return `${a.name} (${fileAttachmentSize(a.size)})`; } catch { return 'Unavailable attachment'; }
  },
});
