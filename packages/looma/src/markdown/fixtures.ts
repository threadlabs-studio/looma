/**
 * Looma Markdown's conformance fixtures and the HTML normalizer that compares renderings of them.
 * Every reader and writer runs the same cases: LoomaEditor's round-trip suite, renderers and
 * applications that store Looma Markdown.
 */

/** One conformance case: Markdown in, canonical HTML out, and the Markdown a writer produces. */
export interface LoomaMarkdownFixture {
  /** The folder, named after a row of the spec's Support table. */
  feature: string;
  name: string;
  markdown: string;
  /** The canonical HTML: what LoomaEditor saves and the markdown-it plugin renders. */
  html: string;
  /** What a writer produces from the document; the input itself when the case has no `case.canonical.md`. */
  canonical: string;
}

// The cases live in packages/looma/markdown-fixtures and ship bundled as strings.
const files = import.meta.glob<string>("../../markdown-fixtures/*/*.{md,html}", { query: "?raw", import: "default", eager: true });

function fixtures(): LoomaMarkdownFixture[] {
  const cases = new Map<string, Partial<LoomaMarkdownFixture> & { feature: string; name: string }>();
  for (const [path, content] of Object.entries(files)) {
    const [, feature, name, kind] = /\/markdown-fixtures\/([^/]+)\/([^/.]+)\.(md|html|canonical\.md)$/.exec(path)!;
    const fixture = cases.get(`${feature}/${name}`) ?? { feature, name };
    cases.set(`${feature}/${name}`, fixture);
    if (kind === "md") fixture.markdown = content;
    else if (kind === "html") fixture.html = content;
    else fixture.canonical = content;
  }
  return [...cases.values()].map(fixture => {
    if (fixture.markdown === undefined || fixture.html === undefined) throw new Error(`${fixture.feature}/${fixture.name} needs case.md and case.html`);
    return { ...fixture, canonical: fixture.canonical ?? fixture.markdown } as LoomaMarkdownFixture;
  }).sort((a, b) => `${a.feature}/${a.name}`.localeCompare(`${b.feature}/${b.name}`, "en"));
}

/** Every conformance case, ordered by feature and name. */
export const LOOMA_MARKDOWN_FIXTURES: readonly LoomaMarkdownFixture[] = Object.freeze(fixtures());

const BLOCKS = new Set([
  "address", "article", "aside", "blockquote", "details", "div", "dl", "dd", "dt", "figcaption", "figure", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p", "pre", "section", "summary",
  "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul", "ui-callout", "ui-disclosure", "ui-tabs",
]);
const VOID = new Set(["br", "hr", "img", "input", "col", "wbr"]);
const escapeText = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Presentation a renderer may add around the canonical HTML: heading self-links, the code figure
// with its caption and actions, and highlighting markup inside code.
function unwrapPresentation(root: ParentNode): void {
  for (const link of root.querySelectorAll(":is(h1, h2, h3, h4, h5, h6) > a[href^='#']:only-child")) link.replaceWith(...link.childNodes);
  for (const figure of root.querySelectorAll("figure.code")) {
    const pre = figure.querySelector("pre");
    if (pre) figure.replaceWith(pre); else figure.remove();
  }
  for (const pre of root.querySelectorAll("pre")) {
    for (const name of pre.getAttributeNames()) pre.removeAttribute(name);
    const code = pre.querySelector("code");
    if (code) code.textContent = code.textContent;
  }
}

function serialize(node: Node, inPre: boolean): string {
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    if (inPre) return escapeText(text);
    const parent = node.parentNode as Element | null;
    let value = text.replace(/\s+/g, " ");
    const isBlockEdge = (sibling: Node | null) => sibling === null || (sibling.nodeType === 1 && BLOCKS.has((sibling as Element).localName));
    if (!parent || parent.nodeType !== 1 || BLOCKS.has((parent as Element).localName)) {
      if (isBlockEdge(node.previousSibling)) value = value.trimStart();
      if (isBlockEdge(node.nextSibling)) value = value.trimEnd();
    }
    return escapeText(value);
  }
  if (node.nodeType !== 1) return [...node.childNodes].map(child => serialize(child, inPre)).join("");
  const element = node as Element;
  const name = element.localName;
  const attributes = element.getAttributeNames().sort().map(attribute => {
    const value = element.getAttribute(attribute) ?? "";
    return value ? ` ${attribute}="${value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : ` ${attribute}`;
  }).join("");
  if (VOID.has(name)) return `<${name}${attributes}>`;
  const content = [...element.childNodes].map(child => serialize(child, inPre || name === "pre")).join("");
  return `<${name}${attributes}>${content}</${name}>`;
}

/**
 * Normalizes HTML so two renderings of a fixture compare as strings.
 * @contract Sorts attributes, writes empty attributes bare, collapses whitespace outside `pre` and
 * drops it at block edges, and unwraps renderer presentation (heading self-links, the code
 * `figure.code` wrapper and its actions, markup inside code).
 * @ownership Uses the supplied document, or the global one when a DOM is present; it never reads
 * the DOM at import.
 */
export function normalizeLoomaHtml(html: string, document: Document = globalThis.document): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  unwrapPresentation(template.content);
  return serialize(template.content, false).trim();
}
