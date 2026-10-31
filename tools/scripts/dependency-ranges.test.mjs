import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Document a verified incompatible release here when a future range needs an exclusion.
test("public owner dependencies keep open minimum-version ranges", async () => {
  const manifests = ["package.json", "tests/framework-consumer/package.json"];
  for (const directory of ["apps", "packages", "tools"]) {
    for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
      if (entry.isDirectory() && (directory !== "tools" || entry.name === "tsconfig")) manifests.push(`${directory}/${entry.name}/package.json`);
    }
  }
  for (const file of manifests) {
    const manifest = JSON.parse(await readFile(path.join(root, file), "utf8"));
    for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      for (const [name, range] of Object.entries(manifest[field] ?? {})) {
        if (!/^(?:@threadlabs(?:-studio)?\/|@nextwebwg\/|expressmark$|markupress$)/.test(name)) continue;
        assert.match(range, /^(?:workspace:\*|>=\d+\.\d+\.\d+(?:-[\da-z.-]+)?)$/i, `${file} ${field}.${name}: ${range}`);
      }
    }
  }
});
