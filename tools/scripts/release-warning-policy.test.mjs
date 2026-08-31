import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { cleanStencilOutput, findUnhandledStencilWarnings } from "./run-stencil-build.mjs";

test("Stencil warning policy allows only the documented CJS filename false positive", () => {
  const known = `[ WARN ] Package Json: package.json:19:3
    package.json "main" property is set to "dist/index.cjs". It's
    recommended to set the "main" property to: dist/index.cjs.js`;
  assert.deepEqual(findUnhandledStencilWarnings(known), []);
});

test("Stencil warning policy rejects new or additional warnings", () => {
  assert.equal(findUnhandledStencilWarnings("[ WARN ] Unexpected compiler warning").length, 1);
  const knownAndUnexpected = `[ WARN ] package.json "main" property is set to "dist/index.cjs". It's recommended to set the "main" property to: dist/index.cjs.js
[ WARN ] Unexpected compiler warning`;
  assert.equal(findUnhandledStencilWarnings(knownAndUnexpected).length, 1);
});

test("Stencil builds remove stale release output without touching package sources", async () => {
  const packageDirectory = await mkdtemp(path.join(os.tmpdir(), "looma-stencil-clean-"));
  try {
    await mkdir(path.join(packageDirectory, "dist", "types", "Users", "developer"), {
      recursive: true
    });
    await mkdir(path.join(packageDirectory, "src"));
    await writeFile(
      path.join(packageDirectory, "dist", "types", "Users", "developer", "orphan.d.ts"),
      "export {};\n"
    );
    await writeFile(path.join(packageDirectory, "src", "component.tsx"), "export {};\n");

    await cleanStencilOutput(packageDirectory);

    await assert.rejects(
      readFile(path.join(packageDirectory, "dist", "types", "Users", "developer", "orphan.d.ts"))
    );
    assert.equal(
      await readFile(path.join(packageDirectory, "src", "component.tsx"), "utf8"),
      "export {};\n"
    );
  } finally {
    await rm(packageDirectory, { recursive: true, force: true });
  }
});

test("Stencil uses a source-only tsconfig so root facade entry types cannot leak host paths", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const stencilConfig = await readFile(
    path.join(repoRoot, "packages/core/stencil.config.ts"),
    "utf8"
  );
  const compilerTsconfig = JSON.parse(
    await readFile(path.join(repoRoot, "packages/core/tsconfig.stencil.json"), "utf8")
  );

  assert.match(stencilConfig, /tsconfig:\s*['"]tsconfig\.stencil\.json['"]/);
  assert.deepEqual(compilerTsconfig.include, ["src"]);
  assert.equal(compilerTsconfig.extends, "./tsconfig.json");
});
