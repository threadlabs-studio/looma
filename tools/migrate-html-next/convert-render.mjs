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
  if (ret !== null) {
    let depth = 1;
    let i = from + ret.index + ret[0].length;
    const start = i;
    for (; i < tsx.length && depth > 0; i += 1) {
      if (tsx[i] === "(") depth += 1;
      else if (tsx[i] === ")") depth -= 1;
    }
    return tsx.slice(start, i - 1).trim();
  }

  const direct = /return\s+(<([A-Za-z][\w.-]*)\b)/.exec(tsx.slice(from));
  if (direct === null) return null;
  const start = from + direct.index + direct[0].indexOf("<");
  const closing = `</${direct[2]}>`;
  const end = tsx.indexOf(closing, start);
  return end < 0 ? null : tsx.slice(start, end + closing.length).trim();
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

function stripOuterParens(value) {
  let result = value.trim();
  while (result.startsWith("(") && result.endsWith(")")) result = result.slice(1, -1).trim();
  return result;
}

function conditionExpression(source, knownRoots) {
  if (!/^[\sA-Za-z0-9_$.!&|()]+$/.test(source)) return null;
  const roots = [...source.matchAll(/this\.([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1]);
  if (roots.length === 0 || roots.some((root) => !knownRoots.has(root))) return null;
  return source
    .replace(/this\.([A-Za-z][A-Za-z0-9]*)/g, "$1")
    .replace(/&&/g, " and ")
    .replace(/\|\|/g, " or ")
    .replace(/!\s*/g, "not ")
    .replace(/\s+/g, " ")
    .trim();
}

function propTernary(expression, knownRoots) {
  let round = 0;
  let square = 0;
  let curly = 0;
  let question = -1;
  let nested = 0;
  let quote = "";
  for (let i = 0; i < expression.length; i += 1) {
    const ch = expression[i];
    if (quote) {
      if (ch === quote && expression[i - 1] !== "\\") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(") round += 1;
    else if (ch === ")") round -= 1;
    else if (ch === "[") square += 1;
    else if (ch === "]") square -= 1;
    else if (ch === "{") curly += 1;
    else if (ch === "}") curly -= 1;
    else if (round === 0 && square === 0 && curly === 0 && ch === "?") {
      if (question < 0) question = i;
      else nested += 1;
    }
    else if (round === 0 && square === 0 && curly === 0 && ch === ":") {
      if (nested > 0) nested -= 1;
      else if (question >= 0) {
        const condition = conditionExpression(expression.slice(0, question).trim(), knownRoots);
        if (condition === null) return null;
        return {
          condition,
          truthy: stripOuterParens(expression.slice(question + 1, i)),
          falsy: stripOuterParens(expression.slice(i + 1)),
        };
      }
    }
  }
  return null;
}

function addDirective(markup, directive) {
  return markup.replace(/^<([A-Za-z][\w.-]*)\b/, `<$1 ${directive}`);
}

/** Rewrite JSX expressions in element content before attribute processing. Direct `this.prop`
 *  text remains a declarative value node; unsupported conditional/list subtrees are removed as one
 *  balanced unit so their nested attributes and closing tags cannot leak into the port. */
function rewriteContentExpressions(s, knownRoots) {
  let out = "";
  let i = 0;
  let inTag = false;
  let tagExpressionDepth = 0;
  let quote = "";
  while (i < s.length) {
    const ch = s[i];
    if (!inTag && ch === "{") {
      let depth = 1;
      let j = i + 1;
      for (; j < s.length && depth > 0; j += 1) {
        if (s[j] === "{") depth += 1;
        else if (s[j] === "}") depth -= 1;
      }
      const expression = s.slice(i + 1, j - 1).trim();
      const direct = /^this\.([A-Za-z][A-Za-z0-9]*)$/.exec(expression);
      const conditional = /^this\.([A-Za-z][A-Za-z0-9]*)\s*&&\s*(<[\s\S]+>)$/.exec(expression);
      const ternary = propTernary(expression, knownRoots);
      if (direct && knownRoots.has(direct[1])) {
        out += `<template $value="${direct[1]}"></template>`;
      } else if (conditional && knownRoots.has(conditional[1])) {
        const markup = addDirective(conditional[2], `$if="${conditional[1]}"`);
        out += rewriteContentExpressions(markup, knownRoots);
      } else if (ternary) {
        const truthy = ternary.truthy.startsWith("<")
          ? rewriteContentExpressions(addDirective(ternary.truthy, `$when="${ternary.condition}"`), knownRoots)
          : "";
        const falsy = ternary.falsy.startsWith("<")
          ? rewriteContentExpressions(addDirective(ternary.falsy, "$else"), knownRoots)
          : "";
        if (truthy && falsy) out += `<template $match>${truthy}${falsy}</template>`;
        else if (truthy && ternary.falsy === "null") {
          out += rewriteContentExpressions(addDirective(ternary.truthy, `$if="${ternary.condition}"`), knownRoots);
        } else if (falsy && ternary.truthy === "null") {
          out += rewriteContentExpressions(addDirective(ternary.falsy, `$if="not (${ternary.condition})"`), knownRoots);
        }
      }
      i = j;
      continue;
    }

    out += ch;
    if (!inTag && ch === "<") {
      inTag = true;
    } else if (inTag) {
      if (quote) {
        if (ch === quote && s[i - 1] !== "\\") quote = "";
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === "{") {
        tagExpressionDepth += 1;
      } else if (ch === "}") {
        tagExpressionDepth = Math.max(0, tagExpressionDepth - 1);
      } else if (ch === ">" && tagExpressionDepth === 0) {
        inTag = false;
      }
    }
    i += 1;
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

function propMetadata(tsx) {
  const props = [];
  const pattern = /@Prop(?:\(([^)]*)\))?\s+(\w+)\??(?:\s*:\s*([^=;\n]+))?(?:\s*=\s*([^;\n]+))?/g;
  for (const match of tsx.matchAll(pattern)) {
    const options = match[1] ?? "";
    const name = match[2];
    const annotation = match[3]?.trim() ?? "";
    const initial = match[4]?.trim() ?? "";
    const type = /\bboolean\b/.test(annotation) || /^(?:true|false)$/.test(initial)
      ? "boolean"
      : /\bnumber\b/.test(annotation) || /^-?\d+(?:\.\d+)?$/.test(initial)
        ? "number"
        : "string";
    const attribute = /\battribute\s*:\s*['"]([^'"]+)['"]/.exec(options)?.[1]
      ?? name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    props.push({ name, type, attribute, dataAttribute: `data-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}` });
  }
  return props;
}

function propDeclarations(tsx) {
  return new Map(propMetadata(tsx).map(({ name, type }) => [name, type]));
}

/** Map Stencil's public host attributes to HTML Next's automatic `data-*` prop reflection. */
export function reflectedPropAttributes(tsx) {
  return new Map(propMetadata(tsx).map(({ attribute, dataAttribute }) => [attribute, dataAttribute]));
}

/** Translate one component's render() JSX into an HTML Next template body rooted at `rootEl`. */
function translateJsx(jsx, rootEl, knownRoots) {
  const declaresHost = /<Host\b/.test(jsx);
  let out = rewriteContentExpressions(jsx, knownRoots);
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
  // Declare every @Prop() (a prop may be read only by the controller, e.g. avatar's name/alt/
  // fallback), plus any binding that survived translation.
  const declared = propDeclarations(tsx);
  const body = translateJsx(jsx, rootEl, new Set(declared.keys()));
  const bound = [...body.matchAll(/:[\w-]+="(\w+)"/g)].map((m) => m[1]);
  const props = [...new Set([...declared.keys(), ...bound])].filter((name) => /^[A-Za-z][A-Za-z0-9]*$/.test(name));
  const defs = props.map((name) => `    <prop name="${name}" type="${declared.get(name) ?? "string"}">${name} token.</prop>`).join("\n");
  const text = summary && summary.trim() ? summary.trim() : `Migrated Looma ${tag} component.`;
  return `<template component="${tag}" status="early" summary="${text}">
  <defs>
${defs}
  </defs>
  ${body}
</template>`;
}
