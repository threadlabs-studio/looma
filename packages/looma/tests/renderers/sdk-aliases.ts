import { readFileSync } from "node:fs";
import path from "node:path";

/** Use the SDK under test for native fixtures as well as converted library preparation. */
export function sdkAliases() {
  const root = process.env.LOOMA_HTMLNEXT_ROOT;
  if (!root) return [];
  const directory = path.join(root, "packages/html-next");
  const manifest = JSON.parse(readFileSync(path.join(directory, "package.json"), "utf8"));
  return Object.entries(manifest.exports).flatMap(([name, entry]) => {
    const source = (entry as { import?: string }).import;
    if (!source) return [];
    const specifier = `@nextwebwg/html-next${name === "." ? "" : name.slice(1)}`;
    return [{ find: new RegExp("^" + specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"), replacement: path.join(directory, source) }];
  });
}
