import { Node } from "@tiptap/core";

/** The six palette values a chip may persist; other values fall back to neutral. */
export const LOOMA_CHIP_COLORS = ["neutral", "blue", "green", "yellow", "red", "purple"] as const;

/** A persisted chip color shared by the headless extension and its editor UI. */
export type LoomaChipColor = typeof LOOMA_CHIP_COLORS[number];

const CHIP_PLACEHOLDER = "Set a label";

/** Keep imported or programmatic colors within the supported palette. */
export function normalizeLoomaChipColor(value: unknown): LoomaChipColor {
  return LOOMA_CHIP_COLORS.includes(value as LoomaChipColor) ? value as LoomaChipColor : "neutral";
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaChip: {
      /** Replace selected text, or insert at the caret, with an inline chip. */
      insertLoomaChip: (attributes?: { label?: string; color?: LoomaChipColor }) => ReturnType;
    };
  }
}

/**
 * An inline, atomic label. The editor's popover edits its attributes; its text
 * remains available in serialized HTML and plain-text copy.
 *
 * @invariant Only the label and a supported palette color enter document state;
 * the clickable node view never stores its transient popover controls.
 */
export const LoomaChip = Node.create({
  name: "loomaChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: { default: "", parseHTML: (element: HTMLElement) => element.getAttribute("data-label")
        ?? (element.hasAttribute("data-placeholder") ? "" : element.textContent ?? "") },
      color: { default: "neutral", parseHTML: (element: HTMLElement) => normalizeLoomaChipColor(element.getAttribute("data-color")) },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-looma-chip]" }];
  },

  renderHTML({ node }) {
    const label = String(node.attrs.label ?? "");
    const color = normalizeLoomaChipColor(node.attrs.color);
    return ["span", {
      "data-looma-chip": "",
      "data-label": label,
      "data-color": color,
      ...(label ? {} : { "data-placeholder": "" }),
    }, label || CHIP_PLACEHOLDER];
  },

  renderText({ node }) {
    return String(node.attrs.label ?? "");
  },

  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement("span");
      dom.dataset.loomaChip = "";
      dom.contentEditable = "false";
      dom.setAttribute("role", "button");
      dom.setAttribute("aria-disabled", String(!editor.isEditable));
      dom.tabIndex = 0;
      const update = (next: typeof node) => {
        if (next.type !== node.type) return false;
        const label = String(next.attrs.label ?? "");
        if (dom.dataset.label !== label) {
          dom.dataset.label = label;
          dom.textContent = label || CHIP_PLACEHOLDER;
          dom.setAttribute("aria-label", label ? `Edit chip: ${label}` : "Set chip label");
          if (label) delete dom.dataset.placeholder;
          else dom.dataset.placeholder = "";
        }
        const color = normalizeLoomaChipColor(next.attrs.color);
        if (dom.dataset.color !== color) dom.dataset.color = color;
        return true;
      };
      update(node);
      return { dom, update, stopEvent: (event) => event.type === "click" || event.type === "keydown" };
    };
  },

  addCommands() {
    return {
      insertLoomaChip: (attributes = {}) => ({ commands, state }) => {
        const selection = state.selection;
        const label = attributes.label ?? state.doc.textBetween(selection.from, selection.to);
        return commands.insertContent({ type: this.name, attrs: { label, color: normalizeLoomaChipColor(attributes.color) } });
      },
    };
  },
});
