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

/** Drop every `name={ … }` attribute whose braces are balanced (ternaries, template literals,
 *  handlers) — `[^}]*` breaks on nested `${}` in template-literal attributes. */
function dropExprAttrs(s) {
  let out = "";
  let i = 0;
  for (;;) {
    const m = /\s+[\w-]+=\{/.exec(s.slice(i));
    if (m === null) return out + s.slice(i);
    out += s.slice(i, i + m.index);
    let j = i + m.index + m[0].length;
    let depth = 1;
    for (; j < s.length && depth > 0; j += 1) { if (s[j] === "{") depth += 1; else if (s[j] === "}") depth -= 1; }
    i = j;
  }
}

/** Remove every balanced `{ … }` expression from content (conditionals, mixed text) after
 *  attribute bindings have already been converted, so no dynamic content leaks through. */
function stripExpressions(s) {
  let out = "";
  let depth = 0;
  for (const ch of s) {
    if (ch === "{") depth += 1;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out;
}

/** Keep one binding per prop (prefer the `data-*` target): HTML Next forbids one prop bound to
 *  conflicting targets, so a prop reflected to both `aria-x` and `data-x` keeps `data-x`. */
function dedupeBindings(body) {
  const chosen = new Map();
  for (const [, attr, prop] of body.matchAll(/:([\w-]+)="(\w+)"/g)) {
    const cur = chosen.get(prop);
    if (cur === undefined || (attr.startsWith("data-") && !cur.startsWith("data-"))) chosen.set(prop, attr);
  }
  return body.replace(/\s*:([\w-]+)="(\w+)"/g, (m, attr, prop) => (chosen.get(prop) === attr ? m : ""));
}

/** Translate one component's render() JSX into an HTML Next template body rooted at `rootEl`. */
function translateJsx(jsx, rootEl) {
  const declaresHost = /<Host\b/.test(jsx);
  let out = jsx;
  out = out.replace(/<style>[\s\S]*?<\/style>/g, "");              // drop the component's dynamic <style>
  out = out.replace(/\s+(on[A-Z]\w*|ref)=\{[^}]*\}/g, "");         // drop event handlers and refs
  out = out.replace(/([\w-]+)=\{this\.(\w+)(?:\s*\|\|\s*undefined)?\}/g, ':$1="$2"'); // clean prop bindings
  out = dropExprAttrs(out);                                        // drop conditional/template-literal/innerHTML attrs
  // pure text binding: <tag ...>{this.prop}</tag> -> <tag ... $value="prop"></tag>
  out = out.replace(/<(\w+)([^>]*)>\s*\{this\.(\w+)\}\s*<\/\1>/g, '<$1$2 $value="$3"></$1>');
  out = stripExpressions(out);                                     // drop any remaining {…} content
  out = out.replace(/<Host\b/g, `<${rootEl}`).replace(/<\/Host>/g, `</${rootEl}>`);
  out = out.replace(/<(\w+)([^>]*?)\s*\/>/g, "<$1$2></$1>");         // self-closing -> paired
  out = out.replace(/\s+/g, " ").replace(/>\s+</g, "><").replace(/\s+>/g, ">").trim();
  const body = dedupeBindings(out);
  return declaresHost ? body : `<${rootEl}>${body}</${rootEl}>`;
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
  // Declare every @Prop() (a prop may be read only by the controller, e.g. avatar's name/alt/
  // fallback), plus any binding that survived translation.
  const declared = [...tsx.matchAll(/@Prop\([^)]*\)\s+(\w+)/g)].map((m) => m[1]);
  const bound = [...body.matchAll(/:[\w-]+="(\w+)"/g)].map((m) => m[1]);
  const props = [...new Set([...declared, ...bound])].filter((name) => /^[A-Za-z][A-Za-z0-9]*$/.test(name));
  const defs = props.map((name) => `    <prop name="${name}" type="string">${name} token.</prop>`).join("\n");
  const text = summary && summary.trim() ? summary.trim() : `Migrated Looma ${tag} component.`;
  return `<template component="${tag}" status="early" summary="${text}">
  <defs>
${defs}
  </defs>
  ${body}
</template>`;
}
