# Public Release Readiness

This note tracks the remaining setup for publishing Looma from the public
`threadlabs-studio/looma` repository. It is intentionally separate from the
implementation roadmap so package ownership decisions stay visible.

## Current State

- The repository license is MIT.
- Package manifests include GitHub repository, issues, homepage, and MIT
  license metadata.
- The existing package graph uses the `@looma/*` scope internally.
- CI builds, typechecks, and tests the workspace, but does not publish packages.

## Npm Naming Plan

The user already owns the `@threadlabs` npm organization. The lowest-surprise
public package plan is to keep Looma as a multi-package workspace and publish
under Threadlabs-owned names:

- `@threadlabs/looma-core`
- `@threadlabs/looma-tokens`
- `@threadlabs/looma-layout`
- `@threadlabs/looma-react`
- `@threadlabs/looma-vue`
- `@threadlabs/looma-svelte`
- `@threadlabs/looma-editor`

Do not rename package manifests casually. The current `@looma/*` names appear
in workspace dependencies, docs, generated API metadata, examples, and adapter
imports. Rename them in a dedicated migration so the generated docs and package
lock all move together.

## Before First Publish

1. Decide whether the public import surface should be `@threadlabs/looma-*`
   packages or a single `@threadlabs/looma` package with subpath exports.
2. Rename package manifests and internal workspace dependencies in one commit.
3. Regenerate API metadata and update docs/examples to match the chosen names.
4. Add release automation or a documented manual publish command.
5. Run `pnpm install --frozen-lockfile`, `pnpm generate:api`,
   `pnpm check:docs-sync`, `pnpm typecheck`, `pnpm build`, `pnpm test`,
   `pnpm build:docs`, and `pnpm build:storybook`.
6. Publish only after explicit approval.
