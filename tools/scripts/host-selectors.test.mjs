import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const components = new URL("../../packages/looma/src/components/", import.meta.url);

test("host selectors distinguish props from mutable and computed state", async () => {
  const violations = [];
  for (const tag of (await readdir(components)).filter((name) => name.startsWith("ui-"))) {
    const source = await readFile(new URL(`${tag}/${tag}.html`, components), "utf8");
    const props = new Set([...source.matchAll(/<prop\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1]));
    const state = new Set([...source.matchAll(/<(?:state|computed)\b[^>]*\bname="([^"]+)"/g)].map((match) => match[1]));
    const style = /<style>([\s\S]*?)<\/style>/.exec(source)?.[1] ?? "";
    for (const host of hostArguments(style)) {
      // Attribute tests in :host() read props; :state() tests read mutable or computed state.
      for (const test of host.matchAll(/:state\(\s*([\w-]+)/g)) {
        if (!state.has(test[1])) violations.push(`${tag}: :host(${host}) must read declared state (${test[1]})`);
      }
      for (const attribute of host.replace(/:state\([^)]*\)/g, "").matchAll(/\[([\w-]+)/g)) {
        if (!props.has(attribute[1])) violations.push(`${tag}: :host(${host}) must read a declared prop (${attribute[1]})`);
      }
    }
    if (style.includes(":host-state(")) violations.push(`${tag}: :host-state() is now :host(:state(name))`);
  }
  assert.deepEqual(violations, []);
});

test("mixed prop and state conditions remain on the same host", async () => {
  const disclosure = await readFile(new URL("ui-disclosure/ui-disclosure.html", components), "utf8");
  const sidebar = await readFile(new URL("ui-sidebar/ui-sidebar.html", components), "utf8");
  assert.match(disclosure, /:host\(\[fill\]:state\(internalOpen\)\)/);
  assert.match(sidebar, /:host\(\[side="end"\]:state\(internalCollapsed\)\)/);
});

/** The argument of each `:host(...)` in a stylesheet, with nested parentheses kept whole. */
function hostArguments(style) {
  const found = [];
  for (const match of style.matchAll(/:host\(/g)) {
    let depth = 1;
    let index = match.index + match[0].length;
    while (index < style.length && depth > 0) {
      if (style[index] === "(") depth += 1;
      else if (style[index] === ")") depth -= 1;
      index += 1;
    }
    found.push(style.slice(match.index + match[0].length, index - 1));
  }
  return found;
}
