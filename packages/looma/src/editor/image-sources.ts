import { parseDocument } from "htmlparser2";
import parseSrcset from "parse-srcset";
import { renderHtml } from "expressmark/render";
import type { DOMOutputSpec } from "@tiptap/pm/model";

/** Authored image choices are durable content, independent of host delivery renditions. */
export interface LoomaImageSource {
  srcset: string;
  media?: string;
  type?: string;
  width?: number;
  height?: number;
}

const escape = (value: unknown) => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attributes = (value: Record<string, unknown>) => Object.entries(value).filter(([, value]) => value !== null && value !== undefined && value !== false).map(([name, value]) => ` ${name}="${escape(value)}"`).join("");
const safeUrl = (url: string) => {
  const html = renderHtml({ type: "document", version: 1, body: [{ type: "image", url, alt: "" }] });
  const image = parseDocument(html).children.find(node => "name" in node && node.name === "img");
  if (!image || !("attribs" in image) || image.attribs.src !== url) throw new Error("Unsafe image source URL");
};

/** Validate every candidate with the maintained srcset parser and documentation URL profile. */
export function normalizeImageSources(value: unknown): LoomaImageSource[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Image sources must be an array");
  return value.map(source => {
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Invalid image source");
    for (const key of Object.keys(source)) if (!["srcset", "media", "type", "width", "height"].includes(key)) throw new Error(`Unsupported image source attribute ${key}`);
    if (typeof source.srcset !== "string" || !source.srcset.trim()) throw new Error("Image source needs srcset");
    for (const key of ["media", "type"]) if (source[key] !== undefined && typeof source[key] !== "string") throw new Error(`Invalid image source ${key}`);
    for (const key of ["width", "height"]) if (source[key] !== undefined && (!Number.isSafeInteger(source[key]) || source[key] <= 0)) throw new Error(`Invalid image source ${key}`);
    const candidates = parseSrcset(source.srcset);
    if (!candidates.length) throw new Error("Image source has no usable candidates");
    candidates.forEach(candidate => safeUrl(candidate.url));
    return { ...source } as LoomaImageSource;
  });
}

/** All authored alternatives, for host authorization and asset rewriting. */
export function imageSourceUrls(value: unknown): string[] {
  return normalizeImageSources(value).flatMap(source => parseSrcset(source.srcset).map(candidate => candidate.url));
}

/** Rewrite authored candidates with the same parser used for validation.
 * @ownership Returns new sources; the caller owns URL allocation and the input stays unchanged.
 * @failure Rejects unsafe URLs and rewrites that change candidate boundaries or descriptors.
 */
export function mapImageSourceUrls(value: unknown, rewrite: (url: string) => string): LoomaImageSource[] {
  return normalizeImageSources(value).map(source => {
    let changed = false;
    const candidates = parseSrcset(source.srcset).map(candidate => {
      const url = rewrite(candidate.url);
      if (typeof url !== "string" || !url) throw new Error("Image rewrite needs a URL");
      safeUrl(url);
      changed ||= url !== candidate.url;
      return { ...candidate, url };
    });
    if (!changed) return source;
    const srcset = candidates.map(candidate => [candidate.url,
      ...(candidate.w === undefined ? [] : [`${candidate.w}w`]),
      ...(candidate.h === undefined ? [] : [`${candidate.h}h`]),
      ...(candidate.d === undefined ? [] : [`${candidate.d}x`]),
    ].join(" ")).join(", ");
    if (JSON.stringify(parseSrcset(srcset)) !== JSON.stringify(candidates)) throw new Error("Image rewrite changes srcset candidates");
    return { ...source, srcset };
  });
}

