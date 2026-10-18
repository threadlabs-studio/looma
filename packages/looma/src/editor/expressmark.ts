import type { Editor, JSONContent } from "@tiptap/core";
import { parse, stringify, type Attributes, type ConversionOptions, type Document, type Node } from "expressmark";
import { loomaHeadingSlug, LOOMA_CALLOUT_TONES, LOOMA_CHIP_TONES } from "../markdown";
import { getReferenceDisplay, type LoomaReferenceMap } from "./reference-display";

/** Conversion-time display snapshot, independent from the authored editor document. */
export interface EditorMarkdownConversionOptions extends ConversionOptions { references?: LoomaReferenceMap }

/**
 * A conversion cannot faithfully represent the named input at this document location.
 * @failure Callers retain the original document and can report the unsupported feature and path.
 */
export class EditorMarkdownConversionError extends Error {
  constructor(readonly path: string, readonly feature: string) {
    super(`Cannot convert ${feature} at ${path} without losing document data.`);
    this.name = "EditorMarkdownConversionError";
  }
}

const fail = (path: string, feature: string): never => { throw new EditorMarkdownConversionError(path, feature); };
const fields = (node: JSONContent, names: string[], path: string) => {
  for (const [name, value] of Object.entries(node.attrs ?? {})) {
    if (value !== null && value !== undefined && !names.includes(name)) fail(path, `attribute ${name}`);
  }
};
const string = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const title = (value: string): Node => ({ type: "title", value });
const content = (node: Node) => node.body ?? node.children ?? (node.value !== undefined ? [{ type: "text", value: node.value }] : []);
const text = (node: Node): string => node.value ?? content(node).map(text).join("");
const plainTitle = (node: Node | string | undefined, path: string): string => {
  if (node === undefined) return "";
  if (typeof node === "string" || node.type !== "title" || node.id || node.attributes || node.body || node.children?.some(child => child.type !== "text" || child.id || child.attributes)) fail(path, "formatted or attributed title");
  return text(node as Node);
};
const AST_FIELDS: Record<string, string[]> = {
  text: [], paragraph: [], heading: ["level"], break: [], softBreak: [], horizontalRule: [], blockquote: [],
  list: ["ordered", "start", "tight"], listItem: ["checked"], code: ["language", "meta", "title"], image: ["url", "alt", "title"],
  inline: ["subType", "ref"], container: ["subType", "title"], table: ["align", "title"], tableRow: [], tableCell: ["header", "colSpan", "rowSpan"],
  strong: [], emphasis: [], delete: [], underline: [], highlight: [], inlineCode: [], link: ["url", "title"],
};

const has = (attrs: Attributes, key: string, value: unknown) => {
  if (typeof value === "string" || typeof value === "boolean") attrs[key] = value;
  else if (typeof value === "number" && Number.isFinite(value)) attrs[key] = String(value);
};
const compact = (type: string, children: Node[], extra: Partial<Node> = {}): Node => children.length === 0 || children.every(node => node.type === "text" && Object.keys(node).every(key => key === "type" || key === "value"))
  ? { type, ...extra, value: children.map(node => node.value).join("") }
  : { type, ...extra, children };
function findNode(document: Node, predicate: (node: Node) => boolean): Node | undefined {
  if (predicate(document)) return document;
  for (const child of document.body ?? document.children ?? []) {
    const found = findNode(child, predicate); if (found) return found;
  }
  return undefined;
}
function safeBackground(value: unknown, path: string) {
  if (typeof value !== "string") fail(path, "nonstring table background");
  // A color is one CSS value, not a declaration list. The shared maintained
  // HTML policy decides which color values can actually enter native CSS.
  if ((value as string).includes(";")) fail(path, "table background containing declarations");
  const style = `background-color:${value}`;
  const probe = parse(stringify({ type: "document", version: 1, body: [{ type: "paragraph", value: "color", attributes: { style } }] }));
  const accepted = findNode(probe, node => typeof node.attributes?.style === "string")?.attributes?.style;
  if (typeof accepted !== "string" || accepted.replace(/\s/g, "").replace(/;$/, "") !== style.replace(/\s/g, "")) fail(path, "unsafe or unsupported table background");
}
function safeNavigation(value: unknown, image: boolean, path: string) {
  if (typeof value !== "string") fail(path, "nonstring navigation URL");
  const target: Node = image ? { type: "image", url: value as string, alt: "image" } : { type: "link", url: value as string, value: "link" };
  const probe = parse(stringify({ type: "document", version: 1, body: [{ type: "paragraph", children: [target] }] }));
  const node = findNode(probe, child => child.type === (image ? "image" : "link"));
  if (node?.url !== value) fail(path, "unsafe or unsupported navigation URL");
}

