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
    for (const match of style.matchAll(/:(host|host-state)\(([^)]+)\)/g)) {
      for (const attribute of match[2].matchAll(/\[([\w-]+)/g)) {
        const name = attribute[1];
        if (match[1] === "host-state" && !state.has(name)) violations.push(`${tag}: ${match[0]} must read declared state (${name})`);
        if (match[1] === "host" && !props.has(name)) violations.push(`${tag}: ${match[0]} must read a declared prop (${name})`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("mixed prop and state conditions remain on the same host", async () => {
  const disclosure = await readFile(new URL("ui-disclosure/ui-disclosure.html", components), "utf8");
  const sidebar = await readFile(new URL("ui-sidebar/ui-sidebar.html", components), "utf8");
  assert.match(disclosure, /:host\(\[fill\]\):host-state\(\[internalOpen\]\)/);
  assert.match(sidebar, /:host\(\[side="end"\]\):host-state\(\[internalCollapsed\]\)/);
});
