# Looma Agent Guide

This file is the canonical guidance for AI coding agents in this repository.
`CLAUDE.md` imports it; do not duplicate rules elsewhere.

## Repository

- pnpm workspace (`pnpm@10`, Node 22.13 or 24). The only package is `packages/looma`
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
- An accent edge (a colored `border-inline-start` stripe) keeps the corners on its side
  straight; never round a corner that a stripe runs into.
- Style a nested component only through its props or the custom properties it
  supports; never select its root (HTML Next scoping never matches it).

## Composed editor controls

Only the explicitly approved sources in `tools/style-source-allowlist.json` may
own styles. A new file inside this repository is not automatically approved.
Compositions use existing components and props, including layout components;
missing options belong on an approved primitive. Do not expand the allowlist or
frozen CSS/inline-style exceptions to make a failed build pass. A new visual
primitive requires an agreed contract and comparison with neighbouring controls
before it can be approved. Package builds enforce this boundary. Existing editor
styling is recorded as frozen debt: it may be removed, but cannot grow or change.

The editor is a primary product surface. Give its UX/UI deliberate scrutiny:
editing tools must remain calm, obvious, and consistent as their number grows.
Slash menus and popovers share their field, row, selection, focus, and action
patterns. Inspect both a full picker and its compact existing-item controls;
test success is necessary but does not replace visual review.

The editor is a consumer of the design system, not an exception to it. Before
adding a control, inspect the existing component and a comparable composed
surface. Searchable popovers use InputGroup/Input, SearchResultRow, and standard
Button variants; do not recreate their native controls or focus styling with
`h("button")`, `h("input")`, or control-specific CSS. Native component definitions
remain the primitive source. The editor composition policy tracks existing debt;
its counts may only shrink (hidden platform file inputs are named exceptions).

Describe the writer's flow before composing a new picker: accepted input,
result choice, selected state, cancellation, and primary action. Do not add a mode
switch when one field can infer the intent reliably. Check keyboard, touch at
375px, and the visual hierarchy beside existing controls; functional tests alone
do not establish design-system conformity.

## Changing an API

Every app using Looma pays for a changed API, so the bar is high.

- A rename, removal, changed event, or changed value is a breaking change. Make
  one only with a strong justification, written in the PR description and in
  the CHANGELOG entry: what goes wrong for users or apps today, why an additive
  change (a new option, value, or alias) can't fix it, and how to migrate. "More
  consistent" or "cleaner" is not enough on its own.
- Changing a default needs the strongest justification of all. It silently
  changes behaviour for every app that never set the option. State who is
  affected and why the new default is right for nearly all of them.
- Prefer additive changes. When a clearer name arrives, keep the old one working
  unless keeping it causes real harm.
- The boolean rule (an omitted boolean means `false`) is never by itself a
  reason to change a default or invert a name. If making something the default
  would need a negative name (`modeless`, `no-…`, `disable-…` for an existing
  capability), keep the existing positive option instead.
- Matching a native HTML attribute (for example `<dialog closedby>`) is a good
  reason to adopt its name and values. Say so in the justification.

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
