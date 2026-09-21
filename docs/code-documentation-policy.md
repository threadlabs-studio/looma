# Code documentation policy

Looma's code documentation exists to preserve the reasoning that types and function bodies cannot: contracts, invariants, ownership, lifecycle, and failure behavior. A comment that only restates a symbol name adds maintenance cost without making the system safer.

This policy applies first to the handwritten public surface and to architectural seams where a locally reasonable edit can violate a system-level rule. It does not require comments on mechanical render markup, obvious accessors, or every private helper.

## API authority

The package-owned declarative component definition, controller, and CSS are Looma's maintained
source of truth. The retired Stencil-to-declarative converter was a one-time bootstrap mechanism,
not a build step and not an API authority. Once a component exists in declarative form, maintainers
edit and normalize that implementation directly; they never regenerate it from the historical
Stencil shape.

Generated API metadata and React, Vue, and Svelte adapters are downstream projections of those
framework-neutral contracts. Metadata may be refreshed at deliberate validation checkpoints.
Framework adapters are materialized once at the release checkpoint after the declarative API has
settled, so generator output cannot repeatedly overwrite intentional API corrections during the
migration.

The enforcement boundary is the symbol graph reachable from package export maps and entry points,
not every source-level `export` keyword. This keeps test helpers and private build machinery from
becoming public API by accident.

## What useful documentation records

Document the facts a caller or maintainer must know to use or change a boundary safely:

- `@contract`: observable behavior promised to callers.
- `@invariant`: a condition the implementation must preserve.
- `@ownership`: which layer owns state, mutation, cleanup, or a supplied callback.
- `@lifecycle`: when work starts, becomes stale, is cancelled, or is released.
- `@failure`: errors, fallbacks, ignored input, and partial-success behavior.

Not every symbol needs every facet. Stateful, asynchronous, callback-bearing, or resource-owning APIs should name at least one. Summaries should answer why the boundary exists or what its non-obvious behavior is; they should not translate the identifier into a sentence.

## Public entry points

| Package entry | Durable public surface | Import behavior and ownership |
| --- | --- | --- |
| `@threadlabs/looma-core` | Overlay positioning and management, input modality, icons, drag and drop, field contracts, and declarative attachment | Browser-only import registers the core declarative graph and document input-modality tracking idempotently. |
| `@threadlabs/looma-core/loader` | `defineCustomElements` compatibility hook | Registers the declarative graph; it does not install a custom-element runtime. |
| `@threadlabs/looma-core/declarative` | Registration, attachment, controller lookup, lifecycle management, adoption records, and generated-prop support | Low-level integration entry; importing it alone does not register a package graph. |
| `@threadlabs/looma-layout` | Declarative layout definitions and sidebar resize contracts | Import registers the layout graph. CSS and light DOM continue to own visual layout. |
| `@threadlabs/looma-editor` | Union of `./ui` and `./extensions` | Registers editor UI and loads Tiptap-facing helpers. |
| `@threadlabs/looma-editor/ui` | Editor menu and table event contracts plus overlay geometry helpers | UI emits intent and never mutates an editor document. |
| `@threadlabs/looma-editor/extensions` | Tiptap extensions, presets, formatting state, and command helpers | The application owns editor lifetime and intent wiring; Tiptap is a peer runtime. |
| `@threadlabs/looma-react` | Generated native-root components, handles, and tag map | Import registers core, layout, and editor UI graphs. |
| `@threadlabs/looma-vue` | Generated core/layout wrappers and optional editor entry | Root registration excludes editor; `./editor` opts in. |
| `@threadlabs/looma-svelte` | Generated DOM factories and adapter binding | `bindAdapter.destroy` owns lifecycle cleanup for action-bound listeners. |
| `@threadlabs/looma` | Facade over core, layout, editor, Vue, validation, and CSS entries | The facade has no independent API authority and must preserve source-package parity. |

## Deterministic enforcement path

Add a dependency-free TypeScript compiler API check at `tools/scripts/check-code-documentation.mjs`, initially in report-only mode:

1. Resolve the actual public symbol graph from package export maps and entry points. Exclude generated files and non-package tool entry points from the handwritten-symbol rule.
2. Require a JSDoc summary on every reachable handwritten symbol.
3. Require at least one structured facet tag on stateful or callback-bearing APIs.
4. Reject comments whose normalized words only repeat the symbol and parameter names. Keep this deliberately narrow; it is an anti-tautology check, not a prose-style linter.
5. Resolve links and referenced symbol names through the TypeScript program.
6. Keep an explicit exception file for self-evident literal unions and re-exports. Every exception must include a reason and an expiry date or package version.
7. Emit stable JSON keyed by package and symbol. Ratchet the currently documented set before making the check blocking.

Line count, comment density, and “JSDoc on every declaration” are not quality gates. They reward noise and cannot prove that ownership or lifecycle behavior is captured.

## Deferred before a blocking gate

- Emit per-component descriptions into generated adapters from declarative contract metadata.
- Establish a clean baseline for all handwritten symbols reachable from package entry points.
- Keep release-build internals outside the public API gate.
- Give private migration tools a separate policy if their exported test helpers need enforcement.
