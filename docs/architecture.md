# Architecture

## Plan

Build a platform-first UI library with a monorepo layout where SSR semantic HTML is the source of truth and runtime JS upgrades behavior progressively.

## Task Breakdown With Checkpoints

- Checkpoint 1: package boundaries and ownership finalized.
- Checkpoint 2: token-to-component styling flow documented.
- Checkpoint 3: adapter parity rules locked.

## Two-Level Diagram

Level 1: packages

```txt
apps/docs
packages/tokens
packages/layout
packages/core
packages/react
packages/vue
packages/svelte
```

Level 2: dependency flow

```txt
@looma/tokens  --->  @looma/layout  --->  apps/docs
      \              \
       \              ---> @looma/core ---> @looma/react
        \                              -> @looma/vue
         \                             -> @looma/svelte
          ---------------------------------> apps/docs
```

## Package Responsibilities

- `@looma/tokens`: theme variables, semantic scales, color/motion/contrast foundations.
- `@looma/layout`: layout primitives that own spacing with `gap` and never external margins.
- `@looma/core`: behavior and semantics primitives in light DOM web components.
- `@looma/react`, `@looma/vue`, `@looma/svelte`: thin adapters that map props/events to core.
- `@looma/docs`: usage guides, SSR examples, accessibility behavior reference.

## Token Flow

- `@looma/tokens` defines primitive and semantic CSS variables in `@layer tokens`.
- Theme files override semantics in `@layer theme`.
- `@looma/layout` and `@looma/core` consume semantic tokens in `@layer components`.
- Apps may add utility classes in `@layer utilities`.

## Adapter Flow

- Core defines canonical contracts: attributes, properties, events, slots, SSR markup.
- Adapters pass through these contracts without behavior divergence.
- Framework wrappers only translate casing and event subscription style.
- Mapping matrix and usage parity examples live in `docs/adapters.md`.
