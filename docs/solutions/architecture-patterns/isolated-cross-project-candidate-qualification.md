---
module: release-tooling
date: 2026-08-30
last_updated: 2026-08-31
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - "A public facade is assembled from private workspaces and must be qualified as the bytes consumers actually install."
  - "An independently versioned integration harness supplies release-critical build, unit, database, and browser gates."
  - "Workspace links, shared stores, registry fallback, or source-tree imports could hide package defects."
  - "Containerized tests need files from a detached checkout on a host path shared into the Docker-compatible VM."
root_cause: missing_workflow_step
resolution_type: workflow_improvement
related_components:
  - tooling
  - testing_framework
  - infrastructure
tags:
  - release-qualification
  - cross-project-testing
  - exact-artifacts
  - facade-package
  - colima
  - pgtap
  - knit
  - evidence-integrity
---

# Qualify Exact Candidate Artifacts Through a Clean Integration Harness

## Context

Looma's release boundary is its single public `@threadlabs/looma` facade, not
the private workspaces that produce it. The package exposes explicit root,
core, loader, layout, editor, low-level editor UI, editor-extension, general
Vue, Vue editor, and stylesheet subpaths
(`packages/looma/package.json:21`, `packages/looma/package.json:24`), while the
release configuration admits exactly one public artifact and enumerates the
runtime, type, and style files required in its tarball
(`tools/scripts/release-config.mjs:2`, `tools/scripts/release-config.mjs:39`).

A green Looma workspace build cannot prove that boundary. Source imports,
workspace resolution, a sibling checkout, or an existing package store can all
make code work without proving that the packed bytes have complete exports and
survive installation by a real consumer. Earlier planning found the same blind
spot in Knit: linked source dependencies and mocked registration imports exposed
the migration seams but did not execute the bytes that would be published
(session history).

Looma's audience is arbitrary consuming applications. Knit is our independently
versioned deep-integration and exact-artifact qualification harness, so the
release process treats the exact facade tarball and a committed Knit snapshot
as one cross-project qualification unit. The verifier
binds the manifest to the current Looma commit, checks the tarball digest, and
creates a clean detached Knit worktree at the recorded Knit commit
(`tools/scripts/verify-knit-consumer.mjs:212`,
`tools/scripts/verify-knit-consumer.mjs:383`,
`tools/scripts/verify-knit-consumer.mjs:396`). This is deeper than package
loading: Knit's release path also depends on Nuxt build behavior, Vue SSR, unit
contracts, Supabase migrations, RLS, Realtime, and a real browser.

This pattern proves local exact-artifact qualification. It does not claim that
either repository is merged, that the Candidate is published to npm, or that a
protected deployment is active.

## Guidance

### Make exact installed bytes the subject of the test

Validate the release manifest before starting the consumer. Require the expected
version and exact approved package set, then recompute the tarball SHA-256 and
compare it with the manifest (`tools/scripts/verify-knit-consumer.mjs:212`,
`tools/scripts/verify-knit-consumer.mjs:219`,
`tools/scripts/verify-knit-consumer.mjs:223`). Publish that tarball—not rebuilt
output—to a disposable loopback registry under the local Candidate tag
(`tools/scripts/verify-knit-consumer.mjs:404`,
`tools/scripts/verify-knit-consumer.mjs:434`).

Rewrite only the detached consumer's dependency to the exact release version
and reject superseded package identities (`tools/scripts/verify-knit-consumer.mjs:228`).
Install with a fresh store, workspace preference and linking disabled, and
store-integrity verification enabled (`tools/scripts/verify-knit-consumer.mjs:466`).
After installation:

- reject `link:`, `workspace:`, and `file:` Looma references in the lockfile;
- require the exact Candidate version;
- prove the installed package resolves inside the detached Knit checkout; and
- preserve the generated lockfile as evidence rather than changing Knit's
  source lockfile (`tools/scripts/verify-knit-consumer.mjs:288`).

That closes the loophole where a test says "installed" but actually executes
sibling source. Local development may still use a `file:` dependency for fast
iteration; it is a different resolver path and cannot qualify the release.

### Carry the same candidate through every consumer layer

Do not stop after import or compile checks. The same detached installation must
pass the production build, typecheck, SSR proof, signup-critical unit tests, and
complete unit suite before any environment-dependent gate starts
(`tools/scripts/verify-knit-consumer.mjs:481`,
`tools/scripts/verify-knit-consumer.mjs:495`,
`tools/scripts/verify-knit-consumer.mjs:518`). The generated SSR proof imports
the editor, low-level editor UI, editor extensions, general Vue adapter, and Vue
editor adapter from the public facade and renders representative Looma surfaces
through Knit (`tools/scripts/verify-knit-consumer.mjs:241`,
`tools/scripts/verify-knit-consumer.mjs:263`).

