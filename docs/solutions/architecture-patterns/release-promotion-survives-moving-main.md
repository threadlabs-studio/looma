---
title: Bind release promotion to immutable Candidate source instead of moving main
date: 2026-09-02
last_updated: 2026-09-02
category: architecture-patterns
module: release-tooling
problem_type: logic_error
component: development_workflow
symptoms:
  - "A valid Candidate could no longer be promoted after a release-tooling fix advanced main."
  - "Promotion and release finalization checked out the workflow revision while validating an older manifest source commit."
  - "Checking out the Candidate fixed source identity but silently replaced newer release-tooling repairs with Candidate-era scripts."
root_cause: identity_mismatch
resolution_type: workflow_change
severity: high
related_components:
  - tooling
  - documentation
tags:
  - immutable-artifacts
  - release-promotion
  - github-actions
  - source-binding
  - moving-main
  - resumable-release
---

# Bind release promotion to immutable Candidate source instead of moving main

## Problem

Candidate publication, documentation deployment, `latest` promotion, and the
immutable GitHub Release are separate protected operations. A workflow fix may
legitimately merge between those operations. If later jobs execute from the new
workflow run's `github.sha`, their checkout no longer equals the source commit
embedded in the Candidate manifest.

The source-equality checks then reject a valid release. Removing those checks
would make the pipeline runnable but would allow promotion scripts, changelog
notes, or release metadata from unrelated source to act on approved artifacts.

## Symptoms

- The Candidate manifest named source commit
  `29149856d402c137b36f8ed45b1a61db485d5dec`.
- A documentation workflow repair advanced `main` to a later commit without
  changing the already-published package bytes.
- `promote-release.mjs` requires checked-out `HEAD` to equal the manifest source.
- `finalize-release.mjs` applies the same requirement before creating the tag or
  GitHub Release.

## Solution

Keep workflow dispatch restricted to current `main`, but treat that revision as
the trusted orchestration definition rather than the release payload source.
After downloading the immutable Candidate manifest, each source-sensitive job:

1. Reads and validates the manifest's full lowercase Git SHA.
2. Snapshots the current reviewed release scripts into the ignored `.release`
   orchestration area.
3. Re-checks out that exact commit with pinned `actions/checkout`.
4. Uses `clean: false` so the previously downloaded, ignored `.release`
   artifacts remain available.
5. Runs Candidate product verification against that exact source tree, while
   promotion and release finalization execute through the snapshotted current
   orchestration scripts.

The workflow-policy test asserts this order independently for the promotion and
release-record jobs: manifest download, source resolution, current-tooling
snapshot, exact checkout, then the first source-sensitive operation. It also
asserts that registry mutation and finalization invoke the snapshot rather than
the Candidate-era copies in `tools/scripts`.

## Why This Works

GitHub evaluates the workflow definition from the approved current `main`, so
security and reliability fixes remain available. The tooling snapshot preserves
the code that implements those fixes before the later checkout changes the
tracked working tree to the Candidate source recorded before publication. The
current scripts still resolve the repository root, so they validate the exact
Candidate package manifests, changelog, Git `HEAD`, immutable tarballs, and
evidence while retaining current orchestration behavior.

This separates two identities that are both necessary:

- **orchestration revision** — the current reviewed workflow definition;
- **orchestration tooling** — current reviewed release logic preserved across
  the source checkout;
- **release source revision** — the commit whose exact bytes were packed,
  published, documented, promoted, tagged, and recorded.

## Prevention

- Model a multi-stage release's source commit as manifest data, never as an
  assumption that the default branch will remain stationary.
- Preserve source-equality guards; change the checkout to match the manifest
  rather than weakening the guard.
- Test workflow step ordering whenever an artifact must be read before the
  correct checkout can be selected.
- Preserve current release tooling before an immutable-source checkout; do not
  assume `clean: false` protects tracked scripts that the checkout replaces.
- Exercise the release-resume path after any post-Candidate workflow repair and
  before the first registry tag mutation.
- Keep downloaded release evidence in an ignored directory and explicitly
  preserve it across the exact-source checkout.

## Related Issues

- [Build generated workspace exports before Docusaurus in clean CI](../build-errors/docs-workflow-misses-generated-workspace-exports.md)
- [Successful hosted Candidate docs run](https://github.com/threadlabs-studio/looma/actions/runs/33697496658)
