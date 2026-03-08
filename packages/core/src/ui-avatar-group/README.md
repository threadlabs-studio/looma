# `ui-avatar-group`

## Purpose

Container that displays a row of overlapping avatars (typically `ui-avatar` children) with an optional "+N" overflow pill when the number of children exceeds `max`.

## SSR Markup Contract

```html
<ui-avatar-group max="5" label="People">
  <ui-avatar name="Alex" src="/a.png" alt="Alex"><img /><span data-ui-avatar-fallback></span></ui-avatar>
  <ui-avatar name="Sam" src="/b.png" alt="Sam"><img /><span data-ui-avatar-fallback></span></ui-avatar>
</ui-avatar-group>
```

## Attributes

- `max` — Maximum number of avatars to show before the "+N" overflow pill (default 5).
- `label` — Accessible label for the list (e.g. "People"; default "People").

## Properties

- `max: number`
- `label: string`

## Events

- None.

## Slots/Children

- Default slot: direct children are treated as avatar items. First `max` are visible; the rest are hidden and a "+N" overflow pill is shown.

## Keyboard Behavior

- No custom keyboard behavior.

## ARIA

- Host has `role="list"` and `aria-label` from the `label` attribute. Overflow pill has `role="listitem"` and `aria-label` describing the count.