const MARKS: Record<string, string> = { bold: "strong", italic: "emphasis", strike: "delete", underline: "underline", highlight: "highlight", code: "inlineCode", link: "link" };

// Saved editor fences predate the shared attribute syntax. Translate only known
// tokens; quoted extension metadata stays opaque and ranges remain strings.
function legacyCodePresentation(code: Node, path: string): Node {
  let remaining = code.meta ?? "";
  let unknown = "";
  let translated = false;
  const attributes: Attributes = { ...code.attributes };
  const result: Node = { ...code, attributes };
  while (remaining) {
    const spacing = /^[ \t]+/.exec(remaining)?.[0];
    if (spacing) { unknown += spacing; remaining = remaining.slice(spacing.length); continue; }
    const token = /^(?:title="([^"]*)"|\{(\d+(?:[ \t]*-[ \t]*\d+)?(?:[ \t]*,[ \t]*\d+(?:[ \t]*-[ \t]*\d+)?)*)\}|:(no-)?line-numbers)(?=$|[ \t:{])/.exec(remaining);
    if (token) {
      const key = token[1] !== undefined ? "title" : token[2] !== undefined ? "highlight" : "showLineNumbers";
      const value = token[1] ?? (token[2] !== undefined ? token[2].replace(/[ \t]/g, "") : token[3] === undefined);
      const previous = key === "title" ? result.title : attributes[key];
      if (previous !== undefined && previous !== value) fail(path, `conflicting code ${key} metadata`);
      if (key === "title") result.title = value as string;
      else attributes[key] = value;
      remaining = remaining.slice(token[0].length);
      translated = true;
      continue;
    }
    const opaque = /^(?:[^"' \t]+|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')+/.exec(remaining)?.[0] ?? remaining[0]!;
    unknown += opaque;
    remaining = remaining.slice(opaque.length);
  }
  if (!translated) return code;
  delete result.meta;
  if (unknown.trim()) result.meta = unknown.trim();
  if (!Object.keys(attributes).length) delete result.attributes;
  return result;
}
const REVERSE_MARKS = Object.fromEntries(Object.entries(MARKS).map(([left, right]) => [right, left]));

interface Heading { text: string; id: string; level: number; node?: JSONContent }
interface ProjectionContext { headings: Heading[]; headingIds: WeakMap<JSONContent, string>; references: LoomaReferenceMap }
const displayText = (node: JSONContent, references: LoomaReferenceMap): string => {
  if (node.type === "loomaReference") return references[`link:${node.attrs?.id}`]?.label ?? string(node.attrs?.label, string(node.attrs?.id));
  if (node.type === "mention") return `@${references[`mention:${node.attrs?.id}`]?.label ?? string(node.attrs?.label, string(node.attrs?.id))}`;
  return node.text ?? (node.content ?? []).map(child => displayText(child, references)).join("");
};

function tocBody(headings: Heading[], depth: number, ordered: boolean): Node[] {
  const roots: Node[] = [];
  const stack: {level: number; item: Node}[] = [];
  for (const heading of headings.filter(item => item.level <= depth)) {
    while (stack.length && stack[stack.length - 1]!.level >= heading.level) stack.pop();
    const item: Node = { type: "listItem", body: [{ type: "paragraph", children: [{ type: "link", url: `#${heading.id}`, value: heading.text, attributes: { target: "_self", rel: "noopener noreferrer" } }] }] };
    const parent = stack[stack.length - 1]?.item;
    const destination = parent ? (parent.body ??= []) : roots;
    let list = destination[destination.length - 1];
    if (list?.type !== "list") { list = {type: "list", ordered, ...(ordered ? {start: 1} : {}), children: []}; destination.push(list); }
    list.children!.push(item);
    stack.push({ level: heading.level, item });
  }
  return roots;
}

function toNode(node: JSONContent, path: string, context: ProjectionContext): Node {
  let result = toBareNode(node, path, context);
  if (!node.marks?.length) return result;
  if (!["text", "mention", "loomaReference", "loomaChip", "hardBreak"].includes(node.type ?? "")) fail(path, "marks on a block node");
  for (const mark of [...(node.marks ?? [])].reverse()) {
    const type = MARKS[mark.type];
    if (!type) fail(path, `mark ${mark.type}`);
    if (mark.type === "highlight" && mark.attrs?.color != null) fail(path, "colored highlight (the default editor uses one highlight style)");
    fields({ attrs: mark.attrs }, mark.type === "link" ? ["href", "title", "target", "rel", "class"] : mark.type === "highlight" ? ["color"] : [], path);
    if (type === "link") {
      const attributes: Attributes = {};
      for (const key of ["target", "rel", "class"]) has(attributes, key, mark.attrs?.[key]);
      result = compact(type, [result], { url: string(mark.attrs?.href), ...(mark.attrs?.title ? { title: string(mark.attrs.title) } : {}), ...(Object.keys(attributes).length ? { attributes } : {}) });
    } else if (type === "inlineCode") {
      if (result.type !== "text") fail(path, "code combined with another mark");
      result = { type, value: result.value ?? "" };
    } else result = compact(type, [result], mark.attrs?.color ? { attributes: { color: string(mark.attrs.color) } } : {});
  }
  return result;
}

function toBareNode(node: JSONContent, path: string, context: ProjectionContext): Node {
  const attrs = node.attrs ?? {};
  const children = () => (node.content ?? []).map((child, index) => toNode(child, `${path}.body[${index}]`, context));
  const blocks = () => children().map(child => child.type === "image" ? { type: "paragraph", children: [child] } : child);
  const plain = (type: string, keys: string[] = [], extra: Partial<Node> = {}) => { fields(node, keys, path); return compact(type, children(), extra); };
  const block = (type: string, keys: string[] = [], extra: Partial<Node> = {}): Node => { fields(node, keys, path); return { type, ...extra, body: blocks() }; };
  switch (node.type) {
    case "loomaReference": {
      fields(node, ["id", "kind", "href", "label", "target"], path);
      if (!attrs.id || attrs.kind !== "link") fail(path, "invalid link reference identity");
      const display = context.references[`link:${attrs.id}`];
      const href = display?.href ?? string(attrs.href);
      safeNavigation(href, false, path);
      return { type: "link", url: href, value: display?.label ?? string(attrs.label, string(attrs.id)), attributes: { ref: string(attrs.id), target: string(attrs.target, "_self"), rel: "noopener noreferrer" } };
    }
    case "text": {
      fields(node, [], path);
      return { type: "text", value: node.text ?? "" };
    }
    case "paragraph": return plain("paragraph");
    case "heading": {
      const id = attrs.id ? string(attrs.id) : context.headingIds.get(node);
      return plain("heading", ["level", "id"], { level: Number(attrs.level ?? 1), ...(id ? { id } : {}) });
    }
    case "blockquote": return block("blockquote");
    case "horizontalRule": fields(node, [], path); return { type: "horizontalRule" };
    case "hardBreak": fields(node, [], path); return { type: "break" };
    case "bulletList": case "orderedList": case "taskList":
      fields(node, ["start"], path);
      return { type: "list", ordered: node.type === "orderedList", ...(node.type === "orderedList" ? { start: Number(attrs.start ?? 1) } : {}), children: children() };
    case "listItem": return block("listItem");
    case "taskItem": return block("listItem", ["checked"], { checked: attrs.checked === true });
    case "codeBlock": {
      fields(node, ["language", "meta"], path);
      if ((node.content ?? []).some(child => child.type !== "text" || child.marks?.length)) fail(path, "nonliteral code content");
      if (/[\r\n]/.test(string(attrs.meta)) || /[\s`~]/.test(string(attrs.language))) fail(path, "code fence information");
      const parsed = parse(`\`\`\`${string(attrs.language)} ${string(attrs.meta)}\n\`\`\``).body[0];
      if (parsed?.type !== "code") fail(path, "code fence information");
      return { ...legacyCodePresentation(parsed, path), value: (node.content ?? []).map(child => child.text ?? "").join("") };
    }
    case "image": {
      fields(node, ["src", "alt", "title", "width", "height", "placement", "responsive"], path);
      const attributes: Attributes = {};
      for (const key of ["width", "height", "placement", "responsive"]) has(attributes, key, attrs[key]);
      return { type: "image", url: string(attrs.src), alt: string(attrs.alt), ...(attrs.title ? { title: string(attrs.title) } : {}), ...(Object.keys(attributes).length ? { attributes } : {}) };
    }
    case "mention":
      fields(node, ["id", "label"], path);
      return { type: "inline", subType: "mention", value: context.references[`mention:${attrs.id}`]?.label ?? string(attrs.label, string(attrs.id)), ...(attrs.id ? { ref: string(attrs.id) } : {}) };
    case "loomaChip":
      fields(node, ["label", "color"], path);
      return { type: "inline", subType: "chip", value: string(attrs.label), attributes: { tone: string(attrs.color, "neutral") } };
    case "loomaCallout":
      return block("container", ["tone", "heading"], { subType: string(attrs.tone, "note"), ...(attrs.heading ? { title: title(string(attrs.heading)) } : {}) });
    case "loomaExpand":
      return block("container", ["summary", "open"], { subType: "details", title: title(string(attrs.summary, "Details")), attributes: { open: attrs.open === true } });
    case "loomaTabs":
      fields(node, ["group", "codeGroup", "defaultValue", "queryString", "lazy"], path);
      for (const key of ["group", "defaultValue", "queryString"]) if (attrs[key] !== null && attrs[key] !== undefined && typeof attrs[key] !== "string") fail(path, `nonstring tab ${key}`);
      if (attrs.lazy !== null && attrs.lazy !== undefined && typeof attrs.lazy !== "boolean") fail(path, "nonboolean tab lazy flag");
      const attributes: Attributes = {};
      for (const key of ["group", "queryString", "lazy"]) if (attrs[key] !== "") has(attributes, key, attrs[key]);
      has(attributes, "default", attrs.defaultValue);
      return { type: "container", subType: "tabs", ...(Object.keys(attributes).length ? { attributes } : {}), body: blocks() };
    case "loomaTab": return block("container", ["label", "value"], { subType: "tab", title: title(string(attrs.label)), ...(attrs.value !== undefined && attrs.value !== null ? { attributes: { value: string(attrs.value) } } : {}) });
    case "loomaFigure": {
      fields(node, [], path);
      const image = node.content?.[0]; const caption = node.content?.[1];
      if (node.content?.length !== 2 || image?.type !== "image" || caption?.type !== "loomaFigcaption") fail(path, "figure shape");
      fields(caption!, [], `${path}.caption`);
      return { type: "container", subType: "figure", title: compact("title", (caption!.content ?? []).map((child, index) => toNode(child, `${path}.title[${index}]`, context))), body: [{ type: "paragraph", children: [toNode(image!, `${path}.body[0]`, context)] }] };
    }
    case "table": fields(node, [], path); return { type: "table", children: children() };
    case "tableRow": fields(node, [], path); return { type: "tableRow", children: children() };
    case "tableCell": case "tableHeader": {
      fields(node, ["colspan", "rowspan", "colwidth", "textAlign", "backgroundColor"], path);
      const attributes: Attributes = {};
      for (const key of ["textAlign", "backgroundColor"]) has(attributes, key, attrs[key]);
      if (attrs.colwidth != null) {
        if (!Array.isArray(attrs.colwidth) || attrs.colwidth.some(value => typeof value !== "number" || !Number.isFinite(value))) fail(path, "column widths");
        attributes.columnWidths = attrs.colwidth.join(",");
      }
      return { type: "tableCell", header: node.type === "tableHeader", colSpan: Number(attrs.colspan ?? 1), rowSpan: Number(attrs.rowspan ?? 1), ...(Object.keys(attributes).length ? { attributes } : {}), body: blocks() };
    }
    case "loomaTableOfContents": {
      fields(node, ["format", "depth"], path);
      const depth = Number(attrs.depth ?? 3);
      return { type: "container", subType: "toc", attributes: { depth: String(depth), format: string(attrs.format, "plain") }, body: node.content?.length ? blocks() : tocBody(context.headings, depth, attrs.format === "numbered") };
    }
    default: return fail(path, `node ${node.type ?? "unknown"}`);
  }
}

/**
 * Maps an editor's saved JSON to the independent Expressive Markdown AST without DOM access.
 * @contract Unsupported nodes, marks and durable attributes throw with their location; input is never mutated.
 */
export function editorDocumentToExpressmark(document: JSONContent, options: EditorMarkdownConversionOptions = {}): Document {
  if (document.type !== "doc") fail("document", "non-document root");
  fields(document, [], "document");
  const headings: Heading[] = [];
  let automaticToc = false;
  const colors = new Set<unknown>(); const urls = new Set<string>();
  const visit = (node: JSONContent, insideToc = false) => {
    const attrs = node.attrs ?? {};
    if (node.type === "tableCell" || node.type === "tableHeader") {
      if (attrs.backgroundColor != null && !colors.has(attrs.backgroundColor)) { safeBackground(attrs.backgroundColor, "document"); colors.add(attrs.backgroundColor); }
      if (attrs.textAlign != null && !["left", "center", "right"].includes(String(attrs.textAlign))) fail("document", "unsupported table alignment");
    }
    if (node.type === "image") {
      const key = `image:${attrs.src}`; if (!urls.has(key)) { safeNavigation(attrs.src, true, "document"); urls.add(key); }
      if (attrs.placement != null && !["block", "center", "wrap-left", "wrap-right"].includes(String(attrs.placement))) fail("document", "unsupported image placement");
      if (attrs.responsive != null && typeof attrs.responsive !== "boolean") fail("document", "nonboolean responsive flag");
    }
    for (const mark of node.marks ?? []) if (mark.type === "link") {
      const key = `link:${mark.attrs?.href}`; if (!urls.has(key)) { safeNavigation(mark.attrs?.href, false, "document"); urls.add(key); }
    }
    if (!insideToc && node.type === "loomaTableOfContents" && !node.content?.length) automaticToc = true;
    if (!insideToc && node.type === "heading") headings.push({ node, text: displayText(node, options.references ?? {}), id: string(node.attrs?.id), level: Number(node.attrs?.level ?? 1) });
    // Keep validating authored navigation content without treating its headings as sections.
    for (const child of node.content ?? []) visit(child, insideToc || node.type === "loomaTableOfContents");
  };
  visit(document);
  const headingIds = new WeakMap<JSONContent, string>();
  const reserved = new Set(headings.map(heading => heading.id).filter(Boolean));
  const used = new Set(reserved);
  const authored = new Set<string>();
  for (const heading of headings) {
    if (heading.id) {
      if (authored.has(heading.id)) options.onDiagnostic?.({ code: "duplicate-id", severity: "warning", message: `Authored heading ID "${heading.id}" is repeated and was preserved.` });
      authored.add(heading.id);
      continue;
    }
    const stem = loomaHeadingSlug(heading.text);
    let candidate = stem;
    for (let suffix = 1; used.has(candidate); suffix++) candidate = `${stem}-${suffix}`;
    heading.id = candidate;
    used.add(candidate);
    if (automaticToc && heading.node) headingIds.set(heading.node, candidate);
  }
  const context = { headings, headingIds, references: options.references ?? {} };
  return { type: "document", version: 1, body: (document.content ?? []).map((node, index) => { const child = toNode(node, `document.body[${index}]`, context); return child.type === "image" ? { type: "paragraph", children: [child] } : child; }) };
}

function fromNode(node: Node, path: string, marks: NonNullable<JSONContent["marks"]> = []): JSONContent[] {
  const attrs = node.attributes ?? {};
  const allowed = new Set(["type", "id", "attributes", "body", "children", "value", "position", "source", ...(AST_FIELDS[node.type] ?? [])]);
  for (const key of Object.keys(node)) if (!allowed.has(key)) fail(path, `AST field ${key}`);
  if ([node.body, node.children, node.value].filter(value => value !== undefined).length > 1) fail(path, "conflicting content fields");
  const check = (keys: string[] = []) => {
    for (const key of Object.keys(attrs)) if (!keys.includes(key)) fail(path, `attribute ${key}`);
    if (node.id && node.type !== "heading") fail(path, `ID on ${node.type}`);
  };
  const children = () => content(node).flatMap((child, index) => fromNode(child, `${path}.body[${index}]`));
  const inline = () => content(node).flatMap((child, index) => fromNode(child, `${path}.children[${index}]`, marks));
  const wrap = (type: string, attributes?: Record<string, unknown>): JSONContent[] => [{ type, ...(attributes ? { attrs: attributes } : {}), ...(content(node).length ? { content: children() } : {}) }];
  if (REVERSE_MARKS[node.type]) {
    check(node.type === "link" ? ["target", "rel", "class", "ref"] : []);
    if (node.type === "link" && attrs.ref !== undefined) {
      if (typeof attrs.ref !== "string" || !attrs.ref || node.title || attrs.class || content(node).some(child => child.type !== "text" || child.attributes || child.id)) fail(path, "formatted or invalid link reference");
      return [{ type: "loomaReference", attrs: { id: attrs.ref, kind: "link", href: node.url ?? "", label: text(node), target: attrs.target ?? "_self" }, ...(marks.length ? { marks } : {}) }];
    }
    const mark: NonNullable<JSONContent["marks"]>[number] = { type: REVERSE_MARKS[node.type] };
    if (node.type === "link") mark.attrs = { href: node.url ?? "", ...attrs, ...(typeof node.title === "string" ? { title: node.title } : {}) };
    else if (Object.keys(attrs).length) mark.attrs = { ...attrs };
    return content(node).flatMap((child, index) => fromNode(child, `${path}.children[${index}]`, [...marks, mark]));
  }
  switch (node.type) {
    case "text":
      check(); return node.value ? [{ type: "text", text: node.value, ...(marks.length ? { marks } : {}) }] : [];
    case "paragraph": {
      check();
      const items = content(node);
      if (items.length === 1 && items[0]?.type === "image") return fromNode(items[0], `${path}.children[0]`);
      if (items.some(child => child.type === "image")) fail(path, "image mixed with inline text (the default editor uses block images)");
      return [{ type: "paragraph", ...(items.length ? { content: inline() } : {}) }];
    }
    case "heading": check(); return [{ type: "heading", attrs: { level: node.level ?? 1, ...(node.id ? { id: node.id } : {}) }, ...(content(node).length ? { content: inline() } : {}) }];
    case "break": check(); return [{ type: "hardBreak", ...(marks.length ? { marks } : {}) }];
    case "softBreak": check(); return [{ type: "text", text: "\n", ...(marks.length ? { marks } : {}) }];
    case "horizontalRule": check(); return [{ type: "horizontalRule" }];
    case "blockquote": check(); return wrap("blockquote");
    case "list": check(); return [{ type: node.children?.some(child => child.checked !== undefined) ? "taskList" : node.ordered ? "orderedList" : "bulletList", ...(node.ordered ? { attrs: { start: node.start ?? 1 } } : {}), content: children() }];
    case "listItem": check(); return wrap(node.checked !== undefined ? "taskItem" : "listItem", node.checked !== undefined ? { checked: node.checked } : undefined);
    case "code": {
      check(Object.keys(attrs));
      const opening = stringify({ type: "document", version: 1, body: [{ ...node, value: "" }] }).split("\n")[0] ?? "";
      const information = opening.replace(/^`+|^~+/, "");
      const meta = information.slice(node.language?.length ?? 0).trim();
      return [{ type: "codeBlock", attrs: { language: node.language ?? null, ...(meta ? { meta } : {}) }, ...(node.value ? { content: [{ type: "text", text: node.value }] } : {}) }];
    }
    case "image": {
      check(["width", "height", "placement", "responsive"]);
      if (attrs.placement !== undefined && !["block", "center", "wrap-left", "wrap-right"].includes(String(attrs.placement))) fail(path, "unsupported image placement");
      if (attrs.responsive !== undefined && typeof attrs.responsive !== "boolean") fail(path, "nonboolean responsive flag");
      const result: Record<string, unknown> = { src: node.url ?? "", alt: node.alt ?? "", title: typeof node.title === "string" ? node.title : null };
      for (const key of ["width", "height"]) if (attrs[key] !== undefined) {
        const value = Number(attrs[key]); if (!Number.isFinite(value) || value <= 0) fail(path, `image ${key}`); result[key] = value;
      }
      for (const key of ["placement", "responsive"]) if (attrs[key] !== undefined) result[key] = attrs[key];
      return [{ type: "image", attrs: result }];
    }
    case "inline":
      if (node.children?.some(child => child.type !== "text" || child.id || child.attributes)) fail(path, "formatted inline label");
      if (node.subType === "mention") {
        check();
        return [{ type: "mention", attrs: { id: node.ref ?? null, label: text(node) }, ...(marks.length ? { marks } : {}) }];
      }
      if (node.subType === "chip") {
        check(["tone"]);
        if (attrs.tone !== undefined && !(LOOMA_CHIP_TONES as readonly unknown[]).includes(attrs.tone)) fail(path, "unsupported chip tone");
        return [{ type: "loomaChip", attrs: { label: text(node), color: attrs.tone ?? "neutral" }, ...(marks.length ? { marks } : {}) }];
      }
      return fail(path, `inline type ${node.subType}`);
    case "container": {
      const label = node.subType === "figure" ? "" : plainTitle(node.title, `${path}.title`);
      if (node.subType === "details") {
        check(["open"]);
        if (attrs.open !== undefined && typeof attrs.open !== "boolean") fail(path, "nonboolean disclosure flag");
        return wrap("loomaExpand", { summary: label || "Details", open: attrs.open === true });
      }
      if ((LOOMA_CALLOUT_TONES as readonly string[]).includes(node.subType ?? "")) { check(); return wrap("loomaCallout", { tone: node.subType, heading: label }); }
      if (node.subType === "tabs") {
        check(["group", "default", "queryString", "lazy"]);
        for (const key of ["group", "default", "queryString"]) {
          if (attrs[key] !== undefined && typeof attrs[key] !== "string") fail(path, `nonstring tab ${key}`);
        }
        if (attrs.lazy !== undefined && typeof attrs.lazy !== "boolean") fail(path, "nonboolean tab lazy flag");
        if (node.title) fail(path, "tab-group title");
        return wrap("loomaTabs", {
          group: attrs.group ?? "", codeGroup: false,
          ...(attrs.default !== undefined ? { defaultValue: attrs.default } : {}),
          ...(attrs.queryString !== undefined ? { queryString: attrs.queryString } : {}),
          ...(attrs.lazy !== undefined ? { lazy: attrs.lazy } : {}),
        });
      }
      if (node.subType === "tab") {
        check(["value"]);
        if (attrs.value !== undefined && typeof attrs.value !== "string") fail(path, "nonstring tab value");
        return wrap("loomaTab", { label, ...(attrs.value !== undefined ? { value: attrs.value } : {}) });
      }
      if (node.subType === "figure") {
        check();
        const only = node.body?.[0];
        const image = only?.type === "paragraph" && !only.id && !only.attributes && content(only).length === 1 ? content(only)[0] : only;
        if (node.body?.length !== 1 || image?.type !== "image") fail(path, "figure body other than one image");
        return [{ type: "loomaFigure", content: [...children(), { type: "loomaFigcaption", ...(typeof node.title === "object" && content(node.title).length ? { content: content(node.title).flatMap((child, index) => fromNode(child, `${path}.title[${index}]`)) } : {}) }] }];
      }
      if (node.subType === "toc") {
        check(["depth", "format"]);
        if (node.title) fail(path, "table-of-contents title");
        const depth = Number(attrs.depth ?? 3); const format = attrs.format ?? "plain";
        if (![1, 2, 3].includes(depth) || !["plain", "bulleted", "numbered"].includes(String(format))) fail(path, "table-of-contents settings");
        return wrap("loomaTableOfContents", { depth, format });
      }
      return fail(path, `container type ${node.subType}`);
    }
    case "table": {
      check(); if (node.title) fail(path, "table caption");
      if (!node.align) return wrap("table");
      let column = 0;
      const rows = (node.children ?? []).map(row => { column = 0; return { ...row, children: row.children?.map(cell => {
        const align = node.align?.[column]; column += cell.colSpan ?? 1;
        return { ...cell, ...(align && !cell.attributes?.textAlign ? { attributes: { ...cell.attributes, textAlign: align } } : {}) };
      }) }; });
      return [{ type: "table", content: rows.flatMap((row, index) => fromNode(row, `${path}.children[${index}]`)) }];
    }
    case "tableRow": check(); return wrap("tableRow");
    case "tableCell": {
      check(["columnWidths", "textAlign", "backgroundColor"]);
      if (attrs.textAlign !== undefined && !["left", "center", "right"].includes(String(attrs.textAlign))) fail(path, "unsupported table alignment");
      if (attrs.columnWidths !== undefined && (typeof attrs.columnWidths !== "string" || !/^\d+(?:,\d+)*$/.test(attrs.columnWidths))) fail(path, "column widths");
      const widths = typeof attrs.columnWidths === "string" ? attrs.columnWidths.split(",").map(Number) : null;
      if (widths?.some(value => !Number.isFinite(value) || value < 0)) fail(path, "column widths");
      return [{ type: node.header ? "tableHeader" : "tableCell", attrs: { colspan: node.colSpan ?? 1, rowspan: node.rowSpan ?? 1, colwidth: widths, textAlign: attrs.textAlign ?? null, backgroundColor: attrs.backgroundColor ?? null }, content: node.body ? children() : [{ type: "paragraph", ...(content(node).length ? { content: inline() } : {}) }] }];
    }
    default: return fail(path, `AST type ${node.type}`);
  }
}

/**
 * Maps supported Expressive Markdown content into the Looma editor's saved JSON shape.
 * @contract The editor schema cannot represent arbitrary format extensions; unsupported meanings fail explicitly.
 */
export function expressmarkToEditorDocument(document: Document): JSONContent {
  if (document.type !== "document" || document.version !== 1) fail("document", "unsupported document version");
  if (document.title || document.id || Object.keys(document.metadata ?? {}).length || Object.keys(document.attributes ?? {}).length) fail("document", "document metadata (store it alongside editor content)");
  try { stringify(document); }
  catch (error) { fail("document", `invalid Expressive Markdown AST (${error instanceof Error ? error.message : "conversion failed"})`); }
  // Validate only values this adapter interprets as native CSS/navigation.
  // Unknown inert extension strings remain an unsupported-feature concern.
  const colors = new Set<unknown>(); const urls = new Set<string>();
  const visit = (node: Node) => {
    if (node.type === "tableCell" && node.attributes?.backgroundColor !== undefined && !colors.has(node.attributes.backgroundColor)) {
      safeBackground(node.attributes.backgroundColor, "document"); colors.add(node.attributes.backgroundColor);
    }
    if (node.type === "link" || node.type === "image") {
      const key = `${node.type}:${node.url}`;
      if (!urls.has(key)) { safeNavigation(node.url, node.type === "image", "document"); urls.add(key); }
    }
    for (const child of node.body ?? node.children ?? []) visit(child);
    if (typeof node.title === "object") visit(node.title);
  };
  visit(document);
  return { type: "doc", content: document.body.flatMap((node, index) => fromNode(node, `document.body[${index}]`)) };
}

/**
 * Writes an editor document using Expressmark's shared parser/writer and safe HTML policy.
 * @failure Unsupported editor data raises EditorMarkdownConversionError before any input is changed.
 */
export function editorDocumentToMarkdown(document: JSONContent, options: EditorMarkdownConversionOptions = {}): string {
  return stringify(editorDocumentToExpressmark(document, options), options);
}

/**
 * Serializes the current editor, including its current display cache and concrete TOC entries.
 * @failure Unsupported content throws EditorMarkdownConversionError without changing the document.
 */
export function editorToMarkdown(editor: Editor, options: ConversionOptions = {}): string {
  return editorDocumentToMarkdown(editor.getJSON(), { ...options, references: getReferenceDisplay(editor) });
}

/**
 * Parses Expressive Markdown into editable JSON for the supported editor schema.
 * @failure Unsupported content or root metadata stops conversion instead of being silently flattened.
 */
export function markdownToEditorDocument(markdown: string, options: ConversionOptions = {}): JSONContent {
  return expressmarkToEditorDocument(parse(markdown, options));
}
