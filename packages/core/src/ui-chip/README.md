# `ui-chip`

## Purpose

Compact non-interactive metadata with `tag` and `pill` appearances.

## SSR Markup Contract

```html
<ui-chip appearance="tag">Research</ui-chip>
```

## Attributes and properties

- `appearance: "tag" | "pill"` (default: `"tag"`)

## Events and keyboard behavior

- None. Wrap the component in a semantic link or button for interaction.

## Theming

Consumers may provide `--ui-chip-surface`, `--ui-chip-text`, and
`--ui-chip-border`; Looma owns its compact xs regular density, typography, and shape.
