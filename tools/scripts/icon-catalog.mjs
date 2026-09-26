// Looma's icon set (LOOMA_ICONS in packages/looma/src/editor/icons.ts) as plain data: each name and
// its Lucide nodes. Read from the source's name-to-export map and Lucide itself, so it runs on any
// supported Node without compiling TypeScript.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const packageRoot = path.join(repoRoot, "packages/looma");

export async function loomaIconCatalog() {
  const source = await readFile(path.join(packageRoot, "src/editor/icons.ts"), "utf8");
  const body = source.slice(source.indexOf("export const LOOMA_ICONS = {"), source.indexOf("} satisfies"));
  const entries = [...body.matchAll(/^\s*(?:'([^']+)'|([a-z][\w]*)):\s*([A-Z]\w*),/gm)].map(([, quoted, bare, component]) => [quoted ?? bare, component]);
  const lucide = await import(pathToFileURL(createRequire(path.join(packageRoot, "package.json")).resolve("lucide")).href);
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)).map(([name, component]) => [
    name,
    lucide[component].map(([tag, attributes]) => [tag, Object.fromEntries(Object.entries(attributes).filter(([key]) => key !== "key"))]),
  ]));
}

/**
 * The catalog as an HTML Next expression: a map from icon name to shapes, indexed by ui-icon's
 * `name`. ui-icon derives its shapes from it with `<computed>`, so every render path, a server
 * render included, draws the icon without running a controller.
 */
export function iconShapesExpression(catalog) {
  const text = (value) => `'${value}'`;
  const shape = ([tag, attributes]) =>
    `{ ${[["tag", tag], ...Object.entries(attributes)].map(([key, value]) => `${key}: ${text(value)}`).join(", ")} }`;
  const entries = Object.entries(catalog).map(([name, nodes]) => `        ${text(name)}: [${nodes.map(shape).join(", ")}],`);
  return `{\n${entries.join("\n")}\n      }[name]`;
}
