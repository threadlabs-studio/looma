import { writeFile } from "node:fs/promises";
import path from "node:path";

/** Use the native build's producer preparation and source revisions for server rendering. */
export async function nativePreparation(directory: string, definitions: any[], sources: Record<string, string>) {
  const definitionsFile = path.join(directory, "definitions.json");
  await writeFile(definitionsFile, JSON.stringify(definitions));
  const sourcesFile = path.join(directory, "sources.json");
  await writeFile(sourcesFile, JSON.stringify(sources));
  const file = path.join(directory, "native-prepare.js");
  await writeFile(file, 'export { prepare } from "virtual:html-next/prepare";\n');
  return { file, definitionsFile, sourcesFile };
}
