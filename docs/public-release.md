# Public Release Readiness

This note tracks the remaining setup for publishing Looma from the public
`threadlabs-studio/looma` repository. It is intentionally separate from the
implementation roadmap so package ownership decisions stay visible.

## Current State

- The repository license is MIT.
- Package manifests include GitHub repository, issues, homepage, and MIT
  license metadata.
- The R1 package graph and protected release workflow target one Candidate
  package, `@threadlabs/looma`, with explicit core, layout, editor, Vue, and CSS subpaths.
- `@threadlabs/looma@0.1.2` is public under the non-default `candidate` tag with
  verified package metadata, integrity, provenance, and a clean public-registry
  Knit consumer. Qualified `0.1.1` remains under `latest` until the protected
  promotion moves the same immutable `0.1.2` bytes.
- The canonical GitHub repository is public and the current release workflow is
  on `main` behind exact-commit CI and protected-environment approval gates.
- GitHub Pages serves the verified indexable `0.1.1` documentation at
  `https://threadlabs-studio.github.io/looma/`. Protected workflow run
  `33697496658` bound the deployment and hosted-route evidence to the exact
  `0.1.1` Candidate source. The exact `0.1.2` hosted-docs evidence must be
  refreshed before promotion. The `docs-preview`, `docs-production`, and
  `npm-release` environments require review from the repository owner.
- The protected `npm-release` environment contains separate npm credentials:
  `NPM_PREFLIGHT_TOKEN` for identity, organization, profile, and name-availability
  reads, and short-lived `NPM_TOKEN` for package-scoped Bypass 2FA publication and
  promotion. No repository-level npm credential is used. Now that the package
  exists, trusted publishing must be configured and the bypass token revoked;
  npm warns that Bypass 2FA tokens will be restricted by January 2027.

## Npm Namespace Decision

The implemented R1 contract uses `@threadlabs/looma` as its sole public package.
Consumers select `@threadlabs/looma/core`, `/layout`, the complete Tiptap-backed
`/editor`, its low-level `/editor/ui` or focused `/editor/extensions` subpaths,
general `/vue`, Tiptap-backed `/vue/editor`, or an explicit CSS subpath. The private workspace
names are assembly inputs, not consumer identities.

The owner approved `@threadlabs/looma` as the permanent public identity after
the authenticated release identity could not prove access to the existing
`@looma` organization. The migration is intentionally atomic across manifests,
internal dependencies, Knit, generated API metadata, examples, docs, lockfiles,
release policy, and registry tests. React and Svelte remain unpublished in R1.

## Release 1 Remaining Operator Sequence

1. Use the manifest-bound promotion and release-finalization jobs, which execute
   from the original Candidate commit even after release-tooling changes advance
   `main`.
2. Supply the public Knit qualification record and hosted-docs artifact, with their
   exact SHA-256 values and credential-free HTTPS locations, for the protected
   promotion dispatch.
3. Re-run the clean public-registry consumer inside the promotion job, promote
   `0.1.2` from `candidate` to `latest`, verify both tags and integrity, and create
   the immutable tag and GitHub Release record from the Candidate source commit.
4. Configure npm trusted publishing for the repository/workflow/environment
   binding, revoke `NPM_TOKEN`, and prove the retired bootstrap credential cannot
   be reused. Retain or rotate the read-only preflight credential only while the
   namespace checks require it.
5. Keep the defective `0.1.0` migration notice and retain `0.1.1` as an
   immutable prior release after `0.1.2` is verified under `latest`.

The detailed go/no-go source is [Release 1 Checklist](./release-checklist.md).
