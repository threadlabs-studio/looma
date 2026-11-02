import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Native SSR uses the package's real producer modules through the public preparation API. */
export async function nativePreparation(directory: string, definitions: any[], core: any) {
  const definitionsFile = path.join(directory, "definitions.json");
  await writeFile(definitionsFile, JSON.stringify(definitions));
  const candidates = definitions.filter(definition => definition.module !== undefined).map(definition => ({
    tag: definition.contract.tag, definition,
    file: path.resolve(path.dirname(definition.source.file), definition.module).replace(path.join("src", "components") + path.sep, "components" + path.sep),
  }));
  const sources = [];
  for (const source of candidates) {
    if (await core.preparedModuleRevision(source.file, source.definition, core.GENERATOR_VERSION, file => readFile(file, "utf8"))) sources.push(source);
  }
  const file = path.join(directory, "native-prepare.js");
  await writeFile(file, `${sources.map((source, index) => `import * as module${index} from ${JSON.stringify(source.file)};`).join("\n")}
const modules = [${sources.map((source, index) => `[${JSON.stringify(source.tag)}, module${index}]`).join(",")}];
export async function prepare({ document, host, signal, flush }) {
  const seen = new WeakMap(), cleanups = [];
  let progress;
  do {
    progress = false;
    for (const [tag, module] of modules) {
      if (typeof module.prepare !== "function") continue;
      for (const element of document.querySelectorAll('[component~="' + tag + '"], [data-component~="' + tag + '"]')) {
        let tags = seen.get(element); if (!tags) seen.set(element, tags = new Set());
        if (tags.has(tag)) continue; tags.add(tag);
        const target = host(element, tag); if (!target) continue;
        const preparation = await module.prepare(target, { phase: "request", signal });
        if (preparation?.dispose) cleanups.push(() => preparation.dispose());
        progress = true; await flush();
      }
    }
  } while (progress);
  return () => { for (const cleanup of cleanups.reverse()) cleanup(); };
}\n`);
  return { file, definitionsFile };
}
