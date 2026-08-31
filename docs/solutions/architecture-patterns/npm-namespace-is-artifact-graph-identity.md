---
title: Treat an npm namespace change as an artifact-graph identity migration
date: 2026-08-30
last_updated: 2026-08-31
category: architecture-patterns
module: release-tooling
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - A public package must move to a different npm namespace without leaving stale artifact identities behind.
  - Private workspaces, public subpath exports, release tooling, generated metadata, lockfiles, and an independently versioned consumer all encode package names.
  - The migrated artifact must be qualified as exact packed bytes before public publication.
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
  - public-facade
  - release-tooling
  - cross-project-testing
  - knit
  - evidence-integrity
---

# Treat an npm Namespace Change as an Artifact-Graph Identity Migration

## Context

An npm package name is not a label attached to finished code. It is an identity
shared by package manifests, dependency and import edges, registry policy,
generated metadata, lockfiles, release evidence, documentation, and consumers.
Changing it safely therefore requires migrating the whole Package Identity
Graph rather than performing a repository-wide text replacement.

Looma makes the distinction especially important. Its public Release 1 surface
is one package, `@threadlabs/looma`, with explicit root, core, loader, layout,
editor, editor-extension, Vue, and stylesheet subpaths
(`packages/looma/package.json:24`). Core, layout, editor, Vue, and tokens remain
private workspaces whose package identities are assembly inputs rather than
separate products. The release configuration consequently admits exactly one
public artifact and rejects a manifest with any additional public package
identity (`tools/scripts/release-config.mjs:2`,
`tools/scripts/release-config.mjs:39`).

This architecture superseded an unpublished five-package Candidate graph. The
underlying lesson did not change: names still participate in executable edges.
What changed was the public boundary. Internal names now terminate during
facade assembly, which rewrites declared internal specifiers and then rejects
private Looma package identities in assembled runtime files
(`tools/scripts/build-facade.mjs:50`, `tools/scripts/verify-facade.mjs:75`).

