# Looma Agent Guide

This file is the canonical guidance for AI coding agents in this repository.
`CLAUDE.md` imports it; do not duplicate rules elsewhere.

## Repository

- pnpm workspace (`pnpm@10`, Node 20+). The only package is `packages/looma`
  (`@threadlabs/looma`). Each component lives in
  `packages/looma/src/components/<tag>/` as its HTML definition, controller, and
  examples; that source is authoritative — never regenerate it from older shapes.
- `apps/docs` (Docusaurus) and `apps/storybook` are private workspaces.
- Architecture: `docs/architecture.md`. Naming, events, slots, and SSR rules:
  `docs/conventions.md` and `docs/event-schema.md`. Support promises:
  `docs/release-support-matrix.md`. Comments: `docs/code-documentation-policy.md`.
  Vocabulary: `CONCEPTS.md`.
- Past fixes and patterns live in `docs/solutions/`; search there before
  debugging a familiar-looking failure.

## Commands

```sh
pnpm build          # package, then apps
pnpm typecheck
pnpm lint
pnpm test           # tools/scripts/*.test.mjs, package build, then workspace tests
pnpm test:browser
pnpm format         # dprint, for component HTML
pnpm generate:api   # regenerate component API metadata after contract changes
pnpm check:code-documentation
pnpm dev:docs
pnpm dev:storybook
```

Run the narrowest relevant check while iterating and report exactly what ran.
Never claim a check passed unless it was run.

## Component Rules

- Accessibility first and mobile first.
- Authored semantic HTML must work before JavaScript; upgrade attaches behavior
  without rewriting the tree shape.
- Importing public entry points during SSR must not touch `window`, `document`,
  `HTMLElement`, or a custom-element registry at module evaluation.
- Components never set external margins; layout primitives own spacing.
- Composition over configuration; no global magical state.
- Framework adapters translate conventions only; they must not diverge in
  behavior from the underlying contract.
- Use Lucide icons from `LOOMA_ICONS`, never Unicode glyphs as icon stand-ins.

## Releases and Docs

- Merging a change to `packages/looma/src` releases it: once CI passes, the
  release workflow publishes the next patch to npm `latest` and tags it
  `vX.Y.Z`. Nothing to bump by hand. `main` only takes pull requests, so the
  release never commits back to it: `main`'s manifests keep the last version a
  pull request declared, and npm plus the tags record every patch since. For a
  minor or major, set the version ahead of the registry in the PR
  (`node tools/scripts/release-version.mjs --apply 0.8.0`) and it publishes as
  declared. Add a `CHANGELOG.md` entry with the change.
- Every green `main` redeploys the docs site (`.github/workflows/docs.yml`).
- Looma is pre-1.0: breaking changes bump the minor version.

## Public Repository Hygiene

This repository and its docs are public.

- Keep APIs, names, examples, and docs app-agnostic. Never add domain-specific
  names or behavior for a particular downstream consumer.
- Never name private downstream apps, internal roadmaps, or personal context in
  tracked files, commit messages, or PR descriptions.
- Do not commit screenshots, fixtures, or evidence captured from private apps.

## Git

- Branch from `main`; commit or push only when asked.
- Use Conventional Commit messages (`feat(scope): ...`, `fix(scope): ...`).
