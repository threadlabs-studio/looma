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
| `--ui-disabled-filter` | `saturate(0.2) contrast(0.75) brightness(1.25)` | how a disabled button washes out; dark dims (`brightness(0.8)`), high contrast only drops colour (`saturate(0)`) |
| `--ui-focus-ring` | accent | the focus ring is the accent |

The mixes are directional rather than absolute: they move *toward the ink* or *toward the page*.
In a dark theme the ink is light, so the same mix brightens where it darkened in a light one, and
one set of rules serves both.

A disabled button keeps its own look and is washed out by one filter, `--ui-disabled-filter`:
less colour, less contrast, and a step toward the page. Every variant and tone fades the same way,
so a disabled danger button still reads as danger, and a retheme carries through without a second
palette to keep in step. Button and Icon Button take it through `--ui-button-disabled-filter` and
`--ui-icon-button-disabled-filter`.

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
divergence, and each falls back to a semantic value. These are the component's hooks.

### A hook styles the element it is set on

Custom properties inherit, so a hook set on a container would reach every component of that kind
inside it and override their defaults, and even their props: `--ui-stack-gap: 0` on a page's outer
stack would collapse every stack in the page, including one with `gap="l"`. So a hook does not
inherit. Looma registers each one with `@property { syntax: "*"; inherits: false; }`, and it styles
only the component whose root it is set on:

```css
/* Removes the outer stack's gap and nothing else. */
.page-shell { --ui-stack-gap: 0; }
```

Set on an ancestor that is not the component, a hook does nothing. Set on the component itself it
beats the component's own default, and where the component documents it, its prop (a Stack's
`--ui-stack-gap` over its `gap`); an inherited value never can.

Theme tokens are different: `--ui-accent`, `--ui-text`, `--ui-surface`, the spacing and type steps,
radii, and everything else in `tokens.css` inherit on purpose, so setting one on an element themes
its whole subtree. The editor's `--ui-editor-*` hooks inherit too: the editor is one surface whose
parts (toolbars, menus, overlays, and the content) are separate elements, and editors do not nest.

| Kind | Names | Inherits | Set it on |
| --- | --- | --- | --- |
| Theme token | `--ui-accent`, `--ui-space-4`, `--ui-radius-md` … | yes | `:root`, a theme, or any subtree |
| Component hook | `--ui-<component>-*` | no | the component, or all of them with a selector |
| Editor hook | `--ui-editor-*` | yes | the editor or an ancestor |
| Private | `--_*` | yes, inside the component | nothing: not API |

### A component sizes itself from its hook

Where a component reads a hook for a property, set that hook, not the property. A rule of your own
loses to the component's own declaration, which usually reads as the override being ignored:

```css
/* Does nothing: the component sets inline-size from its hook. */
.my-row .actions [data-component~="ui-icon-button"] { inline-size: 0; }

/* Works. */
.my-row .actions [data-component~="ui-icon-button"] { --ui-icon-button-size: 0; }
```

Every component's root carries `data-component="ui-<name>"`, in HTML and in Vue, so
`[data-component~="ui-icon-button"]` selects each one. The component's API tab lists the hooks it
reads, and each one names the property it sets.

### Changing a component's default appearance

A component's default is a product decision, so express it in the theme rather than at every call
site. A hook does not inherit, so select the components rather than setting it on `:root`. An
accent-tinted default button, product-wide:

```css
[data-component~="ui-button"] {
  --ui-button-surface: var(--ui-accent-subtle);
  --ui-button-border: var(--ui-accent);
  --ui-button-text: var(--ui-accent-active);
}
```

Point these at the semantic values, not at fixed colours. A pinned colour stops adapting: a hover
tint pinned to one surface's colour disappears on every other surface, and a pinned tone ignores a
later change of accent. A hook set on a component beats its props, so these buttons ignore `tone`;
where a product needs both, narrow the selector to the buttons the theme means.

## Typography

Font sizes are `rem`, so a host scales them from the root font size. One exception:
`--ui-control-min-block-size` is `44px`, because WCAG's touch-target minimum counts CSS pixels and
must not shrink with a smaller root font.

A theme sets one size, `--ui-font-size`, for body copy; every step derives from it, so the scale
moves as a whole:

| Step | Multiple | Used for |
|---|---|---|
| `--ui-font-size-2xs` | 0.6875 | keyboard hints and micro-labels |
| `--ui-font-size-xs` | 0.75 | captions and avatar-group counts |
| `--ui-font-size-sm` | 0.875 | controls, labels, badges, trees, and help text |
| `--ui-font-size-md` | 1 | body copy, the editor, and menus |
| `--ui-font-size-lg`, `-xl`, `-2xl` | 1.125, 1.25, 1.5 | headings |

Neighbouring steps are at least two pixels apart at the default size: a label one pixel smaller than
the text beside it reads as a mistake, not as hierarchy.

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
