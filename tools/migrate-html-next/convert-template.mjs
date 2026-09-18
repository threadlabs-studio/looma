// Derive an HTML Next passthrough port from a Stencil component's shadow stylesheet.
//
// A "passthrough" component is one whose shadow render is essentially `<slot>` inside a styled
// host (display: inline-flex / block, etc.) — the visible element is the *projected* content,
// styled via ::slotted. The correct HTML Next port mirrors the host as a non-interactive
// passthrough element (NOT a native control), carries the host's reflected attributes, and slots
// the content; the projected content keeps being styled via :slotted (see convert-styles.mjs).
//
// This fixes the prior migration, which hardcoded some roots as native controls (e.g. ui-button as
// <button>), producing a control-inside-a-control and losing the projected styling.

/** Attribute names referenced on `:host(...)` — these are the reflected props the port must carry. */
function hostAttributes(shadowCss) {
  const names = new Set();
  for (const [, cond] of shadowCss.matchAll(/:host\(([^)]*)\)/g)) {
    for (const [, name] of cond.matchAll(/\[([A-Za-z][\w-]*)/g)) names.add(name);
  }
  return [...names];
}

/**
 * Build a passthrough port. `rootEl` mirrors the shadow `:host` element (a span for inline hosts,
 * div/section/aside for block hosts) and is deliberately non-interactive.
 */
export function passthroughPort(tag, shadowCss, rootEl = "span", { summary } = {}) {
  // One binding per prop: a prop is reflected once. When the CSS references both `data-x` and `x`,
  // prefer the `data-x` target (the convention across Looma's stylesheets).
  const byProp = new Map();
  for (const attr of hostAttributes(shadowCss)) {
    const prop = attr.startsWith("data-") ? attr.slice(5) : attr;
    // Only single-identifier props are authored; hyphenated names (e.g. `ui-proximity` from
    // data-ui-proximity) are runtime-set state, not props, and would break expression parsing.
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(prop)) continue;
    const existing = byProp.get(prop);
    if (existing === undefined || (attr.startsWith("data-") && !existing.attr.startsWith("data-"))) {
      byProp.set(prop, { attr, prop });
    }
  }
  const bindings = [...byProp.values()];
  const defs = bindings.map((b) => `    <prop name="${b.prop}" type="string">${b.prop} token.</prop>`).join("\n");
  const attrList = bindings.map((b) => `:${b.attr}="${b.prop}"`).join(" ");
  const text = summary && summary.trim() ? summary.trim() : `Migrated Looma ${tag} component.`;
  return `<template component="${tag}" status="early" summary="${text}">
  <defs>
${defs}
  </defs>
  <${rootEl}${attrList ? " " + attrList : ""}><slot></slot></${rootEl}>
</template>`;
}
