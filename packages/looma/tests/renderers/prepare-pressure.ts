import { pressureInputs } from "./pressure-inputs.mjs";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const indexFile = path.join(root, ".test-build/pressure.json");
if (process.argv.includes("--renderer")) {
  const { prepareLibrary } = await import("./prepare-library.ts");
  const directory = await prepareLibrary();
  await writeFile(path.join(root, `.test-build/pressure-${process.env.LOOMA_TEST_TARGET}.json`), JSON.stringify(directory));
} else {
  const targets = process.env.LOOMA_TEST_TARGET ? [process.env.LOOMA_TEST_TARGET] : ["html-next", "vue", "react", "preact", "svelte", "angular"];
  const libraries: Record<string, string> = {};
  await mkdir(path.dirname(indexFile), { recursive: true });
  const inputs = await pressureInputs();
  const started = performance.now();
  // These are independent compiler processes, without browsers or test workers.
  const results = await Promise.allSettled(targets.map(async target => {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, [import.meta.filename, "--renderer"], { stdio: "inherit", env: { ...process.env, LOOMA_TEST_TARGET: target } });
      child.once("error", reject);
      child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${target} preparation failed (${signal ?? code}).`)));
    });
    libraries[target] = JSON.parse(await readFile(path.join(root, `.test-build/pressure-${target}.json`), "utf8"));
  }));
  const failures = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
  if (failures.length || inputs !== await pressureInputs()) {
    await Promise.all(Object.values(libraries).map(directory => rm(directory, { recursive: true, force: true })));
    if (failures.length) throw new AggregateError(failures, "Catalog preparation failed.");
    throw new Error("Pressure-test inputs changed during preparation. Prepare again.");
  }
  console.log(`Compiled ${targets.length} complete catalogs in ${((performance.now() - started) / 1000).toFixed(2)}s.`);
  // Artifacts are restored at the same checkout path in each CI shard.
  await writeFile(indexFile, JSON.stringify({ root, libraries, inputs }));
  console.log(`Prepared pressure-test libraries: ${indexFile}`);
}
