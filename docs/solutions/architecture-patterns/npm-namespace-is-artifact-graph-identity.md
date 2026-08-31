---
title: Treat an npm namespace change as an artifact-graph identity migration
date: 2026-08-30
category: architecture-patterns
module: release-tooling
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - A scoped package family must move to a different npm namespace without leaving stale artifact identities behind.
  - Release tooling, generated metadata, checked lockfiles, and an independently versioned consumer all encode package names.
  - The migrated package set must be qualified as exact Candidate artifacts before public publication.
root_cause: missing_workflow_step
resolution_type: workflow_improvement
related_components:
  - tooling
  - testing_framework
  - infrastructure
tags:
  - npm-namespace
  - package-identity
  - artifact-graph
  - release-tooling
  - cross-project-testing
  - candidate-artifacts
  - knit
  - evidence-integrity
---

# Treat an npm Namespace Change as an Artifact-Graph Identity Migration

## Context

Looma Release 1 is a synchronized five-package Candidate graph—
`@threadlabs/looma-tokens`, `@threadlabs/looma-layout`,
`@threadlabs/looma-core`, `@threadlabs/looma-editor`, and
`@threadlabs/looma-vue`—rather than a collection of unrelated packages. The
release configuration names that exact public set and rejects additions or
omissions
(`tools/scripts/release-config.mjs:1`). The Vue adapter imports other Looma
packages for registration side effects (`packages/vue/src/index.ts:1`), while
the editor declares internal package dependencies
(`packages/editor/package.json:50`). Package names therefore participate in
both dependency and runtime-import edges.

The graph extends beyond public packages. Deferred adapters, private apps, and
shared tooling also have workspace identities (`packages/react/package.json:1`,
`packages/svelte/package.json:1`, `apps/docs/package.json:1`,
`tools/tsconfig/package.json:1`). The release support matrix distinguishes the
five Candidate packages from deferred and private workspaces
(`docs/release-support-matrix.md:7`). Renaming only the public manifests would
leave the workspace split across two identity systems.

