// Convert a Looma Stencil component's Shadow-DOM stylesheet to HTML Next authoring.
//
// This is the Looma-owned migration converter (bespoke to Looma; HTML Next itself has no ingest).
// It translates the *authoritative* shadow CSS — not Looma's light-DOM fallback — so projected-
// content styling is preserved:
//
//   :host            -> :scope                        (the component's public root)
//   :host(<cond>)    -> :scope<cond>                  (a state/attribute condition on the root)
//   ::slotted(<sel>) -> :slotted(<sel>)               (styling projected content; a subtree query
//                                                       in HTML Next, per the styling spec)
//
// The emitted CSS goes in the component's HTML Next <style>; the HTML Next runtime/compiler scopes
// it (see nextwebwg/html-next: :slotted() compiles to selectors anchored to the projected region).

/** Index of the ')' that matches the '(' at `open` in `value`, honoring nesting and strings. */
function matchingParen(value, open) {
  let depth = 1;
  let quote;
  for (let i = open + 1; i < value.length; i += 1) {
    const c = value[i];
    if (quote !== undefined) { if (c === "\\") i += 1; else if (c === quote) quote = undefined; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === "(") depth += 1;
    else if (c === ")" && (depth -= 1) === 0) return i;
  }
  return value.length - 1;
}

function rewriteReflectedAttributes(condition, reflectedAttributes) {
  return condition.replace(/\[([A-Za-z][\w-]*)/g, (match, attribute) => {
    const reflected = reflectedAttributes.get(attribute);
    return reflected === undefined ? match : `[${reflected}`;
  });
}

/** Rewrite `:host` / `:host(<cond>)` to `:scope<cond>`, balancing nested parens in the condition. */
function rewriteHost(css, reflectedAttributes) {
  let out = "";
  let i = 0;
  for (;;) {
    const at = css.indexOf(":host", i);
    if (at === -1) return out + css.slice(i);
    out += css.slice(i, at);
    const after = css[at + 5];
    if (after === "(") {
      const close = matchingParen(css, at + 5);
      const condition = rewriteReflectedAttributes(css.slice(at + 6, close), reflectedAttributes);
      out += ":scope" + condition; // fold the condition onto :scope
      i = close + 1;
    } else if (after === "-" && css.startsWith(":host-context(", at)) {
      // Ancestor context: `:host-context(X) Y` -> `X :scope Y`. Rare; keep the ancestor as a prefix.
      const close = matchingParen(css, at + ":host-context".length);
      out += css.slice(at + ":host-context".length + 1, close) + " :scope";
      i = close + 1;
    } else {
      out += ":scope";
      i = at + 5;
    }
  }
}

/** Convert one component's shadow stylesheet to HTML Next authoring. Pure string transform. */
export function convertShadowStyles(css, { reflectedAttributes = new Map() } = {}) {
  return rewriteHost(css, reflectedAttributes).replace(/::slotted\(/g, ":slotted(");
}
