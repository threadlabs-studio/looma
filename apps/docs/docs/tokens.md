# Tokens

Looma is themed with CSS custom properties. Start with a few global values; use inherited group
values when a family of components needs a different treatment; set a component hook when one
instance needs to differ. A component's fallback chain reads **component → group → global** where
that group applies. The group and component levels are optional.

| Level | Example | Reach | Use it for |
| --- | --- | --- | --- |
| Global theme | `--ui-accent`, `--ui-radius-md` | The whole theme or a theme boundary | A brand palette, type and spacing scale, default corners, elevation and motion |
| Group | `--ui-field-radius`, `--ui-field-danger`, `--ui-overlay-surface` | Every participating component below the element where it is set | Forms, actions or overlays that need a shared treatment |
| Component hook | `--ui-input-radius`, `--ui-tooltip-surface` | Only the component whose root carries it | One component instance or a product wrapper for that component |

Global seeds are defined in `tokens.css`. Derived semantic values are computed from them. Group
values are **not preset**: each participating component falls back to its global value, so there is
no second theme to maintain. Group values inherit normally. Component hooks are registered as
non-inheriting properties so a hook on an outer component cannot accidentally restyle nested ones.

## Start with the global values

Changing the accent and the corner scale takes only a few declarations. The large radius derives
from the medium radius unless you pin it separately; round shapes have their own radius.

```css
:root {
  --ui-accent: #3859b8;
  --ui-radius-sm: 0.125rem;
  --ui-radius-md: 0.375rem;
  --ui-radius-round: 999px;
}

/* Choose an accent that also reads well on dark surfaces. */
[data-theme="dark"] {
  --ui-accent: #a9bdff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { --ui-accent: #a9bdff; }
}
```

Set a full palette by changing the eleven colour seeds below. Keep custom theme CSS unlayered, as
in these examples, or place it in a layer after Looma's layers. Import the token and theme files
before it. A custom palette still needs contrast checks in light, dark and high contrast modes.

## Files

- `@threadlabs/looma/tokens.css`: the contract and everything derived from it. It also carries one
  base rule, in `@layer base`: an element with `tabindex="-1"` that focus reaches only by script,
  such as a page's `<h1 tabindex="-1">` after navigation, draws no focus ring. Controls, links,
  editable regions, and elements with a `role` keep theirs.
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
| `--ui-text-secondary`, `--ui-text-muted` | ink + page | the ink mixed into the page, 80% and 62%: muted is the lightest step that still reads at 4.5:1 on the sunken surface |
| `--ui-border`, `-strong`, `--ui-control-border` | ink + page | the same ramp, at 12%, 25%, and 48% |
| `--ui-accent-hover`, `-active` | accent + ink | toward the ink, for pressure |
| `--ui-accent-subtle`, `--ui-danger-soft` | accent + page | toward the page, for a tint |
| `--ui-disabled-surface`, `--ui-disabled-text` | sunken surface, ink + page | one decision, not a per-component one; the ink at 45%, lighter than muted text |
| `--ui-disabled-filter` | `saturate(0.2) contrast(0.75) brightness(1.25)` | how a disabled button washes out; dark dims (`brightness(0.8)`), high contrast only drops colour (`saturate(0)`) |
| `--ui-focus-ring` | accent | the focus ring is the accent |
| `--ui-warning-subtle-text` | warning + ink | 55% warning toward the ink. Amber is the lightest intent, so it takes more ink to read at 4.5:1, and a theme can keep a bright, saturated warning for tints, borders, and icons |

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

## Group values

Group values are the middle layer. They inherit from a page, form, dialog, theme root or other
ancestor, and work only in the components listed here. They are intentionally absent from
`tokens.css`; an unset group value leaves the global design intact.

| Group value | Components it changes | Global fallback |
| --- | --- | --- |
| `--ui-field-radius` | Input, Input Group, Select, Listbox, Textarea, Combobox field, Search Shell's slotted search input, editor link form | `--ui-radius-md` |
| `--ui-field-danger` | Invalid Input, Input Group, Select, Listbox, Textarea, Combobox, Checkbox, Radio Group legend, Form Field message, editor link form | `--ui-danger` and its solid alias |
| `--ui-action-radius` | Button, Icon Button, except the Icon Button's explicit `round` shape | `--ui-radius-md` |
| `--ui-overlay-radius` | Dialog, Menu, Context Menu, Popover, Tooltip, Search Shell panel, Toast and Toast Region's generated toast, Combobox popup | Each component's former radius default |
| `--ui-overlay-surface`, `--ui-overlay-border`, `--ui-overlay-shadow` | The same overlay surfaces, except an inverse Tooltip uses its own surface and border | The existing elevated surface, border and elevation tokens |

