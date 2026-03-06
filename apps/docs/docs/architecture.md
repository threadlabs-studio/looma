# Architecture

Looma UI is organized as a platform-first monorepo where authored SSR HTML is canonical and runtime JavaScript progressively enhances behavior.

It is the official UI library of [Knit](https://knit.wiki), but all public APIs remain domain-neutral so the same components can be used across non-Knit applications.

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
@looma/tokens -> @looma/layout -> apps/docs/apps/storybook
        \         \
         \         -> @looma/core -> @looma/react
          \                     -> @looma/vue
           \                    -> @looma/svelte
            --------------------> docs apps
```

## Responsibilities

- `@looma/tokens`: semantic design tokens and theme files.
- `@looma/layout`: spacing/layout primitives with the no-external-margin rule.
- `@looma/core`: light DOM primitives and essentials.
- `@looma/react`, `@looma/vue`, `@looma/svelte`: thin adapters with parity contracts.
- `@looma/docs`, `@looma/storybook`: documentation surfaces for reference and testing.
