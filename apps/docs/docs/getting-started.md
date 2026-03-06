---
slug: /
---

# Getting Started

Looma UI is a platform-first monorepo for SSR-first, light DOM web components plus thin framework adapters.

Looma is the official UI library of [Knit](https://knit.wiki). The library is designed to stay reusable across products, with Knit-specific expression handled through theme and composition.

## Install

```bash
pnpm install
```

## Build and Verify

```bash
pnpm typecheck
pnpm build
```

## Run Documentation Apps

```bash
pnpm dev:docs
pnpm dev:storybook
```

## Global Styles

Import tokens and styles once in your app entry:

```ts
import "@looma/tokens/tokens.css";
import "@looma/tokens/theme-light.css";
import "@looma/layout/layout.css";
import "@looma/core/styles.css";
import "@looma/layout";
import "@looma/core";
```

## Principles

- SSR semantic HTML is the source of truth.
- Components progressively enhance authored markup.
- Layout owns spacing via `gap`; components do not set external margins.
