# Architecture

Granola UI is organized as a platform-first monorepo where authored SSR HTML is canonical and runtime JavaScript progressively enhances behavior.

## Package Topology

```txt
apps/docs
apps/storybook
packages/tokens
packages/layout
packages/core
packages/react
packages/vue
packages/svelte
```

## Dependency Flow

```txt
@ui/tokens -> @ui/layout -> apps/docs/apps/storybook
        \         \
         \         -> @ui/core -> @ui/react
          \                     -> @ui/vue
           \                    -> @ui/svelte
            --------------------> docs apps
```

## Responsibilities

- `@ui/tokens`: semantic design tokens and theme files.
- `@ui/layout`: spacing/layout primitives with the no-external-margin rule.
- `@ui/core`: light DOM primitives and essentials.
- `@ui/react`, `@ui/vue`, `@ui/svelte`: thin adapters with parity contracts.
- `@ui/docs`, `@ui/storybook`: documentation surfaces for reference and testing.
