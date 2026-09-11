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
- `@threadlabs/looma@0.1.25` is public under the non-default `candidate` tag with
  verified package metadata, integrity, provenance, and a clean public-registry
  consumer. Qualified `0.1.13` remains under `latest` until the protected
  promotion moves an approved immutable Candidate.
- Candidate `0.1.25` was published from commit
  `8b647b2f0387532921ee033f73c95163cd680bbb` by workflow run
  `34536417750` after exact-main CI passed.
- The canonical GitHub repository is public and the current release workflow is
  on `main` behind exact-commit CI and protected-environment approval gates.
- GitHub Pages serves the verified indexable `0.1.1` documentation at
  `https://threadlabs-studio.github.io/looma/`. Protected workflow run
  `33697496658` bound the deployment and hosted-route evidence to the exact
  `0.1.1` Candidate source. The exact `0.1.2` hosted-docs evidence must be
  refreshed before promotion. The `docs-preview`, `docs-production`, and
  `npm-release` environments require review from the repository owner.
- npm trusted publishing binds `@threadlabs/looma` to `release.yml` in the
  `npm-release` GitHub environment. Candidate publication uses GitHub OIDC and
  no npm token; the bootstrap publishing path has been removed.

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

1. Qualify Candidate `0.1.25` in Knit from the exact public registry bytes.
2. For any earlier Candidate promotion, use the manifest-bound promotion and
   release-finalization jobs, which execute
   from the original Candidate commit even after release-tooling changes advance
   `main`.
3. Supply the public Knit qualification record and hosted-docs artifact, with their
   exact SHA-256 values and credential-free HTTPS locations, for the protected
   promotion dispatch.
4. Re-run the clean public-registry consumer inside the promotion job, promote
   the approved Candidate from `candidate` to `latest`, verify both tags and integrity, and create
   the immutable tag and GitHub Release record from the Candidate source commit.
5. Remove obsolete npm publishing secrets after any still-required
   candidate-to-`latest` promotion. Future publication must remain OIDC-only.
6. Keep the defective `0.1.0` migration notice and retain prior Candidate
   records as immutable release history.

The detailed go/no-go source is [Release 1 Checklist](./release-checklist.md).
