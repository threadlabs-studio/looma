---
slug: /
---

# Getting Started

Granola UI is a platform-first monorepo for SSR-first, light DOM web components plus thin framework adapters.

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
import "@ui/tokens/tokens.css";
import "@ui/tokens/theme-light.css";
import "@ui/layout/layout.css";
import "@ui/core/styles.css";
import "@ui/layout";
import "@ui/core";
```

## Principles

- SSR semantic HTML is the source of truth.
- Components progressively enhance authored markup.
- Layout owns spacing via `gap`; components do not set external margins.
