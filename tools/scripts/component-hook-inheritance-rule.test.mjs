import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");
const editorStyles = path.join(repoRoot, "packages/looma/src/vue/editor/looma-editor.css");
const tokensRoot = path.join(repoRoot, "packages/looma/src/tokens");

// Hooks under a component's prefix that are not per-instance customisation hooks, so they inherit.
const INHERITED = [
  // State a component publishes to its descendants.
  ["--ui-affordance-scope-engaged", /^--ui-affordance-scope-engaged$/],
  // The editor is one surface whose parts (toolbars, menus, overlays, the content) are separate
  // elements, and editors do not nest: an --ui-editor-* value set on the editor reaches its parts.
  ["--ui-editor-*", /^--ui-editor-/],
];

async function sources() {
  const tags = (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort();
  const files = await Promise.all(tags.map(async (tag) => {
    const source = await readFile(path.join(componentsRoot, tag, `${tag}.html`), "utf8");
    return { tag, name: `${tag}.html`, css: source.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "" };
  }));
  files.push({ tag: undefined, name: "looma-editor.css", css: await readFile(editorStyles, "utf8") });
  // Theme tokens inherit, even where a name shares a component's prefix (--ui-text-primary).
  const tokens = new Set();
  for (const file of await readdir(tokensRoot)) {
    for (const [, token] of (await readFile(path.join(tokensRoot, file), "utf8")).matchAll(/(--ui-[\w-]+)\s*:/g)) tokens.add(token);
  }
  // The longest tag owns a hook: --ui-icon-button-size is Icon Button's, not Icon's.
  const byLength = [...tags].sort((a, b) => b.length - a.length);
  const owner = (hook) =>
    tokens.has(hook) || INHERITED.some(([, pattern]) => pattern.test(hook)) ? undefined : byLength.find((tag) => hook.startsWith(`--${tag}-`));
  return { files, owner };
}

/** Each declaration with the selectors of the style rules around it, innermost last. */
function declarations(css) {
  const found = [];
  const stack = [];
  let text = "";
  for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (character === "{") {
      stack.push(text.trim());
      text = "";
    } else if (character === ";" || character === "}") {
      const colon = text.indexOf(":");
      if (colon > 0 && /^\s*-?-?[\w-]+\s*$/.test(text.slice(0, colon))) {
        found.push({ property: text.slice(0, colon).trim(), value: text.slice(colon + 1).trim(), selectors: stack.filter((prelude) => !prelude.startsWith("@")) });
      }
      text = "";
      if (character === "}") stack.pop();
    } else text += character;
  }
  return found;
}

/** Splits a selector list at its top-level commas. */
function selectorList(selector) {
  const parts = [];
  let depth = 0;
  let part = "";
  for (const character of selector) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      parts.push(part.trim());
      part = "";
    } else part += character;
  }
  return [...parts, part.trim()];
}

/** True when a rule's subject is the component's root itself: `:host` with only pseudo-classes. */
function onRoot(selectors) {
  const expand = (outer, inner) => selectorList(inner).flatMap((part) => outer.map((parent) => part.includes("&") ? part.replaceAll("&", parent) : `${parent} ${part}`));
  const [first, ...rest] = selectors;
  const complete = rest.reduce(expand, selectorList(first ?? ""));
  return complete.every((selector) => {
    let flat = selector;
    while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, "");
    return /^:host(?:-state)?(?:[:[][^\s>+~]*)?$/.test(flat.replace(/\[[^\]]*\]/g, "[]")) && !flat.includes("::");
  });
}

const registered = (css, hook) => new RegExp(`@property\\s+${hook}\\s*\\{[^}]*inherits:\\s*false`).test(css);

/**
 * A component hook (--ui-<tag>-*) styles the one instance it is set on. Custom properties inherit,
 * so an unregistered hook set on a container would reach every nested instance and override its
 * default, and even its props. Each stylesheet that reads a hook registers it with `inherits: false`.
 */
test("every component hook a stylesheet reads is registered as non-inheriting", async () => {
  const { files, owner } = await sources();
  const missing = [];
  for (const { name, css } of files) {
    for (const [, hook] of css.matchAll(/var\(\s*(--ui-[\w-]+)/g)) {
      if (owner(hook) && !registered(css, hook)) missing.push(`${name}: ${hook}`);
    }
  }
  assert.deepEqual([...new Set(missing)], []);
});

/**
 * A non-inheriting hook has its value only on the root it is set on: an inner element, a slotted
 * child, or a pseudo-element reading it sees nothing. The root relays it to them in a private
 * variable, `--_ui-<hook>: var(--ui-<hook>)`, and another component's hooks are never read at all.
 */
test("a component reads its own hooks on its root, and no other component's", async () => {
  const { files, owner } = await sources();
  const violations = [];
  for (const { tag, name, css } of files.filter((file) => file.tag)) {
    for (const { property, value, selectors } of declarations(css)) {
      for (const [, hook] of value.matchAll(/var\(\s*(--ui-[\w-]+)/g)) {
        const hookOwner = owner(hook);
        if (!hookOwner) continue;
        if (hookOwner !== tag) violations.push(`${name}: reads ${hook}, a hook of ${hookOwner}`);
        else if (!onRoot(selectors)) violations.push(`${name}: reads ${hook} off the root (${selectors.join(" ")} { ${property} })`);
      }
    }
  }
  assert.deepEqual(violations, []);
});
