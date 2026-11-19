import { InputRule, Mark, markInputRule, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    loomaMath: {
      /** Turn the selection, or the text typed next, into inline math. */
      toggleLoomaMath: () => ReturnType;
    };
  }
}

// Typed `$x$` becomes math under Expressive Markdown's delimiter rules: no space
// just inside either dollar sign, and no `$` or backslash before the opener.
// Undo restores the typed dollars, so a price range such as `$5–$` is one undo away.
const TYPED_MATH = /(?<![$\\])\$([^\s$](?:[^$]*[^\s$\\])?)\$$/;

/**
 * Text replacements such as `^2` → ² or `->` → → would rewrite TeX typed before
 * its closing `$`. They wait while a `$` earlier in the paragraph is unclosed.
 * ponytail: counts unescaped single dollars, so text after one unpaired price skips replacements too.
 */
export function outsideOpenMath(rules: InputRule[]): InputRule[] {
  return rules.map(rule => new InputRule({
    find: rule.find,
    handler: props => {
      const $from = props.state.doc.resolve(props.range.from);
      const before = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc").replace(/\\[\s\S]|\$\$+/g, "");
      return (before.match(/\$/g)?.length ?? 0) % 2 ? null : rule.handler(props);
    },
  }));
}

/**
 * Rendered math from another page carries its TeX in a MathML annotation:
 * Wikipedia's MathML, KaTeX (GitHub, ChatGPT, Claude) and Temml all do. Replace
 * each such formula, with any visual copy beside it, by its notation.
 * ponytail: MathML without a TeX annotation pastes as its text; convert MathML to TeX if that matters.
 */
export function pastedMathHtml(html: string): string {
  if (!html.includes("<math")) return html;
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const math of Array.from(document.querySelectorAll("math"))) {
    if (!math.isConnected) continue;
    const tex = math.querySelector('annotation[encoding="application/x-tex"]')?.textContent?.trim();
    if (!tex) continue;
    const wrapper = math.closest(".katex-display") ?? math.closest(".katex, mjx-container");
    const display = math.getAttribute("display") === "block" || wrapper?.classList.contains("katex-display") || wrapper?.getAttribute("display") === "true";
    const code = document.createElement("code");
    code.className = "language-math";
    code.textContent = tex;
    let replacement: HTMLElement = code;
    if (display) { replacement = document.createElement("pre"); replacement.append(code); }
    else code.setAttribute("data-looma-math", "");
    (wrapper ?? math).replaceWith(replacement);
  }
  return document.body.innerHTML;
}

/**
 * Inline math: a range of TeX notation, shown as written with a subtle tint.
 * Display math is a code block with the `math` language.
 */
export const LoomaMath = Mark.create({
  name: "loomaMath",
  code: true,
  excludes: "_",
  exitable: true,

  parseHTML() {
    return [{ tag: "code[data-looma-math]" }, { tag: "code.language-math" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["code", mergeAttributes(HTMLAttributes, { class: "language-math", "data-looma-math": "" }), 0];
  },

  addCommands() {
    return { toggleLoomaMath: () => ({ commands }) => commands.toggleMark(this.name) };
  },

  addInputRules() {
    return [markInputRule({ find: TYPED_MATH, type: this.type })];
  },

  addProseMirrorPlugins() {
    return [new Plugin({ props: { transformPastedHTML: pastedMathHtml } })];
  },
});
