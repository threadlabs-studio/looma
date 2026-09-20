# Docs/API Sync Workflow

The component API source of truth is the framework-neutral declarative contract graph in:

- `tools/migrate-html-next/core-contracts.mjs`
- `tools/migrate-html-next/layout-contracts.mjs`
- `tools/migrate-html-next/editor-contracts.mjs`

The generator projects native roots, attributes, property-only inputs, scalar defaults, methods,
events, and slots from those contracts. It reads only the intro line from each component MDX page
for a human-readable description; legacy classes and source decorators are not API inputs.

## Commands

- `pnpm generate:api` regenerates `generated/component-api.json` and the Vue adapter prop/event declarations.
- `pnpm check:docs-sync` fails if either generated public API output is stale.
- `pnpm generate:docs` currently aliases API generation for docs consumers.

## Consumers

- Docusaurus API tabs render from `generated/component-api.json` through reusable MDX components in `apps/docs/src/components`.
- Storybook stories use `createComponentArgTypes()` and `createComponentDocsParameters()` from `apps/storybook/stories/shared/componentApi.ts`.

## Updating Component APIs

1. Update the relevant declarative contract and implementation/controller together.
2. Regenerate metadata with `pnpm generate:api`.
3. Run `pnpm check:docs-sync` and commit generated output.