Knit extends the graph into a separately versioned consumer. It declares one
direct Looma dependency ([Knit web manifest](../../../../knit/web/package.json#L33))
and imports public subpaths such as `@threadlabs/looma/vue`
([Knit app entry](../../../../knit/web/app/app.vue#L14)). Its unit-test boundary
mocks other facade subpaths by the same public identity
([Knit Looma setup](../../../../knit/web/tests/setup/looma-unit.ts#L3)). A package
rename or public-boundary change is therefore simultaneously a producer,
consumer, bundler, test-isolation, registry, and release-evidence migration.

Earlier release planning encoded a namespace before ownership was proven. That
made namespace availability a late discovery after manifests, documentation,
fixtures, and automation had already absorbed the identity (session history).
The durable correction is to make ownership a zero-mutation preflight and to
treat any later change as an atomic identity-graph migration.

## Guidance

### Freeze the intended public boundary before renaming

Classify every workspace as public now, public later, or permanently private.
Then write the public graph down in one authoritative release configuration.
Do not infer publication from a workspace package name: private workspaces may
retain useful development identities while a facade is the sole installable
product.

For a facade, define subpaths as part of the one public identity. A consumer
should install `@threadlabs/looma` once and import capabilities from explicit
exports such as `@threadlabs/looma/editor/extensions` or
`@threadlabs/looma/vue`; it should not coordinate internal workspace versions.
The facade manifest is the public contract, and its export map must agree with
the assembly declaration (`tools/scripts/verify-facade.mjs:39`).

Inventory every identity-bearing edge before editing:

- package `name` values and dependency keys;
- public subpath exports and internal assembly rewrites;
- source, type, dynamic, and test-mock imports;
- workspace filters and script selectors;
- registry scope routing, ownership checks, and publication policy;
- release allowlists, tarball names, manifests, and evidence;
- generated metadata, documentation examples, and install commands; and
- consumer manifests, bundler boundaries, checked lockfiles, and release
  preflight allowlists.

### Prove namespace ownership before mutation

Before changing any source file, authenticate to the target registry and prove
the expected organization membership and package availability without
publishing. Keep this probe read-only and record which identity was checked.
Namespace ownership is a release prerequisite, not a packaging implementation
detail.

Registry configuration must move with the identity. The disposable release
registry should deny public fallback for the Looma scope while allowing
unrelated dependencies to proxy normally
(`tests/release/registry/verdaccio.yaml:11`). Otherwise a missing Candidate can
be silently supplied by another registry and create false qualification.

### Change authoritative sources before projections

Start with workspace manifests, the facade manifest and assembly map, and the
authoritative release configuration. Change dependency keys, imports, export
maps, and assembly rewrites as one coherent unit so the build graph remains
resolvable. Then update projections: consumers, docs, examples, tests, generated
outputs, and lockfiles.

Do not hand-edit a generated file instead of changing its source. Regenerate
checked API metadata from the repository generator and let the synchronization
test prove it is current (`tools/scripts/component-api-generator.mjs:1`).
Regenerate each lockfile from its own manifest too: Knit's development lockfile
may correctly record a local facade dependency while isolated release evidence
must record the exact registry version. Those resolver modes differ, but the
public package identity must agree.

### Terminate private identities at facade assembly

Build the private workspaces before assembling the public package. Copy only
declared outputs, apply only declared specifier rewrites, and verify every
export target exists (`tools/scripts/build-facade.mjs:15`,
`tools/scripts/build-facade.mjs:56`, `tools/scripts/verify-facade.mjs:49`).
Reject private package specifiers in JavaScript, declarations, loaders, and CSS,
and preserve dependency boundaries: the root/core entry must not acquire Vue or
Tiptap, and the base editor entry must remain Tiptap-free
(`tools/scripts/verify-facade.mjs:75`, `tools/scripts/verify-facade.mjs:84`).

This assembled-tree proof is necessary but not sufficient. Packing is a later
boundary: inspect the packed manifest, require all configured runtime and type
files, verify every declared export target exists in the tarball, reject source
and test leakage, and compute the digest from the exact bytes
(`tools/scripts/verify-packages.mjs:62`,
`tools/scripts/verify-packages.mjs:83`,
`tools/scripts/verify-packages.mjs:210`).

### Qualify the exact renamed artifact through the consumer

Do not accept a successful sibling-link build as release proof. The isolated
qualifier binds the release manifest to the current Looma commit, publishes the
exact tarball to a disposable registry, rewrites only a detached Knit checkout
to the exact version, and rejects local Looma protocols afterward
(`tools/scripts/verify-knit-consumer.mjs:381`,
`tools/scripts/verify-knit-consumer.mjs:396`,
`tools/scripts/verify-knit-consumer.mjs:466`).

Install with a fresh store and linking disabled. Then prove the installed
package resolves inside the detached checkout and carry that same installation
through production build, typecheck, SSR, critical and complete units,
migrations, pgTAP/RLS, and browser signup and authoring flows. This is the point
at which a source-level rename becomes a qualified artifact-graph migration.
The exact-artifact method and environment requirements are documented in
[Isolated cross-project Candidate qualification](isolated-cross-project-candidate-qualification.md).

### Classify old-name residue rather than demanding zero matches

Search producer and consumer repositories after regeneration. Classify each
match as executable identity, generated projection, current documentation,
historical record, negative policy assertion, or unrelated string. Executable
identity, generated projection, and current documentation normally migrate.
Historical plans and policy assertions may intentionally retain superseded
names to explain or reject them.

This distinction matters when a facade replaces several public packages. The
old names can remain valid as private workspace identities and as forbidden
specifier patterns even though they are no longer valid consumer dependencies.
Blind replacement would erase the assembly boundary the migration is meant to
enforce.

## Why This Matters

Workspace resolution can make a partial migration appear healthy. It can load
sibling source even when a packed package has the wrong name, a missing subpath,
stale generated output, an obsolete lockfile edge, or private imports that no
consumer can resolve. A single public facade reduces consumer coordination, but
it also concentrates responsibility in assembly and export-map correctness.

Registry mismatches are higher risk because they sit on the mutation boundary.
Aligning ownership preflight, release allowlists, no-fallback policy, packed
identity, consumer preflight, and evidence makes first publication fail closed.
The result proves local Candidate bytes; it does not by itself prove npm
publication, merge state, or a protected deployment.

## When to Apply

- Moving a public package to a new npm organization or owner-controlled scope.
- Consolidating several installable packages behind one public facade.
- Renaming a package with public subpaths or internal assembly inputs.
- Changing a package identity consumed by another repository.
- Preparing a first publication after linked workspaces were the normal mode.

Use a smaller procedure only when the identity is provably leaf-local: no
internal dependents, external consumer, generated metadata, checked lockfile,
registry policy, release artifact tooling, or public subpaths.

## Examples

For local development, Knit intentionally uses a sibling `file:` dependency on
`@threadlabs/looma`. Product code imports its Vue and editor surfaces through
public subpaths, while tests mock selected registration subpaths. For release
qualification, the verifier changes only a detached Knit manifest to exact
`0.1.0`, installs through a no-fallback disposable registry, and proves the
installed package path is inside that checkout. This preserves fast iteration
without treating local filesystem resolution as artifact evidence.

When replacing the earlier five-package public graph, the safe migration was
not to delete every `@threadlabs/looma-*` string. Those names remain legitimate
inside private workspace manifests and facade assembly sources. The public
release set, consumer dependency, public imports, registry artifact, and exact
qualification evidence moved to `@threadlabs/looma`; the verifier retained a
negative pattern that fails if a private workspace identity leaks into assembled
consumer bytes (`tools/scripts/verify-facade.mjs:6`).

## Related

- [Isolated cross-project Candidate qualification](isolated-cross-project-candidate-qualification.md)
- [Looma Vue unit-test browser registration isolation](../../../../knit/docs/solutions/test-failures/looma-vue-unit-test-browser-registration-isolation.md)
- [Public release runbook](../../public-release.md)
