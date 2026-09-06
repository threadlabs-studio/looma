import { mergeAttributes, Node } from "@tiptap/core";

export const LOOMA_CALLOUT_TONES = ["info", "note", "warning"] as const;

export type LoomaCalloutTone = (typeof LOOMA_CALLOUT_TONES)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaCallout: {
      /** Wrap the current block in a semantic Looma callout, or retone its existing callout. */
      setLoomaCallout: (tone?: LoomaCalloutTone) => ReturnType;
    };
  }
}

function normalizeCalloutTone(value: unknown): LoomaCalloutTone {
  return typeof value === "string"
    && LOOMA_CALLOUT_TONES.includes(value as LoomaCalloutTone)
    ? value as LoomaCalloutTone
    : "note";
}

/** A durable, themeable block container for informational editor content. */
export const LoomaCallout = Node.create({
  name: "loomaCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "note",
        parseHTML: (element) => normalizeCalloutTone(element.getAttribute("data-tone")),
        renderHTML: (attributes) => ({
          "data-tone": normalizeCalloutTone(attributes.tone),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-looma-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-looma-callout": "",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setLoomaCallout: (tone = "note") => ({ state, commands }) => {
        const normalizedTone = normalizeCalloutTone(tone);
        for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
          if (state.selection.$from.node(depth).type.name === this.name) {
            return commands.updateAttributes(this.name, { tone: normalizedTone });
          }
        }
        return commands.wrapIn(this.name, { tone: normalizedTone });
      },
    };
  },
});
