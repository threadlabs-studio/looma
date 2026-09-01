---
title: Prevent Stencil declaration output from leaking build-machine paths
date: 2026-08-31
category: build-errors
module: release-tooling
problem_type: build_error
component: development_workflow
symptoms:
  - "The packed @threadlabs/looma tarball contained a declaration beneath an embedded /Users path."
  - "A clean Stencil rebuild recreated the leaked declaration instead of removing it."
  - "The public file inventory exposed compiler-internal .stencil structure and build-host topology."
root_cause: config_error
resolution_type: config_change
severity: medium
related_components:
  - "tooling"
  - "testing_framework"
tags:
  - "stencil"
  - "release-tarball"
  - "declaration-output"
  - "host-path-leak"
  - "public-facade"
  - "artifact-integrity"
framework_version: "Stencil 4.43.2"
---

# Prevent Stencil declaration output from leaking build-machine paths

## Problem

The packed `@threadlabs/looma` facade contained a declaration at a
machine-specific path:

```text
package/dist/types/Users/matthew/git/oss/looma-knit/looma/packages/core/.stencil/index.d.ts
```

The file was not merely leftover output. Stencil was reading the core package's
general TypeScript project, seeing the package-root facade entry, and reproducing
a temporary `.stencil` declaration beneath `dist/types` with the source
machine's absolute path encoded as directories.

## Symptoms

- Rebuilding did not eliminate the declaration. A clean Stencil build recreated
  it.
- The tarball leaked both a compiler-internal `.stencil` segment and the build
  host's path.
- The earlier tarball policy rejected source, test, configuration, Git,
  environment, and dependency-tree content, but did not reject compiler
  internals or host-root declaration paths.
- The trigger was visible in the input graph: the general core TypeScript config
  includes both `src` and package-root `index.ts`
  (`packages/core/tsconfig.json:17`).

## What Didn't Work

The first hypothesis was stale build output. Cleaning the output directory is
necessary for deterministic builds, but it was not sufficient here: running
Stencil from a clean state recreated the same path. That isolated the problem to
compiler inputs rather than residue left by another command.

Repeated full rebuilds had the same limitation. The core build runs Stencil and
then bundles the root `index.ts` with tsup (`packages/core/package.json:42`), so
the two tools were sharing a TypeScript project even though they needed different
source boundaries.

A tarball denylist alone would only stop the symptom at release time. Conversely,
removing `index.ts` from the general TypeScript config would stop checking an
entry still used by tsup and the package typecheck.

## Solution

The fix separates output hygiene, compiler inputs, and release enforcement.

First, the Stencil wrapper removes exactly the current package's `dist`
directory before invoking the compiler:

```js
export async function cleanStencilOutput(packageDirectory = process.cwd()) {
  await rm(path.join(packageDirectory, "dist"), { recursive: true, force: true });
}
```

The cleanup is scoped and awaited before `stencil build`
(`tools/scripts/run-stencil-build.mjs:22-35`). It removes real residue without
touching package sources.

Second, Stencil selects a dedicated source-only TypeScript config:

```ts
// packages/core/stencil.config.ts
export const config: Config = {
  namespace: 'looma',
  tsconfig: 'tsconfig.stencil.json',
  // ...
};
```

```json
{
  "extends": "./tsconfig.json",
  "include": ["src"]
}
```

The selection is explicit in `packages/core/stencil.config.ts:3-6`, while
`packages/core/tsconfig.stencil.json:1-4` inherits the normal compiler options
and replaces only the source include set. The general config intentionally keeps
`["src", "index.ts"]` for tsup and typechecking
(`packages/core/tsconfig.json:17`).

Third, packed-file validation now rejects `.stencil` path segments and embedded
macOS, Linux, or Windows host roots beneath declaration output
(`tools/scripts/verify-packages.mjs:83-96`). The verifier applies this policy to
the entries listed from the actual tarball before accepting the package
(`tools/scripts/verify-packages.mjs:215-233`).

Regression coverage operates at both boundaries:

- Build-policy tests prove cleanup removes a synthetic host-path declaration
  without deleting a sibling source file, and prove Stencil selects the
  source-only config (`tools/scripts/release-warning-policy.test.mjs:23-63`).
- Tarball-policy tests reject representative macOS, Linux, and Windows leaks
  while allowing normal declaration output and ordinary product paths
  (`tools/scripts/tarball-content-policy.test.mjs:6-26`).

## Why This Works

Stencil's input graph no longer contains the package-root facade entry. Its
dedicated config inherits shared compiler behavior but replaces the include set
with `src` only. That removes the condition that caused Stencil to materialize a
temporary declaration whose output path mirrored the absolute location of
`index.ts`.

Cleaning `dist` before compilation independently makes each Stencil run
insensitive to prior output. Input isolation closes deterministic regeneration;
cleanup closes stale residue.

Finally, the release check examines packed bytes rather than assuming that a
clean source tree implies a clean package. If a compiler or configuration change
reintroduces the same class of leak, the candidate fails before it reaches a
consumer or registry.

## Prevention

- Give each generator the narrowest source graph it needs. Share compiler
  options through `extends`, not necessarily the same include set.
- Clean only the generator's exact output directory immediately before
  generation, and test that the cleanup cannot reach sources.
- Test compiler-input boundaries as configuration, not only as output snapshots.
- Preserve positive tarball fixtures alongside forbidden-path cases so a
  denylist cannot silently grow broad enough to reject legitimate product paths.
- When an unexpected generated file survives a rebuild, remove the exact output
  directory, run each generator separately, and inspect fresh output. Recreation
  from a clean state points to compiler inputs or generator configuration.
- Treat the packed archive inventory as the public contract. Workspace builds
  and facade assembly cannot prove that the final tarball contains only portable
  paths.

## Related Issues

- [Qualify Exact Candidate Artifacts Through a Clean Priority Consumer](../architecture-patterns/isolated-cross-project-candidate-qualification.md)
- [Treat an npm namespace change as an artifact-graph identity migration](../architecture-patterns/npm-namespace-is-artifact-graph-identity.md)
- No matching GitHub issue was found during the documentation pass.
