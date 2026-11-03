import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const execute = promisify(execFile);

it("uses the current prepared library after warming Vitest's virtual-import cache", async () => {
  await mkdir(path.join(root, ".test-build"), { recursive: true });
  const directory = await mkdtemp(path.join(root, ".test-build/renderer-cache-"));
  try {
    const fixture = path.join(directory, "revision.test.ts");
    await writeFile(fixture, `import { expect, it } from "vitest";
      import { revision } from "@looma-test/implementations";
      it("loads the selected immutable output", () => expect(revision).toBe(process.env.EXPECT_REVISION));`);
    const config = path.join(directory, "vitest.config.ts");
    await writeFile(config, `import base from ${JSON.stringify(pathToFileURL(path.join(root, "vitest.config.ts")).href)};
      import { rendererPlugins } from ${JSON.stringify(pathToFileURL(path.join(root, "tests/framework-plugins.ts")).href)};
      export default { ...base, test: { ...base.test, projects: [{ cacheDir: base.cacheDir, extends: true, plugins: rendererPlugins(), test: { name: "cache-probe", include: [${JSON.stringify(fixture)}] } }] } };`);
    for (const revision of ["first", "second"]) {
      const library = path.join(directory, revision);
      await mkdir(library);
      const module = path.join(library, "output.js");
      await writeFile(module, `export const revision = ${JSON.stringify(revision)};`);
      await writeFile(path.join(library, "manifest.json"), JSON.stringify({ target: "vue", components: [], server: module, client: module, clientModule: module }));
      const result = await execute(process.execPath, [path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs"), "run", "--config", config, "--maxWorkers=1"], {
        cwd: root, env: { ...process.env, LOOMA_TEST_TARGET: "vue", LOOMA_PREPARED_LIBRARY: library, EXPECT_REVISION: revision },
      }).catch(error => { assert.fail(`${error.stdout ?? ""}\n${error.stderr ?? ""}`); });
      assert.match(result.stdout, /1 passed/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30_000);
