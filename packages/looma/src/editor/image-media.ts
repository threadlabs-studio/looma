import type { Decoration } from "@tiptap/pm/view";
import { normalizeImageSources } from "./image-sources";

type Attributes = Record<string, unknown>;

/** Read the host's transient attributes without adding them to the authored document. */
export const imageDeliveryAttributes = (decorations: readonly Decoration[]): Attributes =>
  Object.assign({}, ...decorations.map(decoration => (decoration.spec as { loomaImageAttributes?: Attributes }).loomaImageAttributes ?? {}));

/** Projects authored choices and transient delivery onto their native source/img elements. */
export function createImageMedia() {
  const dom = document.createElement("picture");
  const image = document.createElement("img");
  dom.append(image);
  let sourceKey = "";
  let written = new Set<string>();
  return {
    dom,
    write(attrs: Attributes, delivery: Attributes) {
      const sources = normalizeImageSources(attrs.sources);
      const key = JSON.stringify(sources);
      if (key !== sourceKey) {
        for (const child of dom.querySelectorAll(":scope > source")) child.remove();
        for (const values of sources) {
          const source = document.createElement("source");
          for (const [name, value] of Object.entries(values)) source.setAttribute(name, String(value));
          dom.insertBefore(source, image);
        }
        sourceKey = key;
      }
      const next = Object.entries({ src: attrs.src, alt: attrs.alt ?? "", title: attrs.title, width: attrs.width, height: attrs.height, ...delivery })
        .filter(([, value]) => value !== undefined && value !== null && value !== false);
      const names = new Set(next.map(([name]) => name));
      for (const name of written) if (!names.has(name)) image.removeAttribute(name);
      for (const [name, value] of next) {
        const text = value === true ? "" : String(value);
        if (image.getAttribute(name) !== text) image.setAttribute(name, text);
      }
      written = names;
    },
  };
}
