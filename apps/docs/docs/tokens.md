# Tokens

Looma is themed with CSS custom properties, in three layers: a contract you set, derived values
computed from it, and per-component tokens for deliberate divergence.

## Files

- `@threadlabs/looma/tokens.css`: the contract and everything derived from it.
- `@threadlabs/looma/theme-light.css`, `theme-dark.css`, `theme-high-contrast.css`: the palettes.

```css
@layer tokens, base, components, utilities;
```

## Theming colour

Looma's colour comes from **eleven values**. Everything else — every hover, tint, border, muted
text, and disabled colour — is mixed from them, so theming is a matter of stating these and
stopping.

```css
:root {
  /* Intent: what an action means. */
  --ui-accent: #5b55d6;
  --ui-danger: #b4233f;
  --ui-success: #007a33;
  --ui-warning: #b45309;
  --ui-info: #0066cc;

  /* The readable foreground on a filled accent or danger surface. */
  --ui-on-accent: #ffffff;
  --ui-on-danger: #ffffff;

  /* The page, the two surfaces either side of it, and the ink. */
  --ui-surface: #ffffff;
  --ui-surface-raised: #ffffff;
  --ui-surface-sunken: #f0f0ec;
  --ui-text: #1a1a1a;
}
```

A brand change is one line. Setting `--ui-accent` moves the accent's hover, its active state, its
subtle tint, the focus ring, every accent-toned button, and the selected state of every control,
because each is mixed from it.

### What derives from what

| Derived | From | How |
| --- | --- | --- |
| `--ui-text-secondary`, `--ui-text-muted` | ink + page | the ink mixed into the page, 72% and 45% |
| `--ui-border`, `-strong`, `--ui-control-border` | ink + page | the same ramp, at 12%, 25%, and 48% |
| `--ui-accent-hover`, `-active` | accent + ink | toward the ink, for pressure |
| `--ui-accent-subtle`, `--ui-danger-soft` | accent + page | toward the page, for a tint |
| `--ui-disabled-surface`, `--ui-disabled-text` | sunken surface, muted ink | one decision, not a per-component one |
| `--ui-focus-ring` | accent | the focus ring is the accent |

The mixes are directional rather than absolute: they move *toward the ink* or *toward the page*.
In a dark theme the ink is light, so the same mix brightens where it darkened in a light one, and
one set of rules serves both.

Component states derive the same way. A button's disabled colours are its own tone lightened
toward the surface with most of its chroma removed, using relative colour:

```css
--_tone: oklch(from var(--_hue) calc(l + (1 - l) * 0.72) calc(c * 0.22) h);
```

So a disabled danger button still reads as danger, and a retheme carries through without a second
palette to keep in step.

### The rest of the contract

| Group | Values |
| --- | --- |
| Type | `--ui-font-sans`, `--ui-font-mono`, `--ui-font-size`, `-sm`, `--ui-font-medium`, `--ui-line-height` |
| Space | `--ui-space-1` … `--ui-space-4` |
| Radius | `--ui-radius-sm`, `-md`, `-lg`, `-round` |
| Elevation | `--ui-shadow-sm`, `--ui-shadow-lg` |
| Motion | `--ui-motion-fast`, `--ui-motion-ease` |
| Controls | `--ui-control-size`, `-size-sm`, `--ui-control-min-block-size` |

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

Switch with `data-theme` or let the media queries do it. A theme sets the eleven seeds, plus the
shadows if depth should read differently on its surfaces:

```css
[data-theme="dark"] {
  color-scheme: dark;
  --ui-surface: #1a1a1a;
  --ui-surface-raised: #2a2a2a;
  --ui-surface-sunken: #2e2e2e;
  --ui-text: #f0f0ec;
  --ui-on-accent: #1a1a1a;
  --ui-on-danger: #1a1a1a;
  --ui-accent: #a99bf5;
  --ui-danger: #ef6f86;
  --ui-success: #33cc66;
  --ui-warning: #ffaa22;
  --ui-info: #4d9fff;
}
```

`--ui-surface-raised` and `--ui-surface-sunken` are seeded rather than mixed because which
direction reads as "lifted" flips between a light and a dark scheme, and only the theme knows
which one it is.

In a dark theme the intent tones are light, so their foregrounds (`--ui-on-accent`,
`--ui-on-danger`) are dark. That is what lets one tone per intent serve both text and solid surfaces.
