// Derive an HTML Next port from a Stencil component's render() JSX.
//
// Stencil renders `<Host ...attrs>` wrapping a static tree of classed elements and <slot>s. The
// HTML Next port mirrors that: the host becomes a non-interactive root element carrying the same
// reflected attributes, and the inner tree is reproduced so class-targeted styling (.badge__surface,
// …) still matches. This subsumes the passthrough case (a render of just <Host><slot/></Host>).
//
// Focused string transform — the render()s in this library are static JSX (no control flow in the
// markup). Dynamic text bindings and innerHTML (icons) are out of scope here and are noted.

/** Extract the JSX text returned by `render()`, balancing parentheses. */
export function extractRenderJsx(tsx) {
  const head = /render\s*\(\s*\)\s*\{/.exec(tsx);
  if (head === null) return null;
  const from = head.index + head[0].length;
  const ret = /return\s*\(/.exec(tsx.slice(from));
  if (ret === null) return null;
  let depth = 1;
  let i = from + ret.index + ret[0].length;
  const start = i;
  for (; i < tsx.length && depth > 0; i += 1) {
    if (tsx[i] === "(") depth += 1;
    else if (tsx[i] === ")") depth -= 1;
  }
  return tsx.slice(start, i - 1).trim();
}

/** Translate one component's render() JSX into an HTML Next template body rooted at `rootEl`. */
function translateJsx(jsx, rootEl) {
  let out = jsx;
  out = out.replace(/\s+(on[A-Z]\w*|ref)=\{[^}]*\}/g, "");         // drop event handlers and refs first
  out = out.replace(/([\w-]+)=\{this\.(\w+)(?:\s*\|\|\s*undefined)?\}/g, ':$1="$2"'); // clean prop bindings
  out = out.replace(/\s+[\w-]+=\{[^}]*\}/g, "");                    // drop conditionals and innerHTML
  out = out.replace(/<Host\b/g, `<${rootEl}`).replace(/<\/Host>/g, `</${rootEl}>`);
  out = out.replace(/<(\w+)([^>]*?)\s*\/>/g, "<$1$2></$1>");         // self-closing -> paired
  return out.replace(/\s+/g, " ").replace(/>\s+</g, "><").replace(/\s+>/g, ">").trim();
}

/**
 * Build the HTML Next port for a component from its Stencil source and a root element that mirrors
 * the shadow `:host` (a span for inline hosts, div/section for block hosts). Props are the reflected
 * `this.<prop>` values referenced in the render.
 */
export function renderPort(tag, tsx, rootEl = "span", { summary } = {}) {
  const jsx = extractRenderJsx(tsx);
  if (jsx === null) throw new Error(`${tag}: no render() found`);
  const body = translateJsx(jsx, rootEl);
  // Props are only the bindings that survived translation (not dropped handlers/refs/conditionals).
  const props = [...new Set([...body.matchAll(/:[\w-]+="(\w+)"/g)].map((m) => m[1]))]
    .filter((name) => /^[A-Za-z][A-Za-z0-9]*$/.test(name));
  const defs = props.map((name) => `    <prop name="${name}" type="string">${name} token.</prop>`).join("\n");
  const text = summary && summary.trim() ? summary.trim() : `Migrated Looma ${tag} component.`;
  return `<template component="${tag}" status="early" summary="${text}">
  <defs>
${defs}
  </defs>
  ${body}
</template>`;
}