Then start an isolated Supabase stack from that same detached checkout, run its
migrations and complete pgTAP suite, require the reported file count to match
every discovered SQL test and the assertion count to be nonzero, feed the
resulting local API URL and keys
into a Knit dev server, and execute the required Playwright signup, workspace,
and authoring flow (`tools/scripts/verify-knit-consumer.mjs:525`,
`tools/scripts/verify-knit-consumer.mjs:535`,
`tools/scripts/verify-knit-consumer.mjs:545`,
`tools/scripts/verify-knit-consumer.mjs:586`). Allocate ports dynamically and
rewrite local auth origins so concurrent or stale developer services cannot
satisfy the run accidentally (`tools/scripts/verify-knit-consumer.mjs:149`).
Keep the runtime topology faithful: Knit enables Supabase Realtime because its
presence behavior expects it
([Knit Supabase config](../../../../knit/supabase/config.toml#L23)).

### Treat container-visible filesystem topology as test configuration

On macOS, an ordinary host temporary directory is not automatically a valid
fixture location for a Colima-backed container. During this qualification, the
instructive failure was
deceptive: Supabase started and migrations applied, yet `supabase test db`
returned `NOTESTS` because the pgTAP SQL files lived under a private temporary
path that the Colima VM did not share. That was a mount-visibility failure, not
evidence that the database had no tests.

Place detached consumers under Looma's ignored `.release/tmp` directory inside
`/Users`, which Colima shares with its VM. The verifier makes that location
explicit and documents why the database test container must see it
(`tools/scripts/verify-knit-consumer.mjs:19`,
`tools/scripts/verify-knit-consumer.mjs:387`). Prefer the active Docker
environment, but when it is unavailable, detect and validate Colima's default
socket rather than mutating the developer's global Docker context
(`tools/scripts/verify-knit-consumer.mjs:123`).

### Make late gates fail closed and observable

Represent install, installed graph, build, typecheck, SSR, critical units, full
units, migrations, RLS, and browser behavior as separate gates
(`tools/scripts/verify-knit-consumer.mjs:349`). A successful early gate must not
erase a later failure. The final release gate remains required when the run
failed, the full suite was skipped, or any gate is false
(`tools/scripts/verify-knit-consumer.mjs:613`,
`tools/scripts/verify-knit-consumer.mjs:627`).

Preserve the commit identities, package digest, installed lockfile hash,
executed commands, and per-gate results. Clear older evidence before each attempt
so a current failure cannot coexist with a stale green record
(`tools/scripts/verify-knit-consumer.mjs:317`,
`tools/scripts/verify-knit-consumer.mjs:620`,
`tools/scripts/verify-knit-consumer.mjs:642`). Always stop the app and Supabase
stack and remove the detached worktree and guarded temporary directory, including
after failure (`tools/scripts/verify-knit-consumer.mjs:651`).

## Why This Matters

Exact-tarball installation catches missing assembled files, incorrect subpath
exports, missing runtime dependencies exercised by the consumer, stale
identities, and accidental workspace coupling.
A detached committed harness keeps unrelated Knit work in progress from
changing the proof while still exercising Looma through a real, complex
application integration.

The environment gates catch a different class of release failure. Build and SSR
can succeed even when migrations do not apply, RLS blocks workspace provisioning,
Realtime-dependent behavior is unavailable, or signup fails in Chromium.
Conversely, `NOTESTS` can look like missing database coverage when the defect is
the host-to-VM mount boundary. Treating ports, Docker socket selection, shared
filesystem roots, auth origins, and enabled services as first-class inputs makes
these failures diagnosable instead of flaky.

This proof remains intentionally local. Installing the published Candidate from
npm and running protected deployment/promotion gates are separate release
boundaries (`docs/release-checklist.md:77`, `docs/release-checklist.md:145`).

## When to Apply

- A library consolidates private workspaces behind one public facade and package
  assembly can diverge from source layout.
- A release uses a separately versioned application harness whose
  deepest risks appear only after database or browser startup.
- Local development uses `file:`, `link:`, or workspace resolution, so a normal
  consumer build cannot prove registry-install behavior.
- Docker or a VM-backed runtime must read tests or fixtures created by a host-side
  qualification script.
- A late failing gate must leave enough commit-bound evidence to distinguish
  artifact, consumer, database, browser, and infrastructure failures.

Use a shallower consumer proof only when the artifact has no environment-dependent
integration harness. Even then, exact packed-byte installation plus lockfile and
realpath isolation are the minimum proof of a package boundary.

## Examples

The intended local sequence is:

```sh
pnpm release:verify
pnpm release:verify-knit
```

The first command creates and verifies the Candidate tarball. The second runs
the detached Knit qualification (`package.json:43`, `package.json:44`). Neither
command publishes to npm.

An unsafe shortcut runs Knit from its live sibling `file:` dependency and reports
a green build. Knit's development manifest deliberately uses that local dependency
for iteration ([Knit web manifest](../../../../knit/web/package.json#L33)), while qualification rewrites only
the detached copy to `0.1.0`, disables workspace linking, and rejects local Looma
references afterward (`tools/scripts/verify-knit-consumer.mjs:228`,
`tools/scripts/verify-knit-consumer.mjs:466`,
`tools/scripts/verify-knit-consumer.mjs:288`).

Another unsafe shortcut creates the detached worktree under the operating
system's private temporary directory. With Colima, the application and migrations
may look healthy while containerized pgTAP sees no SQL files. Put the worktree
under the repository's ignored `.release/tmp`, isolate Supabase ports, and run
the browser against the keys returned by that exact stack
(`tools/scripts/verify-knit-consumer.mjs:387`,
`tools/scripts/verify-knit-consumer.mjs:532`,
`tools/scripts/verify-knit-consumer.mjs:545`).

## Related

- [Release 1 Checklist](../../release-checklist.md) — mutable go/no-go status and current evidence
- [Release 1 Plan](../../plans/2026-08-31-1018-refactor-public-facade-package-plan.md) — singleton-facade design intent and release-unit boundaries
- [npm identity migration](npm-namespace-is-artifact-graph-identity.md) — graph-wide handling for package identity changes
- [Public Release Runbook](../../public-release.md) — protected publication and promotion flow
