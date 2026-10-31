import assert from "node:assert/strict";
import test from "node:test";

import { findForbiddenTarballEntries, validateTarballContents } from "./verify-packages.mjs";

test("directory exports require a packed file beneath their exact directory", () => {
  const releasePackage = { requiredFiles: [] };
  const manifest = { name: "@threadlabs/looma", exports: { ".": { "html-next": "./components/" } } };
  validateTarballContents(releasePackage, manifest, ["package/components/ui-button/ui-button.html"], false);
  for (const entries of [[], ["package/components/"], ["package/components-other/ui-button.html"]]) {
    assert.throws(() => validateTarballContents(releasePackage, manifest, entries, false), /export target is missing/);
  }
});

test("release tarballs reject compiler internals and embedded build-machine paths", () => {
  const entries = [
    "package/dist/types/Users/developer/work/looma/packages/core/.stencil/index.d.ts",
    "package/dist/types/home/developer/work/looma/generated.d.ts",
    "package/dist/types/C:/Users/developer/work/looma/generated.d.ts"
  ];

  assert.deepEqual(findForbiddenTarballEntries(entries), entries);
});

test("release tarballs allow normal public declaration output", () => {
  assert.deepEqual(
    findForbiddenTarballEntries([
      "package/dist/index.d.ts",
      "package/dist/home/icons.svg",
      "package/dist/types/components/ui-button/ui-button.d.ts",
      "package/dist/types/stencil-public-runtime.d.ts"
    ]),
    []
  );
});