For example, one form can have tighter corners and a distinct danger shade while destructive
buttons elsewhere continue to use the global danger value:

```css
.compact-form {
  --ui-field-radius: 0.25rem;
  --ui-field-danger: #a32642;
}

.floating-workspace {
  --ui-overlay-radius: 0.75rem;
  --ui-overlay-surface: var(--ui-surface-raised);
  --ui-overlay-border: var(--ui-border-strong);
}
```

Set `--ui-danger` instead when validation, destructive actions, badges and callouts should all
change together. `danger` is the one semantic intent; `--ui-field-danger` is a narrower override,
not a second error palette. An override that changes contrast still needs a readable foreground.

The last step is local. An Input can set `--ui-input-invalid-border`, a Select can set
`--ui-select-invalid-border`, and a Form Field can set `--ui-form-field-danger`; each wins over
`--ui-field-danger` on that instance. Overlay surfaces have the same path: `--ui-menu-surface`,
`--ui-dialog-radius`, `--ui-tooltip-border`, and equivalent hooks on the other overlay components
win over the inherited overlay group. The component API tab lists the hooks that particular
component reads.

```css
/* One menu can differ without changing another menu in the same overlay group. */
.account-menu {
  --ui-menu-surface: var(--ui-surface-sunken);
  --ui-menu-radius: var(--ui-radius-sm);
}
```

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

Global theme values inherit on purpose. Set global seeds on `:root` or a `[data-theme]` theme
boundary: `tokens.css` computes the derived values at those boundaries. A seed set on an arbitrary
subtree without a theme boundary will not recompute derived values inherited from above it. Use a
theme boundary for a local palette and group values for a local family change. The editor's
`--ui-editor-*` hooks inherit too: the editor is one surface whose parts are separate elements, and
editors do not nest.

| Kind | Names | Inherits | Set it on |
| --- | --- | --- | --- |
| Global theme value | `--ui-accent`, `--ui-space-4`, `--ui-radius-md` … | yes | `:root` or a `[data-theme]` boundary for a coherent derived palette |
| Group value | `--ui-field-radius`, `--ui-overlay-surface` … | yes | An ancestor of the participating components |
| Component hook | `--ui-<component>-*` | no | the component itself, through a class of your own |
| Editor hook | `--ui-editor-*` | yes | the editor or an ancestor |
| Private | `--_*` | yes, inside the component | nothing: not API |

### A component sizes itself from its hook

Where a component reads a hook for a property, set that hook, not the property. A rule of your own
loses to the component's own declaration, which usually reads as the override being ignored:

```html
<ui-icon-button class="row-action" label="More">…</ui-icon-button>
```

```css
/* Does nothing: the component sets inline-size from its hook. */
.row-action { inline-size: 0; }

/* Works. */
.row-action { --ui-icon-button-size: 0; }
```

Name the component with a class of your own and set its hooks there. Do not select the markers a
runtime renders on a component, such as `data-component` or its state attributes: they are how a
runtime draws it, an implementation detail that can change, not API. The component's API tab lists the
hooks it reads, and each one names the property it sets.

### Changing a component's default appearance

A hook does not inherit, so setting it on `:root` or a theme block changes nothing. To change a
component's default across a product, make that decision once, in a component of your own that
wraps Looma's and sets its hooks, and use it everywhere. An accent-tinted default button in Vue:

```vue
<!-- ProductButton.vue -->
<template>
  <Button class="product-button" v-bind="$attrs"><slot /></Button>
</template>

<style scoped>
.product-button {
  --ui-button-surface: var(--ui-accent-subtle);
  --ui-button-border: var(--ui-accent);
  --ui-button-text: var(--ui-accent-active);
}
</style>
```

Where one screen needs the change, put the class on those components directly. Point hooks at the
semantic values, not at fixed colours. A pinned colour stops adapting: a hover tint pinned to one
surface's colour disappears on every other surface, and a pinned tone ignores a later change of
accent. A hook set on a component beats its props, so these buttons ignore `tone`; where a product
needs both, apply the class only to the buttons it means.

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
