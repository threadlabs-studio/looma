import { mergeAttributes, type AnyExtension } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { imageHtmlSpec, readPictureHtml } from "../image-sources";
import { createImageMedia, imageDeliveryAttributes } from "../image-media";
export { imageSourceUrls, mapImageSourceUrls, normalizeImageSources, type LoomaImageSource } from "../image-sources";

/** Both forms use the same portable image attributes and host image controls. */
export const isLoomaImageName = (name: string | undefined) => name === "image" || name === "loomaInlineImage";
const imageElement = (element: HTMLElement) => element.tagName === "PICTURE" ? element.querySelector("img") ?? element : element;

/** Durable image placement; wrapping applies to block images in reading content. */
export type LoomaImagePlacement = "block" | "center" | "wrap-left" | "wrap-right";

/** Accepts only positive, integral CSS-pixel dimensions. */
export function normalizeImageDimension(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

/** Unknown legacy values retain ordinary block placement. */
export function normalizeImagePlacement(value: unknown): LoomaImagePlacement {
  return value === "center" || value === "wrap-left" || value === "wrap-right" ? value : "block";
}

/** Portable image attributes shared by every editor adapter.
 * @contract Keeps Tiptap's existing `image` name and insertion command. Delivery
 * attributes stay transient; dimensions and placement survive HTML and JSON.
 */
export const LoomaImage: AnyExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null, parseHTML: element => imageElement(element).getAttribute("src") },
      alt: { default: null, parseHTML: element => imageElement(element).getAttribute("alt") },
      title: { default: null, parseHTML: element => imageElement(element).getAttribute("title") },
      sources: {
        default: null,
        parseHTML: element => element.tagName === "PICTURE" ? readPictureHtml(element.outerHTML)?.sources ?? null : null,
        renderHTML: () => ({}),
      },
      width: {
        default: null,
        parseHTML: element => normalizeImageDimension(Number(imageElement(element).getAttribute("width"))) ?? null,
        renderHTML: attrs => normalizeImageDimension(attrs.width) ? { width: attrs.width } : {},
      },
      height: {
        default: null,
        parseHTML: element => normalizeImageDimension(Number(imageElement(element).getAttribute("height"))) ?? null,
        renderHTML: attrs => normalizeImageDimension(attrs.height) ? { height: attrs.height } : {},
      },
      responsive: {
        default: null,
        parseHTML: element => imageElement(element).hasAttribute("data-looma-responsive") || null,
        renderHTML: attrs => attrs.responsive === true ? { "data-looma-responsive": "" } : {},
      },
      placement: {
        default: "block",
        parseHTML: element => normalizeImagePlacement(imageElement(element).getAttribute("data-placement")),
        renderHTML: attrs => normalizeImagePlacement(attrs.placement) === "block" ? {} : { "data-placement": normalizeImagePlacement(attrs.placement) },
      },
    };
  },
  parseHTML() {
    return [{ tag: "picture", getAttrs: element => readPictureHtml(element.outerHTML) ?? false }, ...(this.parent?.() ?? [])];
  },
  renderHTML({ node, HTMLAttributes }) {
    if (!node.attrs.sources && this.name === "image") return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    return imageHtmlSpec(node.attrs, this.name === "loomaInlineImage");
  },
});

/** Imported inline images retain their text position.
 * @contract Uses the same durable attributes as a block image without overriding its insertion command.
 */
export const LoomaInlineImage: AnyExtension = LoomaImage.extend({
  name: "loomaInlineImage",
  priority: 1100,
  parseHTML() {
    return [{ tag: "picture[data-looma-inline-image]", getAttrs: element => readPictureHtml(element.outerHTML) ?? false }, { tag: "img[data-looma-inline-image]" }];
  },
  addCommands: () => ({}),
  addInputRules: () => [],
  addNodeView() {
    return ({ node, decorations }) => {
      const media = createImageMedia();
      media.dom.setAttribute("data-looma-inline-image", "");
      media.write(node.attrs, imageDeliveryAttributes(decorations));
      return {
        dom: media.dom,
        update(next, nextDecorations) {
          if (next.type !== node.type) return false;
          media.write(next.attrs, imageDeliveryAttributes(nextDecorations));
          return true;
        },
        ignoreMutation: mutation => mutation.type !== "selection",
      };
    };
  },
}).configure({ inline: true });
