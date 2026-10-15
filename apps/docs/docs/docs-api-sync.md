# Docs/API Sync Workflow

The component API source of truth is each component's definition in
`packages/looma/src/components/<tag>/<tag>.html` and its adjacent controller. The API generator
reads prop types and defaults, native roots, events, slots, and component CSS directly from those
files. A component's description, its group, and whether it is a part listed under a parent come
from `tools/data/component-release-classification.json`, so the metadata does not depend on how a
documentation site lays out its pages.

## Option descriptions

Each option's description is the prose inside its `<prop>` element. The generator carries it into
`generated/component-api.json`, and the API tab shows it beside the option's name. Write it for the
person choosing a value: what the option does, what each value means, and what it pairs with. A
rule test (`tools/scripts/option-docs-rule.test.mjs`) fails on an option with no real description,
such as a name restated as "tone token.". A polymorphic root declares an `as` prop and chooses between explicit native
roots with `$match`, so its `as` option is documented like any other prop.

## Commands

- `pnpm generate:api` writes `generated/component-api.json`. The output is not committed: the docs
  build and dev server and Storybook's visual build run it first; run it yourself before
  `pnpm dev:storybook`.
- `pnpm generate:docs` is an alias for `pnpm generate:api`.
- `pnpm --filter @threadlabs/looma build` converts every definition to the published HTML and Vue
  components on each build.

## Consumers

- Docusaurus API tabs and the catalog render from `generated/component-api.json` through components in `apps/docs/src/components`.
- Storybook stories use `createComponentArgTypes()` and `createComponentDocsParameters()` from `apps/storybook/stories/shared/componentApi.ts`.

## Updating Component APIs

1. Update the component's definition and controller directly.
2. For a new or renamed component, add its entry to the classification: status, package,
   description, and a group or a navigation parent.
3. Run `node --test tools/scripts/*.test.mjs`. The generator rejects a published component without
   a description or a known group, and a Docusaurus check confirms each page is filed in its
   group's folder and opens with that description.
