import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page, Request } from "playwright";

/** A fixture is source text plus shared CSS. It never invokes a bundler or compiler. */
export async function createFixture(directory: string, name: string, source: string, mode = "production") {
  const folder = path.join(directory, name);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(directory, `${name}.js`), source);
  const file = path.join(folder, "bundle.js");
  await writeFile(file, `import "/@vite/client"; import ${JSON.stringify(`../${name}.js`)};
import { pendingControllers } from "@nextwebwg/html-next/runtime";
globalThis.__loomaControllerTasks = () => pendingControllers(document);`);
  await writeFile(path.join(folder, "mode.json"), JSON.stringify(mode));
  const manifest = JSON.parse(await readFile(path.join(process.env.LOOMA_PREPARED_LIBRARY!, "manifest.json"), "utf8"));
  await symlink(manifest.fixtureStyles, path.join(folder, "components.css"));
  return file;
}

export async function fixtureURL(file: string) {
  const mode = JSON.parse(await readFile(path.join(path.dirname(file), "mode.json"), "utf8"));
  const servers = JSON.parse(process.env.LOOMA_FIXTURE_SERVERS ?? "{}");
  if (!servers[mode]) throw new Error(`The suite must start its ${mode} fixture server.`);
  return `${servers[mode]}/@fs/${file}`;
}

export async function loadFixture(page: Page, file: string) {
  const url = await fixtureURL(file).catch(error => { if (error.code !== "ENOENT") throw error; return null; });
  const scripts = new Map<Request, { done: Promise<void>; resolve: () => void }>();
  const started = (request: Request) => {
    if (request.resourceType() !== "script") return;
    let resolve!: () => void;
    const done = new Promise<void>(ready => { resolve = ready; });
    scripts.set(request, { done, resolve });
  };
  const finished = (request: Request) => { scripts.get(request)?.resolve(); scripts.delete(request); };
  page.on("request", started); page.on("requestfinished", finished); page.on("requestfailed", finished);
  try {
    // A deliberately transformed controller fixture can supply a self-contained script.
    await page.addScriptTag(url ? { type: "module", url } : { path: file });
    let controllersLoading: boolean;
    do {
      await Promise.all([...scripts.values()].map(script => script.done));
      // Downloads can finish before module activation. Let views commit, then await the
      // runtime's actual startup tasks before driving the rendered controls.
      controllersLoading = await page.evaluate(async ordinaryFixture => {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        const read = (globalThis as typeof globalThis & { __loomaControllerTasks?: () => readonly Promise<void>[] }).__loomaControllerTasks;
        const pending = ordinaryFixture ? read?.() ?? [] : [];
        await Promise.all(pending);
        return pending.length > 0;
      }, url !== null);
    } while (scripts.size || controllersLoading);
  } finally {
    page.off("request", started); page.off("requestfinished", finished); page.off("requestfailed", finished);
  }
}
