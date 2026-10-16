import { Node } from "@tiptap/core";

/**
 * An image with a caption, saved as `<figure><img><figcaption>` and written in Looma Markdown as
 * `::: figure Caption`. The caption is inline content the author edits in place.
 * @invariant A figure holds exactly one block image and one caption; an empty caption stays empty.
 */
export const LoomaFigure = Node.create({
  name: "loomaFigure",
  group: "block",
  content: "image loomaFigcaption",
  defining: true,
  parseHTML() {
    return [{ tag: "figure", getAttrs: element => element.querySelector(":scope > img") ? null : false }];
  },
  renderHTML() {
    return ["figure", 0];
  },
});

/**
 * A figure's caption: inline content under its image.
 * @invariant It exists only as the second child of `LoomaFigure`.
 */
export const LoomaFigcaption = Node.create({
  name: "loomaFigcaption",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: "figcaption" }];
  },
  renderHTML() {
    return ["figcaption", 0];
  },
});
