import { type AnyExtension } from "@tiptap/core";
import Image from "@tiptap/extension-image";

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
      width: {
        default: null,
        parseHTML: element => normalizeImageDimension(Number(element.getAttribute("width"))) ?? null,
        renderHTML: attrs => normalizeImageDimension(attrs.width) ? { width: attrs.width } : {},
      },
      height: {
        default: null,
        parseHTML: element => normalizeImageDimension(Number(element.getAttribute("height"))) ?? null,
        renderHTML: attrs => normalizeImageDimension(attrs.height) ? { height: attrs.height } : {},
      },
      responsive: {
        default: null,
        parseHTML: element => element.hasAttribute("data-looma-responsive") || null,
        renderHTML: attrs => attrs.responsive === true ? { "data-looma-responsive": "" } : {},
      },
      placement: {
        default: "block",
        parseHTML: element => normalizeImagePlacement(element.getAttribute("data-placement")),
        renderHTML: attrs => normalizeImagePlacement(attrs.placement) === "block" ? {} : { "data-placement": normalizeImagePlacement(attrs.placement) },
      },
    };
  },
});
