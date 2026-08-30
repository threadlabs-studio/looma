---
module: release-tooling
date: 2026-08-30
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - "A library must qualify exact release artifacts against an independently versioned priority consumer before publication."
  - "Consumer work in progress must be recorded for auditability but excluded from canonical release proof."
  - "Workspace links, shared caches, or public-registry fallback could hide package or dependency defects."
root_cause: missing_workflow_step
resolution_type: workflow_improvement
related_components:
  - tooling
  - testing_framework
  - infrastructure
tags:
  - release-qualification
  - cross-project-testing
  - candidate-artifacts
  - verdaccio
  - pnpm
  - knit
  - evidence-integrity
  - clean-consumer
---

# Qualify Exact Candidate Artifacts Through a Clean Priority Consumer

## Context

Looma's release boundary is not complete when its packages merely build and test in their own workspace. Knit is the priority product and the deepest known consumer, so a Looma Candidate must prove that the exact package bytes work in a real application without resolving back to Looma source.

The boundary is intentionally asymmetric. Knit supplies the most demanding product-level proof, but Knit-owned authentication, workspace, page, and data behavior remains outside Looma's product scope. Knit demand decides whether Looma's generic artifacts are fit to release; it does not put Knit vocabulary or business rules into Looma APIs.

Earlier session history reinforces two related controls. Evidence from one source commit cannot qualify another, and independently required evidence must be uploaded separately so one present file cannot mask another missing file. Local tarball qualification also remains distinct from post-publication public-registry qualification; the latter cannot run before the packages exist publicly. (session history)

## Guidance

Treat cross-project qualification as a chain of custody for release bytes, not as a convenient test run.

### Bind one artifact set to one source state

Build and pack the Candidate once. Inspect each packed manifest and tarball, require exact synchronized internal versions, and record a source commit plus SHA-256 for every artifact. The release manifest is the identity of the candidate set; do not silently rebuild between qualification and publication.

The package verifier implements this in [`tools/scripts/verify-packages.mjs`](../../../tools/scripts/verify-packages.mjs). The authoritative release sequence starts with:

```sh
pnpm release:verify
```

### Let only the approved bytes satisfy the Looma scope

Before testing Knit, verify every tarball against the release manifest. Publish only those tarballs, in manifest-derived dependency order, to a disposable loopback registry under the local `candidate` tag.

The registry policy in [`tests/release/registry/verdaccio.yaml`](../../../tests/release/registry/verdaccio.yaml) deliberately gives `@threadlabs/looma-*` no npmjs uplink while allowing unrelated dependencies to proxy normally. A missing Looma artifact must fail instead of being silently repaired by a public package.

### Test a committed Knit snapshot, not live WIP

Record Knit's current commit and live status, then create a detached worktree at that exact commit and require it to be clean. Rewrite Looma dependency specifications only in the temporary checkout. The live dirty-file count belongs in the evidence for transparency, but the live files are not qualification input.

This split preserves both truths: the developer may have valuable work in progress, and release proof must still be reproducible from a committed state.

### Make the install prove isolation

Install in the detached checkout with a fresh package store, workspace preference and linking disabled, and store-integrity verification enabled. After installation:

- reject local Looma references in the generated lockfile;
- require the entire Candidate package graph at the expected version;
- prove direct Looma dependencies resolve inside the isolated Knit checkout; and
- preserve the generated lockfile as evidence rather than changing Knit's source lockfile.

### Run gates from shallow to deep

[`tools/scripts/verify-knit-consumer.mjs`](../../../tools/scripts/verify-knit-consumer.mjs) runs the consumer gates in this order:

1. install and installed-graph validation;
2. production build;
3. typecheck;
4. SSR proof for the Knit-consumed Looma surfaces;
5. the explicitly enumerated signup-critical tests; and
6. the complete Knit unit suite.

Run the full gate under the repository's declared Node 20 runtime:

```sh
pnpm release:verify-knit
```

Inspection mode may skip the full suite only in an explicitly ineligible inspection rehearsal. It always records that the final release gate is still required while preserving the manifest's eligibility as a separate fact. Inspection output is diagnostic evidence, never final release evidence.

### Replace stale success with current failure evidence

Clear prior consumer evidence, copied lockfile, and registry log before attempting qualification. Every controlled failure must write a new result, a sanitized failure, the per-gate map, available source identities, live Knit dirty-file count, artifact hashes, executed commands, and evidence hashes. Cleanup of the registry, temporary worktree, and guarded temporary directory must run even when qualification fails.

Commit `f78a2e9` on the release branch added this fail-closed behavior. That is a local branch fact, not a claim that the change is merged or published.

A trustworthy partial result looks like this:

```json
{
  "result": "failed",
  "gateResults": {
    "installPassed": true,
    "installedGraphPassed": true,
    "buildPassed": true,
    "typecheckPassed": true,
    "ssrProofPassed": true,
    "signupCriticalTestsPassed": true,
    "fullKnitUnitSuitePassed": false
  },
  "finalReleaseGateRequired": true
}
```

Read the gate map rather than a green subset or an old headline. The mutable current status belongs in [`docs/release-checklist.md`](../../release-checklist.md); this learning documents the durable method.

## Why This Matters

Workspace tests cannot prove that packed manifests are correct, runtime files are present, exports resolve from tarballs, internal versions are exact, or an independent application can consume the artifacts. A shared cache, sibling link, or public fallback can produce convincing but irrelevant success.

Using Knit at the release boundary puts product pressure at the right layer. Looma stays generic, while its Candidate must survive the build, type, SSR, and behavior demands of the application that relies on it most.

Failure evidence is part of the release control, not merely logging. A failed run must replace stale success-looking artifacts with a commit-bound red record; otherwise a clean temporary environment can coexist with an ambiguous and unsafe release decision.

## When to Apply

- A library release depends materially on a separately versioned application.
- Approval must cover the exact tarball bytes that may be published.
- Scoped packages could fall back to a public registry and hide a missing Candidate artifact.
- The consumer checkout may contain unrelated live work that cannot contaminate canonical proof.
- Several increasingly expensive gates need trustworthy partial results when a late gate fails.

Do not apply this pattern by copying consumer domain concepts into the library. Add or refine generic Looma APIs only when Knit exposes a reusable need; keep Knit-specific correctness in Knit and make it evidence at the boundary.

## Examples

The pre-publication sequence is:

```sh
pnpm release:verify
pnpm release:verify-knit
```

The first command creates and verifies one exact Candidate artifact set. The second qualifies that set through a detached clean Knit commit. Neither command publishes to npm.

An unsafe shortcut installs Knit from the live developer checkout with its existing store and ordinary registry fallback, then reports a green build. That result cannot distinguish artifact correctness from workspace links, cached packages, public versions, or uncommitted fixes.

## Related

- [Release 1 Checklist](../../release-checklist.md) — mutable go/no-go status and current evidence
- [Release 1 Plan](../../plans/2026-08-30-0109-feat-looma-r1-release-plan.md) — design intent and release-unit boundaries
- [Component Qualification Guide](../../component-qualification-guide.md) — Candidate evidence profiles
- [Public Release Runbook](../../public-release.md) — protected publication and promotion flow
