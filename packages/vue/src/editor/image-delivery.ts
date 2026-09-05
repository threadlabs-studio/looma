import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { OverlayTrigger } from "@threadlabs/looma-core";

export interface LoomaImageDescriptor {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
}

/** Browser-only attributes resolved by a host image-delivery provider. */
export interface LoomaImageRenditionAttributes {
  src?: string;
  srcset?: string;
  sizes?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "auto" | "high" | "low";
}

export type LoomaImageAttributeResolver = (
  image: LoomaImageDescriptor,
) => LoomaImageRenditionAttributes | undefined;

export type LoomaImageActivationTrigger = Exclude<OverlayTrigger, "programmatic">;

export interface LoomaImageActivationDetail extends LoomaImageDescriptor {
  trigger: LoomaImageActivationTrigger;
}

export interface LoomaImageRenditionErrorDetail extends LoomaImageDescriptor {
  trigger: "programmatic";
}

interface LoomaImageDeliveryExtensionOptions {
  resolveAttributes: () => LoomaImageAttributeResolver | undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function normalizeImageDimension(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

export function imageDescriptorFromAttrs(attrs: Record<string, unknown>): LoomaImageDescriptor | null {
  const src = optionalString(attrs.src);
  if (!src) return null;
  const alt = typeof attrs.alt === "string" ? attrs.alt : undefined;
  const width = normalizeImageDimension(attrs.width);
  const height = normalizeImageDimension(attrs.height);
  return {
    src,
    ...(alt !== undefined ? { alt } : {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...(attrs.responsive === true ? { responsive: true } : {}),
  };
}

function transientAttributes(
  resolver: LoomaImageAttributeResolver | undefined,
  image: LoomaImageDescriptor,
): Record<string, string> {
  const attributes: Record<string, string> = {
    "aria-label": image.alt ? `Open image: ${image.alt}` : "Open image",
    "data-looma-image": "",
    role: "button",
    src: image.src,
    tabindex: "0",
  };
  if (!image.responsive || !resolver) return attributes;

  let rendition: LoomaImageRenditionAttributes | undefined;
  try {
    rendition = resolver(image);
  } catch {
    return attributes;
  }
  if (!rendition) return attributes;

  const src = optionalString(rendition.src);
  const srcset = optionalString(rendition.srcset);
  const sizes = optionalString(rendition.sizes);
  if (src) attributes.src = src;
  if (srcset) attributes.srcset = srcset;
  if (sizes) attributes.sizes = sizes;
  if (rendition.loading === "eager" || rendition.loading === "lazy") {
    attributes.loading = rendition.loading;
  }
  if (["async", "auto", "sync"].includes(rendition.decoding ?? "")) {
    attributes.decoding = rendition.decoding!;
  }
  if (["auto", "high", "low"].includes(rendition.fetchPriority ?? "")) {
    attributes.fetchpriority = rendition.fetchPriority!;
  }
  if ((src && src !== image.src) || srcset) attributes["data-looma-rendition"] = "true";
  return attributes;
}

function createDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  resolver: LoomaImageAttributeResolver | undefined,
  failedRenditions: Set<string>,
): DecorationSet {
  const decorations: Decoration[] = [];
  const currentSources = new Set<string>();
  doc.descendants((node, position) => {
    if (node.type.name !== "image") return;
    const image = imageDescriptorFromAttrs(node.attrs);
    if (!image) return;
    currentSources.add(image.src);
    decorations.push(Decoration.node(
      position,
      position + node.nodeSize,
      transientAttributes(failedRenditions.has(image.src) ? undefined : resolver, image),
    ));
  });
  for (const src of failedRenditions) {
    if (!currentSources.has(src)) failedRenditions.delete(src);
  }
  return DecorationSet.create(doc, decorations);
}

function rangeContainsImage(doc: ProseMirrorNode, from: number, to: number): boolean {
  const start = Math.max(0, Math.min(from - 1, doc.content.size));
  const end = Math.max(start, Math.min(to + 1, doc.content.size));
  let found = false;
  doc.nodesBetween(start, end, (node) => {
    if (node.type.name !== "image") return !found;
    found = true;
    return false;
  });
  return found;
}

function transactionChangesImages(transaction: Transaction): boolean {
  let changed = false;
  transaction.mapping.maps.forEach((stepMap) => {
    stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
      if (
        rangeContainsImage(transaction.before, oldStart, oldEnd)
        || rangeContainsImage(transaction.doc, newStart, newEnd)
      ) changed = true;
    });
  });
  return changed;
}

export function createLoomaImageDeliveryController(
  options: LoomaImageDeliveryExtensionOptions,
): {
  extension: Extension;
  markRenditionFailed: (editor: Editor, src: string) => boolean;
  reset: (editor: Editor) => void;
} {
  const pluginKey = new PluginKey<DecorationSet>("looma-image-delivery");
  const failedRenditions = new Set<string>();
  const refresh = (editor: Editor) => {
    editor.view.dispatch(editor.state.tr.setMeta(pluginKey, true));
  };
  const extension = Extension.create({
    name: "loomaImageDelivery",
    addGlobalAttributes() {
      return [{
        types: ["image"],
        attributes: {
          width: {
            default: null,
            parseHTML: (element) => normalizeImageDimension(Number(element.getAttribute("width"))) ?? null,
            renderHTML: (attributes) => normalizeImageDimension(attributes.width)
              ? { width: normalizeImageDimension(attributes.width) }
              : {},
          },
          height: {
            default: null,
            parseHTML: (element) => normalizeImageDimension(Number(element.getAttribute("height"))) ?? null,
            renderHTML: (attributes) => normalizeImageDimension(attributes.height)
              ? { height: normalizeImageDimension(attributes.height) }
              : {},
          },
          responsive: {
            default: null,
            parseHTML: (element) => element.hasAttribute("data-looma-responsive") || null,
            renderHTML: (attributes) => attributes.responsive === true
              ? { "data-looma-responsive": "" }
              : {},
          },
        },
      }];
    },
    addProseMirrorPlugins() {
      return [new Plugin<DecorationSet>({
        key: pluginKey,
        state: {
          init: (_, state) => createDecorations(
            state.doc,
            options.resolveAttributes(),
            failedRenditions,
          ),
          apply: (transaction, previous) => {
            if (!transaction.getMeta(pluginKey) && !transactionChangesImages(transaction)) {
              return previous.map(transaction.mapping, transaction.doc);
            }
            return createDecorations(
              transaction.doc,
              options.resolveAttributes(),
              failedRenditions,
            );
          },
        },
        props: {
          decorations: (state) => pluginKey.getState(state),
        },
      })];
    },
  });
  return {
    extension,
    markRenditionFailed: (editor, src) => {
      if (failedRenditions.has(src)) return false;
      failedRenditions.add(src);
      refresh(editor);
      return true;
    },
    reset: (editor) => {
      failedRenditions.clear();
      refresh(editor);
    },
  };
}

export function imageUploadContent(
  image: LoomaImageDescriptor,
): JSONContent {
  return {
    type: "image",
    attrs: {
      src: image.src,
      alt: image.alt,
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
      ...(image.responsive === true ? { responsive: true } : {}),
    },
  };
}
