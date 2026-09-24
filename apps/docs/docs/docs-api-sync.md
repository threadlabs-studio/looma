# Docs/API Sync Workflow

The component API source of truth is each package's maintained `src/declarative/components/*.html`
definition and adjacent controller. The API generator reads prop types and defaults, native roots,
property-only structured inputs, methods, events, slots, dependencies, and component CSS directly
from those files. It reads only the intro line from each component MDX page for a human-readable
description. Legacy classes and source decorators are not API inputs, and no migration converter
runs during normal development.

## Option descriptions

Each option's description is the prose inside its `<prop>` element. The generator carries it into
`generated/component-api.json`, and the API tab shows it beside the option's name. Write it for the
person choosing a value: what the option does, what each value means, and what it pairs with. A
rule test (`tools/scripts/option-docs-rule.test.mjs`) fails on an option with no real description,
such as a name restated as "tone token.". A polymorphic root (`<button as="button|a">`) is listed as
an `as` option with the elements it can render.

## Commands

- `pnpm generate:api` regenerates `generated/component-api.json` for the docs and Storybook consumers.
- `pnpm check:docs-sync` fails if that generated public API output is stale.
- `pnpm generate:docs` currently aliases API generation for docs consumers.
- `pnpm --filter @threadlabs/looma-declarative-build registry` refreshes the shipping registries
  without rewriting component definitions or framework adapters.

## Consumers

- Docusaurus API tabs render from `generated/component-api.json` through reusable MDX components in `apps/docs/src/components`.
- Storybook stories use `createComponentArgTypes()` and `createComponentDocsParameters()` from `apps/storybook/stories/shared/componentApi.ts`.

## Updating Component APIs

1. Update the package-owned declarative definition and controller directly.
2. Regenerate metadata with `pnpm generate:api`.
3. Run `pnpm check:docs-sync` and commit generated output.

Vue adapters are regenerated only at an explicit release checkpoint after the
declarative API has settled.
