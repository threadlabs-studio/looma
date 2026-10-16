import { Node } from "@tiptap/core";
import { LOOMA_CALLOUT_TONES, normalizeLoomaCalloutTone, type LoomaCalloutTone } from "../../markdown";

// The tones are Looma Markdown's vocabulary; the editor re-exports them.
export { LOOMA_CALLOUT_TONES, normalizeLoomaCalloutTone, type LoomaCalloutTone };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaCallout: {
      /** Wrap the current block in a semantic Looma callout, or retone its existing callout. */
      setLoomaCallout: (tone?: LoomaCalloutTone) => ReturnType;
    };
  }
}

/**
 * A durable block container for informational editor content, saved as Looma's Callout.
 *
 * @invariant Rendered `tone` values always belong to `LOOMA_CALLOUT_TONES`; missing or
 * unknown values round-trip as `note`. Content saved as the older
 * `aside[data-looma-callout][data-tone]` still parses.
 */
export const LoomaCallout = Node.create({
  name: "loomaCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "note",
        parseHTML: (element) => normalizeLoomaCalloutTone(element.getAttribute("tone") ?? element.getAttribute("data-tone")),
        renderHTML: (attributes) => ({ tone: normalizeLoomaCalloutTone(attributes.tone) }),
      },
      heading: {
        default: "",
        parseHTML: (element) => element.getAttribute("heading") ?? "",
        renderHTML: (attributes) => (attributes.heading ? { heading: String(attributes.heading) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "ui-callout" }, { tag: "aside[data-looma-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["ui-callout", HTMLAttributes, 0];
  },

  addCommands() {
    return {
      setLoomaCallout: (tone = "note") => ({ state, commands }) => {
        const normalizedTone = normalizeLoomaCalloutTone(tone);
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
