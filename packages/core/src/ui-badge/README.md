# `ui-badge`

## Purpose

Lightweight status and labeling primitive with minimal styling hooks.

## SSR Markup Contract

```html
<ui-badge variant="subtle" tone="accent">Beta</ui-badge>
```

## Attributes

- `variant`
- `tone`

## Properties

- `variant: string`
- `tone: string`

## Events

- None.

## Slots/Children

- Default slot for badge label content.

The badge's token-driven typography, radius, and compact padding live on an
internal shadow surface so page resets cannot remove its text inset.

## Keyboard Behavior

- No custom keyboard behavior.

## ARIA

- Inherits semantics from authored content; no role coercion.
