import { Node } from "@tiptap/core";

/**
 * Canonical tone values that may be persisted in a Looma callout node: the shared block
 * vocabulary of Callout, Markdown `:::` containers and GitHub alerts.
 */
export const LOOMA_CALLOUT_TONES = ["note", "tip", "info", "important", "warning", "danger"] as const;

/** A serialized callout tone; unsupported input is normalized to `note`. */
export type LoomaCalloutTone = (typeof LOOMA_CALLOUT_TONES)[number];

// Callout's aliases: caution is danger, and neutral is the same muted aside as note.
const TONE_ALIASES: Record<string, LoomaCalloutTone> = { caution: "danger", neutral: "note" };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaCallout: {
      /** Wrap the current block in a semantic Looma callout, or retone its existing callout. */
      setLoomaCallout: (tone?: LoomaCalloutTone) => ReturnType;
    };
  }
}

/** Maps a tone name, alias, or unknown value onto a persisted tone. */
export function normalizeLoomaCalloutTone(value: unknown): LoomaCalloutTone {
  if (typeof value !== "string") return "note";
  const tone = value.toLowerCase();
  return LOOMA_CALLOUT_TONES.includes(tone as LoomaCalloutTone) ? tone as LoomaCalloutTone : TONE_ALIASES[tone] ?? "note";
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
