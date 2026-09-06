# `ui-callout`

## Purpose

Static semantic message surface with a tone icon.

## SSR Markup Contract

```html
<ui-callout tone="warning">Review this before publishing.</ui-callout>
```

## Attributes and properties

- `tone: "info" | "note" | "warning" | "success" | "error"` (default: `"info"`)

## Events and keyboard behavior

- None. The component is a static `role="note"`, not a live alert, and does
  not offer a close action.

## Slots/Children

- Default slot for the callout message.
