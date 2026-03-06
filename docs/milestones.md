# Milestone Plan

## Plan

Ship v1 in four delivery milestones after baseline specs and repository skeleton are stable.

## Task Breakdown With Checkpoints

- Checkpoint 1: Milestone 0 complete with CI baseline.
- Checkpoint 2: Milestone 1 complete with tokens + layout.
- Checkpoint 3: Milestone 2 complete with core primitives.
- Checkpoint 4: Milestone 3 complete with styled essentials.
- Checkpoint 5: Milestone 4 complete with adapters + docs parity.

## Agent Task Split

### Spec Agent

- Deliver `docs/conventions.md`.
- Deliver `docs/overlay-contract.md`.
- Deliver component qualification guide and contract template.
- Review API consistency across all packages.

### Tokens/Theming Agent

- Implement `@ui/tokens` CSS layers and theme files.
- Validate color contrast and reduced motion behavior.
- Provide semantic token mapping docs and examples.

### Layout Agent

- Implement `ui-stack`, `ui-inline`, `ui-cluster`, `ui-grid`, `ui-center`, `ui-separator`.
- Ensure mobile-first behavior and no external margins.
- Add contract README files for each layout primitive.

### Primitives Agent

- Implement `ui-disclosure`, `ui-tabs`, `ui-dialog`, `ui-popover`, `ui-menu`/`ui-menu-item`.
- Implement overlay manager per overlay contract.
- Add keyboard/focus/a11y tests.

### Adapters + Docs Agent

- Implement thin wrappers for React/Vue/Svelte for shipped components.
- Build docs playground with SSR-first copy-paste examples.
- Add API mapping matrices and adapter parity tests.

## Milestone 0: Specs and Skeleton

- Repo scaffold with workspace tooling.
- Baseline package build scripts.
- Docs stubs for conventions, overlay, architecture, milestones.
- CI baseline for typecheck/build/test.

## Milestone 1: Tokens + Layout

- Tokens package ships light/dark themes.
- Layout primitives ship with contracts and demos.
- No-margin composition demo page in docs.

## Milestone 2: Core Primitives

- Disclosure, tabs, dialog, popover, menu shipped.
- Overlay contract implemented.
- Focus and keyboard behavior tested.

## Milestone 3: Styled Essentials

- Button, input, form-field shipped.
- Accessibility validation and examples added.

## Milestone 4: Adapters + Docs

- React/Vue/Svelte wrappers for shipped components.
- SSR contract examples published for each component.
- Adapter parity matrix and copy-paste framework snippets published.
