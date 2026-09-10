# `ui-chip`

## Purpose

Compact non-interactive metadata with `tag` and `pill` appearances.

## SSR Markup Contract

```html
<ui-chip appearance="tag">Research</ui-chip>
```

## Attributes and properties

- `appearance: "tag" | "pill"` (default: `"tag"`)
- `size: "xs" | "sm"` (default: `"xs"`)

## Events and keyboard behavior

- None. Wrap the component in a semantic link or button for interaction.

## Theming

Consumers may provide `--ui-chip-surface`, `--ui-chip-text`, and
`--ui-chip-border`. The border applies to the `pill` appearance; `tag` uses its
filled silhouette without an outline. Looma owns compact regular density,
typography, and shape; use `size="sm"` when the default `xs` label is too quiet.
Its visible surface lives inside the shadow root so page
resets can compose the host without collapsing the chip around its text.
