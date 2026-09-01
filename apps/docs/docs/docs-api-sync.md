# Docs/API Sync Workflow

The component API source of truth is generated from component implementations in:

- `packages/core/src/components/**`
- `packages/layout/src/index.ts`

The generator also reads the intro line from each component MDX page to keep short human-readable descriptions in sync with docs.

## Commands

- `pnpm generate:api` regenerates `generated/component-api.json`.
- `pnpm check:docs-sync` fails if `generated/component-api.json` is stale.
- `pnpm generate:docs` currently aliases API generation for docs consumers.

## Consumers

- Docusaurus API tabs render from `generated/component-api.json` through reusable MDX components in `apps/docs/src/components`.
- Storybook stories use `createComponentArgTypes()` and `createComponentDocsParameters()` from `apps/storybook/stories/shared/componentApi.ts`.

## Updating Component APIs

1. Update component class attributes/properties/events in `@threadlabs/looma` or `@threadlabs/looma/layout`.
2. Regenerate metadata with `pnpm generate:api`.
3. Run `pnpm check:docs-sync` and commit generated output.