Knit adds a separately versioned consumer graph. It keys its Looma dependencies
under `@threadlabs/looma-*` while retaining sibling `link:` specifiers for local
development ([Knit web manifest, line 32](../../../../knit/web/package.json#L32)).
Product code imports the Vue adapter by that identity
([Knit app entry, line 13](../../../../knit/web/app/app.vue#L13)), unit setup
mocks the transitive registration packages by identity
([Knit Looma unit setup, line 1](../../../../knit/web/tests/setup/looma-unit.ts#L1)),
and Vitest inlines the installed adapter so those imports cross the intended
mock boundary
([Knit Vitest configuration, line 19](../../../../knit/web/vitest.config.ts#L19)).
A namespace change is consequently a
producer, consumer, build, test-isolation, and release-preflight change.

Earlier release planning encoded the old namespace before ownership was proven.
That made scope availability a late discovery after manifests, documentation,
fixtures, and automation had already absorbed the identity (session history).
The durable correction is to treat namespace ownership as an early zero-mutation
preflight and any later rename as an atomic package-identity migration.

## Guidance

### 1. Freeze the intended identity graph

Write down every workspace identity, not only packages intended for immediate
publication. Classify each node as public now, public later, or permanently
private. Use one authoritative release-package set for the public subgraph; in
Looma it couples each package name to its source directory and required tarball
contents (`tools/scripts/release-config.mjs:1`).

Inventory every identity-bearing edge before editing:

- package `name` values and internal dependency keys;
- source, type, subpath, and dynamic imports plus test mocks;
- workspace filters and script selectors;
- registry scope configuration, routing, and publication policy;
- release allowlists, dependency-order logic, tarball paths, and manifests;
- generated metadata, documentation examples, and install commands;
- consumer manifests, preflight allowlists, bundler/test boundaries, fixtures,
  and checked lockfiles.

### 2. Change sources before projections

Start with package manifests and the authoritative release configuration. Change
internal dependency keys and source imports together so the workspace graph
continues to resolve. Then update projections: consumers, docs, examples, tests,
generated outputs, and lockfiles.

Do not hand-edit a generated file as a substitute for changing its source.
Looma generates `generated/component-api.json` from its metadata generator
(`tools/scripts/generate-component-api.mjs:1`), and the sync check fails when
the checked output differs (`tools/scripts/check-docs-sync.mjs:1`). Regenerate
each checked lockfile from its own manifest as well. Knit's ordinary lockfile
records development links
([Knit lockfile, line 35](../../../../knit/pnpm-lock.yaml#L35)), while Looma's packed
consumer lockfile records renamed tarballs
(`tests/release/consumer/pnpm-lock.yaml:8`); the resolution modes differ, but
the package identities must agree.

### 3. Move registry and workflow policy with the names

The npm scope is executable policy. Registry preflight proves organization
membership and checks every configured package identity before reporting that no
mutation occurred (`tools/scripts/registry-preflight.mjs:39`). The protected
workflow configures the same scope before preflight and Candidate publication
(`.github/workflows/release.yml:174`).

Move local isolation policy too. The disposable registry gives the Looma scope
no public fallback while unrelated dependencies may proxy normally
(`tests/release/registry/verdaccio.yaml:11`), and its npm configuration routes
that scope to the disposable registry (`tests/release/registry/.npmrc:1`). This
prevents a missed local artifact from being silently supplied elsewhere.

### 4. Rebuild and inspect packed identities

Build and pack only after the source graph is coherent. Inspect packed manifests
instead of assuming workspace manifests describe published bytes. Looma derives
tarball names from scoped package names, requires the exact Candidate set, and
requires internal release dependencies to resolve to exact synchronized versions
(`tools/scripts/verify-packages.mjs:44`, `tools/scripts/verify-packages.mjs:62`).

Generate the release manifest from those exact bytes. Looma derives dependency
order from internal package names and records source identity, toolchain, tarball
name, digest, and internal dependencies (`tools/scripts/create-release-manifest.mjs:6`).
This turns a source-tree convention into a verifiable artifact graph.

### 5. Qualify exact bytes outside workspace links

Do not use a successful linked development build as release proof. Knit keeps
sibling links for local work, but its release preflight accepts only exact
registry versions for its three Looma runtime dependencies—core, editor, and
Vue ([Knit release preflight, line 81](../../../../knit/scripts/release-preflight.mjs#L81)).
The qualification runner rewrites
only a detached Knit checkout, rejects local Looma protocols, and proves the
installed packages resolve inside that isolated checkout
(`tools/scripts/verify-knit-consumer.mjs:145`,
`tools/scripts/verify-knit-consumer.mjs:202`).

Install with a fresh store and linking disabled, then validate the installed
graph, production build, typecheck, SSR surfaces, signup-critical tests, and the
complete unit suite (`tools/scripts/verify-knit-consumer.mjs:372`,
`tools/scripts/verify-knit-consumer.mjs:398`). This gate proves local Candidate
artifacts only. It does not prove a merge, deploy, npm publication, or
credential-free public-registry install.

### 6. Classify old-name residue

Search both repositories for the old scope after regeneration. Do not demand
blind zero matches: historical decisions, migration plans, negative policy
assertions, and unrelated DOM/event strings can retain similar text. Classify
each hit as executable identity, generated projection, current documentation,
historical record, negative assertion, or unrelated string. Only the first
three normally require migration.

## Why This Matters

Workspace links can make an incomplete rename appear healthy. They can resolve
source directories even when a packed package has the wrong name, stale
dependency metadata, obsolete generated output, or an old tarball filename.
The isolated verifier's lockfile and realpath checks exist because an ordinary
workspace build does not prove artifact identity
(`tools/scripts/verify-knit-consumer.mjs:202`).

Generated files and lockfiles are executable or published projections of the
graph. Registry scope mismatches are higher-risk still because they sit on the
mutation boundary. Aligning the workflow scope, ownership preflight, release
allowlist, local no-fallback policy, and consumer preflight makes a rename
reviewable and makes first publication fail closed.

## When to Apply

- Moving packages to a new npm organization or owner-controlled scope.
- Renaming a package that participates in an internal package DAG.
- Splitting or consolidating a monorepo's public package family.
- Changing a public package name consumed by another repository.
- Preparing a first publication after linked workspaces were the normal mode.

Use a smaller procedure only when the identity is provably leaf-local: no
internal dependents, external consumer, generated metadata, checked lockfile,
registry policy, or release artifact tooling.

## Examples

For `@threadlabs/looma-editor`, the identity appears in its manifest and internal
dependencies (`packages/editor/package.json:1`,
`packages/editor/package.json:50`), in Vue's registration imports
(`packages/vue/src/index.ts:1`), in packed-consumer imports and tarball
dependencies (`tests/release/consumer/src/index.ts:1`,
`tests/release/consumer/package.json:11`), and in Knit's
[manifest](../../../../knit/web/package.json#L32) and
[release preflight](../../../../knit/scripts/release-preflight.mjs#L81).
Missing any edge produces a split
identity graph.

For local development, keep Knit's sibling links but make them ineligible for a
release build. For qualification, install the already-approved tarballs in a
detached clean Knit checkout through a disposable no-fallback registry with
linking disabled, then exercise the real consumer gates. This preserves fast
local iteration while basing the release decision on the bytes users would
install.

## Related

- [Isolated cross-project Candidate qualification](isolated-cross-project-candidate-qualification.md)
- [Looma Vue unit-test browser registration isolation](../../../../knit/docs/solutions/test-failures/looma-vue-unit-test-browser-registration-isolation.md)
- [Public release runbook](../../public-release.md)
