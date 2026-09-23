# Tokens

Looma is themed with CSS custom properties, in three layers: a contract you set, derived values
computed from it, and per-component tokens for deliberate divergence.

## Files

- `@threadlabs/looma/tokens.css`: the contract and everything derived from it.
- `@threadlabs/looma/theme-light.css`, `theme-dark.css`, `theme-high-contrast.css`: the palettes.

```css
@layer tokens, base, components, utilities;
```

## The contract

These are the values a product sets. Everything else derives from them, so a theme that sets only
these still looks coherent.

| Group | Values |
| --- | --- |
| Intent colour | `--ui-accent`, `-hover`, `-active`, `-subtle`, `--ui-on-accent`, `--ui-danger`, `--ui-danger-hover`, `--ui-on-danger`, `--ui-success`, `--ui-warning`, `--ui-info` |
| Neutrals | `--ui-surface`, `-raised`, `-muted`, `-sunken`, `--ui-text`, `-secondary`, `-muted`, `--ui-border`, `-strong` |
| Disabled | `--ui-disabled-surface`, `--ui-disabled-text` |
| Focus | `--ui-focus-ring`, `--ui-focus-halo` |
| Type | `--ui-font-sans`, `--ui-font-mono`, `--ui-font-size`, `-sm`, `--ui-font-medium`, `--ui-line-height` |
| Space | `--ui-space-1` … `--ui-space-4` |
| Radius | `--ui-radius-sm`, `-md`, `-lg`, `-round` |
| Elevation | `--ui-shadow-sm`, `--ui-shadow-lg` |
| Motion | `--ui-motion-fast`, `--ui-motion-ease` |
| Controls | `--ui-control-size`, `-size-sm`, `--ui-control-min-block-size`, `--ui-control-border` |

A converted product theme needs about 27 of these; it takes Looma's defaults for the rest.

## Derived values

Everything else in `tokens.css` is computed from the contract: the intent tones (`--ui-accent-solid`,
`*-soft`, `*-strong-surface`), the interaction roles (`--ui-action-*`, `--ui-control-*`), the type
and space steps either side of the contract's own, the elevation names, and the icon sizes.

Do not restate a derived value in a theme. Setting `--ui-accent` gives you `--ui-accent-solid`,
`--ui-action-primary-surface` and the rest for free, and they keep agreeing when the accent changes.

## Component tokens

Each component exposes `--ui-<component>[-<variant>][-<state>]-<property>` for deliberate
divergence, and each falls back to a semantic value. Set one on an element to change that instance,
or in your theme to change the product.

### A component sizes itself from its token

Where a component reads a token for a property, set that token, not the property. A rule of your
own loses to the component's own declaration, which usually reads as the override being ignored:

```css
/* Does nothing: the component sets inline-size from its token. */
.my-row .actions ui-icon-button { inline-size: 0; }

/* Works. */
.my-row .actions ui-icon-button { --ui-icon-button-size: 0; }
```

The component's API tab lists the tokens it reads, and each one names the property it sets.

### Changing a component's default appearance

A component's default is a product decision, so express it in the theme rather than at every call
site. An accent-tinted default button, product-wide:

```css
:root {
  --ui-button-surface: var(--ui-accent-subtle);
  --ui-button-border: var(--ui-accent);
  --ui-button-text: var(--ui-accent-active);
}
```

Point these at the semantic values, not at fixed colours. A pinned colour stops adapting: a hover
tint pinned to one surface's colour disappears on every other surface, and a pinned tone ignores a
later change of accent. Where a product needs both, the prop overrides the theme per instance:
`<ui-button tone="accent">` for an accent action in an otherwise neutral product.

## Typography

Font sizes are `rem`, so a host scales them from the root font size. One exception:
`--ui-control-min-block-size` is `44px`, because WCAG's touch-target minimum counts CSS pixels and
must not shrink with a smaller root font.

`--ui-font-size-ui` is the dense control size used by trees and other information-rich controls.

## Themes

Switch with `data-theme` or let the media queries do it. A theme sets contract values only:

```css
[data-theme="dark"] {
  --ui-surface: #1a1a1a;
  --ui-text: #f0f0ec;
  --ui-accent: #a99bf5;
  --ui-on-accent: #1a1a1a;
}
```

In a dark theme the intent tones are light, so their foregrounds (`--ui-on-accent`,
`--ui-on-danger`) are dark. That is what lets one tone per intent serve both text and solid surfaces.
