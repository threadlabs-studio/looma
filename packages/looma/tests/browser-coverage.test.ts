import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "vitest";
import { sourceCatalog } from "./renderers/components.mjs";

const root = fileURLToPath(new URL("./", import.meta.url));
async function browserSources(directory: string): Promise<[string, string][]> {
  const entries: [string, string][] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name === "browser") entries.push(...await browserSources(file));
    else if (entry.isFile() && entry.name.endsWith(".test.ts") && (directory !== root || entry.name.endsWith(".browser.test.ts") || ["tree.test.ts", "editor-table.test.ts"].includes(entry.name))) {
      entries.push([path.relative(root, file), await readFile(file, "utf8")]);
    }
  }
  return entries;
}

// These internal components are exercised through the document editor's public UI.
const composed = {
  "ui-editor-surface": { file: "source-editor.browser.test.ts", behavior: "edits and round-trips controlled" },
  "ui-editor-table-overlay": { file: "editor-table.test.ts", behavior: "keeps cell menus live after row deletion and tracks focus and scrolling" },
};

it("assigns real browser behavior scenarios to every source component", async () => {
  const { definitions } = await sourceCatalog();
  const sources = await browserSources(root);
  const editor = await readFile(new URL("../src/components/ui-editor/ui-editor.html", import.meta.url), "utf8");
  const missing: string[] = [];
  for (const { contract } of definitions) {
    const indirect = composed[contract.tag as keyof typeof composed];
    if (indirect && editor.includes("<" + contract.tag) && sources.some(([file, source]) => file === indirect.file && source.includes(indirect.behavior))) continue;
    const covered = sources.some(([, source]) => {
      for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']@looma-test\/components["']/g)) {
        for (const specifier of match[1]!.split(",")) {
          const [name, alias] = specifier.trim().split(/\s+as\s+/);
          if (name === contract.name && new RegExp("sceneNode\\(\\s*" + (alias ?? name) + "(?=[,\\s)])").test(source)) return true;
        }
      }
      return false;
    });
    if (!covered) missing.push(contract.tag);
  }
  assert.deepEqual(missing, [], "Add browser rendering/behavior scenarios when adding a component. All renderer pressure runs execute those shared scenarios.");
});
