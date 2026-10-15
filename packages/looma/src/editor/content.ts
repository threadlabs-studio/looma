import type { JSONContent } from "@tiptap/core";

/** Whether a controlled document already matches the editor, so applying it would only reset the selection. */
export function sameDocument(left: JSONContent, right: JSONContent): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * A link destination the editor may store: a site-relative path, fragment, or query, or an
 * absolute http, https, mailto, or tel URL.
 *
 * @failure Returns null for empty input, control characters, other schemes, and unparseable URLs.
 */
export function validLinkHref(value: string): string | null {
  const href = value.trim();
  if (!href || /[\u0000-\u001f\u007f]/.test(href)) return null;
  if (/^(\/|#|\?)/.test(href)) return href;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? href : null;
  } catch {
    return null;
  }
}
