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
- Unauthenticated registry lookup reports the name as unpublished. This
  host is authenticated to npm as `matthew-dean`, with account-level 2FA set to
  `auth-and-writes`, and that identity owns the `@threadlabs` organization.
- The canonical GitHub repository is public, but its release commit has not
  been pushed to `main`.
- GitHub Pages is configured for Actions at
  `https://threadlabs-studio.github.io/looma/`. The `docs-preview`,
  `docs-production`, and `npm-release` environments exist and require review
  from the repository owner. No workflow has been approved or deployed yet.
- No repository-level npm bootstrap secret or trusted publisher is configured.

## Npm Namespace Decision

The implemented R1 contract uses `@threadlabs/looma` as its sole public package.
Consumers select `@threadlabs/looma/core`, `/layout`, `/editor`,
`/editor/extensions`, `/vue`, or an explicit CSS subpath. The private workspace
names are assembly inputs, not consumer identities.

The owner approved `@threadlabs/looma` as the permanent public identity after
the authenticated release identity could not prove access to the existing
`@looma` organization. The migration is intentionally atomic across manifests,
internal dependencies, Knit, generated API metadata, examples, docs, lockfiles,
release policy, and registry tests. React and Svelte remain unpublished in R1.

## Before First Publish

1. Authenticate the `@threadlabs` npm owner on a secure operator host and prove
   the protected release identity can publish the exact package name.
2. Confirm the configured `docs-preview`, `docs-production`, and `npm-release`
   environments and owner reviewer remain intact. CI is an ordinary required
   check, not an approval-gated deployment environment.
3. Push the reviewed release branch, merge it to `main`, and record the exact
   successful `ci.yml` run for the release commit.
4. Run the protected no-index docs preview and record owner review.
5. Run `pnpm install --frozen-lockfile`, `pnpm generate:api`,
   `pnpm check:docs-sync`, `pnpm typecheck`, `pnpm build`, `pnpm test`,
   `pnpm build:docs`, and `pnpm build:storybook`.
6. Publish the exact approved tarball under `candidate` only after explicit
   registry authorization and every pre-publication gate passes.

The detailed go/no-go source is [Release 1 Checklist](./release-checklist.md).
