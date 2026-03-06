# `ui-avatar`

## Purpose

Image/fallback identity primitive that renders initials when an avatar image is unavailable.

## SSR Markup Contract

```html
<ui-avatar name="Alex Morgan" src="/avatars/alex.png" alt="Alex Morgan">
  <img />
  <span data-ui-avatar-fallback></span>
</ui-avatar>
```

## Attributes

- `src`
- `alt`
- `name`
- `fallback`

## Properties

- `src: string`
- `alt: string`
- `name: string`
- `fallback: string`

## Events

- None.

## Slots/Children

- Default slot, typically with an `<img>` and optional fallback element.

## Keyboard Behavior

- No custom keyboard behavior.

## ARIA

- Host exposes `aria-label` using `alt`, then `name`, then `"Avatar"`.
