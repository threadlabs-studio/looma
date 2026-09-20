// Choose a native root that mirrors the unconditional Shadow DOM host display. Conditional host
// rules (for example `:host(:not([data-open])) { display: none }`) describe state, not root shape.

export function rootElementFor(css) {
  const display = /:host\s*\{[^}]*?\bdisplay\s*:\s*([\w-]+)/.exec(css)?.[1] ?? "inline";
  return /^inline/.test(display) || display === "contents" ? "span" : "div";
}