/** Read one safe native picture without reducing its sources to the fallback image. */
export function readPictureHtml(value: string): Record<string, unknown> | null {
  const html = renderHtml({ type: "document", version: 1, syntax: "compatible", body: [{ type: "html", display: "block", value }] });
  const nodes = parseDocument(html).children.filter(node => node.type !== "text" || node.data.trim());
  const picture = nodes[0];
  if (nodes.length !== 1 || !picture || picture.type !== "tag" || picture.name !== "picture") return null;
  if (Object.keys(picture.attribs).some(key => key !== "data-looma-inline-image")) throw new Error("Unsupported picture attributes");
  const sources: LoomaImageSource[] = [];
  let image: Record<string, string> | undefined;
  for (const child of picture.children) {
    if (child.type === "text" && !child.data.trim()) continue;
    if (child.type !== "tag") throw new Error("Unsupported picture content");
    if (child.name === "source" && !image) {
      const source: Record<string, unknown> = { ...child.attribs };
      for (const key of ["width", "height"]) if (source[key] !== undefined) source[key] = Number(source[key]);
      sources.push(...normalizeImageSources([source]));
    } else if (child.name === "img" && !image) image = child.attribs;
    else throw new Error("Picture needs sources followed by one fallback image");
  }
  if (!image?.src) throw new Error("Picture needs a fallback source");
  for (const key of Object.keys(image)) if (!["src", "alt", "title", "width", "height", "data-placement", "data-looma-responsive", "data-looma-inline-image"].includes(key)) throw new Error(`Unsupported picture image attribute ${key}`);
  safeUrl(image.src);
  for (const key of ["width", "height"]) if (image[key] !== undefined && (!Number.isSafeInteger(Number(image[key])) || Number(image[key]) <= 0)) throw new Error(`Invalid picture image ${key}`);
  if (image["data-placement"] !== undefined && !["block", "center", "wrap-left", "wrap-right"].includes(image["data-placement"])) throw new Error("Invalid picture image placement");
  return { src: image.src, alt: image.alt ?? "", title: image.title ?? null,
    width: image.width === undefined ? null : Number(image.width), height: image.height === undefined ? null : Number(image.height),
    placement: image["data-placement"] ?? "block", responsive: image["data-looma-responsive"] === undefined ? null : true,
    sources: sources.length ? sources : null };
}

/** Native image markup shared by HTML serialization and Markdown interchange. */
export function imageHtmlSpec(attrs: Record<string, unknown>, inline = false): DOMOutputSpec {
  if (typeof attrs.src !== "string") throw new Error("Image needs a source");
  safeUrl(attrs.src);
  const sources = normalizeImageSources(attrs.sources);
  const image: Record<string, unknown> = { src: attrs.src, alt: attrs.alt ?? "", ...(attrs.title ? { title: attrs.title } : {}) };
  for (const key of ["width", "height"]) if (attrs[key] !== null && attrs[key] !== undefined) {
    if (!Number.isSafeInteger(attrs[key]) || Number(attrs[key]) <= 0) throw new Error(`Invalid image ${key}`);
    image[key] = attrs[key];
  }
  if (attrs.placement && attrs.placement !== "block") image["data-placement"] = attrs.placement;
  if (attrs.responsive === true) image["data-looma-responsive"] = "";
  if (!sources.length) return ["img", { ...image, ...(inline ? { "data-looma-inline-image": "" } : {}) }];
  return ["picture", inline ? { "data-looma-inline-image": "" } : {}, ...sources.map((source): DOMOutputSpec => ["source", { ...source }]), ["img", image]];
}

export function pictureHtml(attrs: Record<string, unknown>, inline = false): string {
  const spec = imageHtmlSpec(attrs, inline);
  const write = (node: DOMOutputSpec): string => {
    if (!Array.isArray(node)) throw new Error("Unexpected image HTML shape");
    const [tag, attrs, ...children] = node;
    return `<${tag}${attributes(attrs as Record<string, unknown>)}>${children.map(child => write(child as DOMOutputSpec)).join("")}${tag === "img" || tag === "source" ? "" : `</${tag}>`}`;
  };
  return write(spec);
}
