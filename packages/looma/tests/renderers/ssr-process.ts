import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";
import { rendererPlugins } from "../framework-plugins";

/** Render a scenario in a fresh locale using the suite's already compiled server library. */
export async function renderInLocale(source: string, locale: string): Promise<string> {
  const directory = await mkdtemp(fileURLToPath(new URL("../../.test-build/locale-", import.meta.url)));
  try {
    const entry = join(directory, "scenario.js");
    await writeFile(entry, source);
    await build({
      configFile: false, logLevel: "silent", root: directory, plugins: rendererPlugins(),
      build: { ssr: entry, minify: false, outDir: join(directory, "dist"), rolldownOptions: { output: { entryFileNames: "scenario.mjs" } } },
    });
    const result = join(directory, "rendered.html");
    execFileSync(process.execPath, ["--input-type=module", "--eval", `
      import { writeFile } from "node:fs/promises";
      const { default: html } = await import(${JSON.stringify(pathToFileURL(join(directory, "dist/scenario.mjs")).href)});
      await writeFile(${JSON.stringify(result)}, html);
    `], { env: { ...process.env, LANG: locale, LC_ALL: locale }, encoding: "utf8" });
    return await readFile(result, "utf8");
  } finally { await rm(directory, { recursive: true, force: true }); }
}
