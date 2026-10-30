# Looma Agent Guide

This file is the canonical guidance for AI coding agents in this repository.
`CLAUDE.md` imports it; do not duplicate rules elsewhere.

## Repository

- pnpm workspace (`pnpm@10`, Node 22.22.2+ or 24.15+). The only package is `packages/looma`
  (`@threadlabs/looma`). Each component lives in
  `packages/looma/src/components/<tag>/` as its HTML definition, controller, and
  examples; that source is authoritative — never regenerate it from older shapes.
- `apps/docs-next` is the public MarkupKit/Markupress site at `/looma/`; it consumes
  the same package-shipped documentation generator as downstream projects.
  `apps/docs` is the retained Docusaurus parity fixture. Both and `apps/storybook`
  are private workspaces.
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
pnpm docker:clean    # remove stopped Looma containers and unused Looma volumes
```

Run the narrowest relevant check while iterating and report exactly what ran.
Never claim a check passed unless it was run.

CI prioritizes affected package tests in parallel: routine fixes target five
minutes, and the configured qualification/publication path is capped at sixteen
minutes of runner work; npm's availability wait after upload has its own bound.
Chromium is the automatic browser engine; exhaustive docs, visual and
cross-browser sweeps require explicit extended verification. Unknown
executable inputs need an owner mapping. See
`docs/change-dependent-qualification.md` for selection, deferred cases and limits.

## Component Rules

- Accessibility first and mobile first.
- Authored semantic HTML must work before JavaScript; upgrade attaches behavior
  without rewriting the tree shape.
- Importing public entry points during SSR must not touch `window`, `document`,
  `HTMLElement`, or a custom-element registry at module evaluation.
- Components never set external margins; layout primitives own spacing.
- Line heights use unitless multipliers of each text role’s font size, never px or rem lengths. Shared rhythm coordinates leading and layout gaps; spacing can refine gaps independently.
- Visible control proportions and hit areas are separate. Touch-size guidance is contextual and adjustable; do not impose a 44px floor by inflating the visible size ladder. Compact controls stay compact on touch. Enlarge invisible targets only where they fit without stealing neighbouring controls; do not turn recommendations into universal layout invariants.
- Composition over configuration; no global magical state.
- Framework adapters translate conventions only; they must not diverge in
  behavior from the underlying contract.
- Use Lucide icons from `LOOMA_ICONS`, never Unicode glyphs as icon stand-ins.
- An accent edge (a colored `border-inline-start` stripe) keeps the corners on its side
  straight; never round a corner that a stripe runs into.
- Style a nested component only through its props or the custom properties it
  supports; never select its root (HTML Next scoping never matches it).

## Consumer styling boundary

Looma owns the internal layout of each component. Normal application CSS, including
inline styles, must not change its declared flow, alignment, or spacing. Those
declarations use `!important`; supported props and public custom properties remain
the normal customization interface. An application author can deliberately opt out
with an explicit `!important` override, subject to the CSS cascade. Do not generate
that escape hatch to make a theme or composition fit.

A visual mismatch is evidence of a missing shared primitive or public capability,
not permission to style nested inputs, labels, runtime markers, or private variables.
Fix the responsible approved primitive and test its consumers. A theme describes
shared semantics; do not add per-component knobs merely to reproduce an inconsistent
reference. Compare related controls and first-line alignment across typography,
wrapping, descriptions and sizes. The package build checks ownership priority.

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

Before 1.0, do not add or retain compatibility aliases, deprecated spellings,
fallback APIs or migration shims solely to preserve a superseded contract.
Remove the old name and update its callers, examples and tests together. Record
the change and migration in the changelog. The stability guidance below applies
from 1.0; it must not be used to recreate compatibility layers before then.

- From 1.0, a rename, removal, changed event, or changed value is a breaking change. Make
  one only with a strong justification, written in the PR description and in
  the CHANGELOG entry: what goes wrong for users or apps today, why an additive
  change (a new option, value, or alias) can't fix it, and how to migrate. "More
  consistent" or "cleaner" is not enough on its own.
- Changing a default needs the strongest justification of all. It silently
  changes behaviour for every app that never set the option. State who is
  affected and why the new default is right for nearly all of them.
- From 1.0, prefer additive changes. When a clearer name arrives, keep the old one working
  unless keeping it causes real harm.
- The boolean rule (an omitted boolean means `false`) is never by itself a
  reason to change a default or invert a name. If making something the default
  would need a negative name (`modeless`, `no-…`, `disable-…` for an existing
  capability), keep the existing positive option instead.
- Matching a native HTML attribute (for example `<dialog closedby>`) is a good
  reason to adopt its name and values. Say so in the justification.

## Releases and Docs

- Merging a package change (sources, documentation tooling, command launcher,
  build inputs or manifest) releases it: once CI passes, the
  release workflow publishes the next patch to npm `latest` and tags it
  `vX.Y.Z`. Nothing to bump by hand. `main` only takes pull requests, so the
  release never commits back to it: `main`'s manifests keep the last version a
  pull request declared, and npm plus the tags record every patch since. For a
  minor or major, set the version ahead of the registry in the PR
  (`node tools/scripts/release-version.mjs --apply 0.8.0`) and it publishes as
  declared. Add the `CHANGELOG.md` entry under `## Next release` at the top;
  never write a version heading for it. The release commit names that heading
  `## vX.Y.Z` for the version it publishes (`tools/scripts/release-commit.mjs`),
  and a merge that releases nothing leaves its entry for the next release. main
  never receives that commit, so shipped entries can linger under Next release
  there; the next release files them under their versions. Optionally, to tidy
  main, run `git fetch --tags` and `node tools/scripts/release-commit.mjs --changelog`.
- Every green `main` redeploys the package-generated MarkupKit docs site
  (`.github/workflows/docs.yml`, `apps/docs-next/site`).
- Documentation metadata and examples live beside their component definitions.
  The package owns the renderer, reusable cards and customizer in
  `packages/looma/tooling/docs`; the public site supplies configuration and authored
  guides. Read that directory's `README.md` for discovery and theme contracts.
  Fix shared behavior there rather than creating a public-site-only implementation.
- Author new design-system components and documentation examples in HTML Next.
  The approved next packaging phase removes distributed Vue components; Vue
  consumers will use the HTML Next Vite plugin or converter. Until that migration
  lands, existing generated Vue checks still apply; do not add a second authored
  Vue implementation.
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

- Use minimum-version ranges for Threadlabs and Nextwebwg dependencies without speculative 1.0 or later-major ceilings. Lockfiles record exact tested resolutions. Restrict a range only for a demonstrated API requirement or verified incompatible release, and record the evidence. Experimental status does not justify exact pins.
