# Release 1 Checklist

This is the go/no-go ledger for Looma Candidate `0.1.0`. A checked source or build
item is evidence, not permission to publish. Registry mutation requires all owner,
security, artifact, consumer, documentation, and rollback gates.

## Registry And Ownership Preflight

- [x] Canonical source repository identified as `threadlabs-studio/looma` on GitHub.
- [x] Unauthenticated public lookup returns no existing package for the five planned names.
- [ ] An authenticated npm owner confirms control of the `@looma` scope.
- [ ] The release identity can publish all five exact package names.
- [ ] The owner approves `@looma` as the permanent public namespace.
- [ ] npm account 2FA and the first-publication bootstrap method are approved.
- [ ] The bootstrap credential is short-lived, publish-only, environment-protected,
  absent from forks/PRs/logs, and scheduled for immediate revocation.

Current blocker: this host is not authenticated to npm (`npm whoami` returns an
authorization error), so package-name absence does not prove scope ownership.

## Contract And Package Gates

- [x] Public R1 package set and deferred workspaces are classified.
- [x] DOM, SSR/no-JS, and module-format promises match current source/build output.
- [x] Layout's formerly false CommonJS export now points to a real CJS build required by the docs server bundle.
- [x] Source-derived classification enforces generated API, docs, navigation,
  supported Vue map/export, and required contract README coverage for all 38 published tags.
- [ ] All five manifests use synchronized `0.1.0`, public access, complete metadata,
  correct peer/internal ranges, and exact export maps.
- [ ] Every packed artifact contains runtime output, types, styles, README, and license,
  and excludes tests, local config, secrets, and source-only material.
- [x] Package DAG and dependency-first publish order are derived from the packed manifests.
- [x] Local inspection packs the five exact `0.1.0` artifacts, rewrites internal
  workspace ranges to exact `0.1.0`, rejects empty/forbidden/missing files, and
  records SHA-256, byte size, source commit, and toolchain.

Current artifact exception: the local manifest is intentionally
`releaseEligible: false` until the source tree is clean and an owner-approved
root/package license is present.

## Verification Gates

- [ ] Declared Node/pnpm runtime passes clean build, lint, typecheck, and tests.
- [ ] Docs generation is deterministic and leaves a clean tree.
- [x] Unit, accessibility, adapter-render, SSR-import, and required Chromium browser gates pass locally without required skips.
- [x] A clean external fixture installs only approved tarballs and consumes every public entry/style.
- [ ] Knit installs only the approved tarballs and passes build plus release-critical browser/component gates.
- [x] E-TBL-003 is explicitly accepted as a Candidate visual limitation with
  browser accessibility/keyboard evidence and Tiptap data-integrity proof.

The remaining declared-runtime and clean-generation checks require the committed
U4 tree to pass the Node 20 CI job. The job installs Chromium, checks generated
output immutability, rejects skipped required suites, and runs core, editor, and
Vue browser qualification. The exact Stencil CJS filename diagnostic is the sole
allowlisted build warning; any additional Stencil warning fails the build.

## Publication Controls

- [x] The release workflow is manual, main-only, serialized, environment-gated,
  and declares minimal per-job permissions.
- [x] Third-party actions are pinned to full commit SHAs and checkout credentials are not persisted.
- [x] The generated manifest captures approved tarballs, SHA-256 hashes, source
  commit, toolchain, dependency-first package order, and planned tags.
- [ ] The protected-run manifest also records evidence locations and accountable
  npm, documentation, and Knit approval owners.
- [ ] The repository owner configures the protected `npm-release` environment,
  required approvers, and first-publication credential or trusted publisher.
- [ ] Initial publication uses the non-default `candidate` dist-tag.
- [ ] Registry integrity matches the approved tarballs before any tag promotion.
- [ ] Trusted publishing is configured for each package after bootstrap and bootstrap reuse fails after revocation.
- [ ] Public install docs and hosted component docs resolve and match the released contract.
- [ ] Owner approves promotion of the same immutable versions from `candidate` to `latest`.

## Current npm Platform Requirements

For the protected workflow, verify the current npm requirements immediately before
publication. The present design assumes a GitHub-hosted runner, exact repository
and workflow binding, `id-token: write` plus `contents: read`, npm CLI 11.5.1 or
newer, Node 22.14 or newer for trusted publishing, and matching public repository
metadata for automatic provenance. Scoped public packages require public access.

Authoritative references:

- [Creating and publishing scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [Trusted publishers](https://docs.npmjs.com/trusted-publishers/)
- [Generating provenance statements](https://docs.npmjs.com/generating-provenance-statements/)
- [Requiring two-factor authentication](https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/)
- [Staged publishing](https://docs.npmjs.com/staged-publishing/)
