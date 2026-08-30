# Public Release Readiness

This note tracks the remaining setup for publishing Looma from the public
`threadlabs-studio/looma` repository. It is intentionally separate from the
implementation roadmap so package ownership decisions stay visible.

## Current State

- The repository license is MIT.
- Package manifests include GitHub repository, issues, homepage, and MIT
  license metadata.
- The R1 package graph and protected release workflow target five `@looma/*`
  Candidate packages: tokens, layout, core, editor, and Vue.
- Unauthenticated registry lookups report all five names as unpublished, but
  this host is not authenticated to npm and therefore cannot prove ownership
  or publication rights for the `@looma` scope.
- The canonical GitHub repository is public, but its release commit has not
  been pushed to `main`, no protected environments exist, and GitHub Pages is
  not configured.

## Npm Namespace Decision

The implemented R1 contract uses these names:

- `@looma/tokens`
- `@looma/layout`
- `@looma/core`
- `@looma/editor`
- `@looma/vue`

The owner must explicitly approve `@looma` as the permanent namespace and prove
that the release identity can publish all five names. A previously identified
fallback is the owner-controlled `@threadlabs` organization, using names such as
`@threadlabs/looma-core`. That fallback is not approved by this document and is
not equivalent to the implemented package graph.

Do not rename package manifests piecemeal. A fallback decision requires one
dedicated migration covering manifests, internal dependencies, Knit, generated
API metadata, examples, docs, the lockfile, release policy, and registry tests.
React and Svelte remain unpublished in R1 regardless of namespace.

## Before First Publish

1. Authenticate an npm owner on a secure operator host and approve either the
   implemented `@looma/*` graph or a dedicated `@threadlabs/looma-*` migration.
2. Configure the GitHub `ci`, `docs-preview`, `docs-production`, and
   `npm-release` environments and required approvers described in the release
   checklist.
3. Push the reviewed release branch, merge it to `main`, and record the exact
   successful `ci.yml` run for the release commit.
4. Run the protected no-index docs preview and record owner review.
5. Run `pnpm install --frozen-lockfile`, `pnpm generate:api`,
   `pnpm check:docs-sync`, `pnpm typecheck`, `pnpm build`, `pnpm test`,
   `pnpm build:docs`, and `pnpm build:storybook`.
6. Publish the exact approved tarballs under `candidate` only after explicit
   registry authorization and every pre-publication gate passes.

The detailed go/no-go source is [Release 1 Checklist](./release-checklist.md).
