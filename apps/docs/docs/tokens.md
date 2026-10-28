# Tokens

Change a few CSS custom properties to give every Looma component the same visual language.
Start with the theme; narrow an override only when you need to.

![Token fallback: a component hook wins over a group value, which wins over the global theme.](/img/token-layers.svg)

| You want to change… | Set… | Example |
| --- | --- | --- |
| The whole theme | A global value | `--ui-accent` |
| Related controls in a section | An inherited group value | `--ui-field-radius` |
| One component family or instance | A component hook | `--ui-input-radius` |

Prefer a visual starting point? [Customize your theme](https://threadlabs.studio/looma/customize/) and export its CSS.
For geometry, material and generation settings, use the [theme reference](./theme-reference.md).

## Start with the global values

Import the tokens and a palette, then add your overrides:

```css
@import "@threadlabs/looma/tokens.css";
@import "@threadlabs/looma/theme-light.css";
@import "@threadlabs/looma/theme-dark.css";

:root {
  --ui-accent: #3859b8;
  --ui-radius-sm: 0.125rem;
  --ui-radius-md: 0.375rem;
  --ui-radius-round: 999px;
}

[data-theme="dark"] {
  --ui-accent: #a9bdff;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { --ui-accent: #a9bdff; }
}
```

The large radius derives from the medium radius. Round shapes keep their own radius.
Keep overrides unlayered, as above, or place them in a layer after Looma's layers.

> **Check each mode.** A custom palette needs readable text, controls and focus indicators
> in light, dark and high contrast modes.

## Files

| Import | Purpose |
| --- | --- |
| `@threadlabs/looma/tokens.css` | Global seeds and derived values |
| `@threadlabs/looma/theme-light.css` | Light palette |
| `@threadlabs/looma/theme-dark.css` | Dark palette |
| `@threadlabs/looma/theme-high-contrast.css` | High contrast palette |
| `@threadlabs/looma/theme-system.css` | Optional shared type, geometry, material and motion recipe |

<details>
<summary>Base-layer focus behavior</summary>

`tokens.css` also includes a base rule for script-focused content with `tabindex="-1"`,
such as a page heading after navigation: it draws no focus ring. Controls, links, editable
regions and elements with a `role` keep theirs.

</details>

## Theming colour

Set the shared seeds. Hover states, tints, borders, muted text and disabled colours derive
from them.

```css
:root {
  /* Intent: what an action means. */
  --ui-accent: #5b55d6;
  --ui-danger: #b14d3f;
  --ui-success: #147937;
  --ui-warning: #b27522;
  --ui-info: #2e69b5;

  /* Readable foregrounds for filled actions. */
  --ui-on-accent: #ffffff;
  --ui-on-danger: #ffffff;

  /* The page, the two surfaces either side of it, and the ink. */
  --ui-surface: #ffffff;
  --ui-surface-raised: #ffffff;
  --ui-surface-sunken: #f0f0ec;
  --ui-text: #1a1a1a;
}
```

Changing `--ui-accent` updates accent buttons, selected controls, focus rings and their
interaction states together. Leave derived values unset when you want them to follow the seed.

### Shared colour roles

| Role | Properties | Used by |
| --- | --- | --- |
| Content dividers | `--ui-border-divider` | Separators between content |
| Panel boundaries | `--ui-border-strong` | Panels and floating surfaces |
| Control boundaries | `--ui-control-border`, `--ui-control-border-hover` | Neutral buttons and form fields |
| Soft status surfaces | `--ui-<tone>-soft`, `--ui-<tone>-subtle-text`, `--ui-<tone>-soft-border` | Badges, cards, callouts and notifications |
| Selection | `--ui-selection-surface`, `--ui-selection-text`, `--ui-selection-radius` | Navigation, trees, lists, search and choice rows |

Actions settle when pressed; disabled controls use a flat neutral surface with no highlight
or shadow. Tone changes the colour while the border and elevation keep their visual roles.
See the [visual role guide](https://github.com/threadlabs-studio/looma/blob/main/docs/visual-system.md)
for the full rationale.

### Supporting accents and statuses

- **Supporting accents:** set `--ui-accent-secondary` or `--ui-accent-tertiary`, then use
  `tone="accent-secondary"` or `tone="accent-tertiary"` on Button, IconButton, Badge, Card,
  Meter or Text. Without a supporting seed, they follow the primary accent.
- **Status relationships:** the customizer can retain semantic hues, reduce colour, or use
  brand families. Labels and icons still carry the meaning. Tips and informational callouts
  share the Info palette and use different icons.
- **Accent assignments:** choose the family used for links, focus rings and selected rows
  independently in the customizer.

Text's `tone="secondary"` means supporting prose. It is separate from the
`accent-secondary` brand family.

<details>
<summary>Colour derivation and contrast</summary>

| Derived | From | How |
| --- | --- | --- |
| `--ui-text-secondary`, `--ui-text-muted` | ink + page | the ink mixed into the page, 80% and 62%: muted is the lightest step that still reads at 4.5:1 on the sunken surface |
| `--ui-border`, `-strong`, `--ui-control-border` | ink + page | quiet enclosure edges; the generated control boundary meets the chosen minimum against its declared surfaces |
| `--ui-accent-hover`, `-active` | accent + ink | toward the ink, for pressure |
| `--ui-accent-subtle`, `--ui-danger-soft` | accent + page | toward the page, for a tint |
| `--ui-disabled-surface`, `--ui-disabled-text`, `--ui-disabled-border` | sunken surface, ink + page | flat surface, pale ink, and a low-contrast edge distinguish a disabled control from every enabled tone |
| `--ui-disabled-filter` | `none` | optional hook for custom disabled treatments |
| `--ui-focus-ring` | accent | the focus ring is the accent |
| `--ui-warning-subtle-text` | warning hue + surface contrast | restrained amber ink; the customizer adjusts lightness while preserving hue and chroma as far as the display gamut permits |

The mixes are directional rather than absolute: they move *toward the ink* or *toward the page*.
In a dark theme the ink is light, so the same mix brightens where it darkened in a light one, and
one set of rules serves both. The default amber fill uses dark labels, so its hover and pressed states brighten to retain contrast. High-contrast warning fills use white labels and darken instead.

The customizer derives control boundaries against canvas, raised, sunken and neutral control
surfaces. Its configurable minimum contrast is 2:1 by default; regenerate the theme after
changing that decision. Custom CSS still needs contrast checks on its actual surfaces.

The solid warning foreground derives through `--ui-on-warning`. Neutral controls stay quiet;
accent outlines and solid accents supply stronger emphasis.

</details>

## Group values

Set a group value on a form, dialog or other ancestor to change the participating controls
inside it. Group values inherit and are intentionally unset in `tokens.css`: each component
falls back to the global theme.

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

Use `--ui-danger` when validation, destructive actions, badges and callouts should all change.
Use `--ui-field-danger` for validation within a section. Keep its foreground readable.

<details>
<summary>Group values and participating components</summary>

<table tabIndex={0} aria-label="Group design tokens">
  <thead><tr><th>Group value</th><th>Components it changes</th><th>Global fallback</th></tr></thead>
  <tbody>
    <tr><td><code>--ui-field-radius</code></td><td>Input, Input Group, Select, Listbox, Textarea, Combobox field, Search Shell's slotted search input, editor link form</td><td><code>--ui-radius-md</code></td></tr>
    <tr><td><code>--ui-field-danger</code></td><td>Invalid Input, Input Group, Select, Listbox, Textarea, Combobox, Checkbox, Radio Group legend, Form Field message, editor link form</td><td><code>--ui-danger</code> and its solid alias</td></tr>
    <tr><td><code>--ui-font-display</code></td><td>Page Header title, Section heading, Text rendered as h2–h6</td><td>Inherited font; setting Text’s explicit sans font still takes precedence</td></tr>
    <tr><td><code>--ui-press-scale</code></td><td>Button, Icon Button, ColorPicker swatch on activation</td><td>Button: 1; Icon Button and ColorPicker: 0.96; explicit Icon Button hook takes precedence</td></tr>
    <tr><td><code>--ui-motion-press</code></td><td>Scale feedback on Button, Icon Button and ColorPicker</td><td><code>--ui-motion-fast</code></td></tr>
    <tr><td><code>--ui-action-radius</code></td><td>Button, Icon Button, except the Icon Button's explicit <code>round</code> shape</td><td><code>--ui-radius-md</code></td></tr>
    <tr><td><code>--ui-overlay-radius</code></td><td>Dialog, Menu, Context Menu, Popover, Tooltip, Search Shell panel, Toast and Toast Region's generated toast, Combobox popup</td><td>Each component's former radius default</td></tr>
    <tr><td><code>--ui-overlay-surface</code>, <code>--ui-overlay-border</code>, <code>--ui-overlay-shadow</code></td><td>The same overlay surfaces, except an inverse Tooltip uses its own surface and border</td><td>The elevated surface, strong border, and elevation tokens</td></tr>
  </tbody>
</table>

</details>

## Component tokens

Each component's API tab lists its public hooks:
`--ui-<component>[-<variant>][-<state>]-<property>`.

A hook wins over that component's group or global fallback. For example,
`--ui-input-invalid-border` wins over `--ui-field-danger`; `--ui-menu-surface` wins over
`--ui-overlay-surface`.

### Choose the scope

Public hooks inherit through the normal CSS cascade. A nearer declaration wins:

```css
:root { --ui-input-radius: 0.5rem; }       /* Every Input */
.settings { --ui-input-radius: 0.25rem; }  /* Inputs in one section */
.square-input { --ui-input-radius: 0; }   /* One instance */
```

Use props for predefined options. A hook can override a prop where the component documents
that precedence: `--ui-stack-gap`, for example, overrides Stack's `gap` prop even when inherited.
Set the hook to `initial` to restore the component's fallback and prop-driven defaults.

> **Global seeds need a theme boundary.** Set them on `:root` or `[data-theme]` so derived
> values recompute. An arbitrary ancestor class does not recompute a palette.
> `--ui-font-size` belongs on `:root`; nested modes share that rem base.

### Set the public hook

Components own their declared layout, including flow, alignment and spacing. Set the public
hook for the dimension you need:

```css
.quantity { --ui-input-inline-size: 8ch; }
.status-filter { --ui-select-inline-size: 12rem; }
.rail-item { --ui-nav-item-inline-size: auto; }
.address-field { --ui-form-field-min-inline-size: 16rem; }
```

Use your own classes. Runtime markers such as `data-component`, private `--_*` variables and
nested inputs or labels are implementation details.

### Change a component's default appearance

Point hooks at semantic values so they adapt to the surrounding theme:

```css
:root {
  --ui-button-surface: var(--ui-accent-subtle);
  --ui-button-border: var(--ui-accent);
  --ui-button-text: var(--ui-accent-active);
}
```

These hooks override Button's tone-derived colours, including explicit `tone` props.
For a local change, put them on an ancestor or a class on that instance.

<details>
<summary>Inheritance and layout boundaries</summary>

| Kind | Names | Inherits | Set it on |
| --- | --- | --- | --- |
| Root type base | `--ui-font-size` | yes | `:root`; sets the document root font size |
| Global theme value | `--ui-accent`, `--ui-space-4`, `--ui-radius-md` … | yes | `:root` or a `[data-theme]` boundary for a coherent derived palette |
| Group value | `--ui-field-radius`, `--ui-overlay-surface` … | yes | `:root`, an ancestor, or a component |
| Component hook | `--ui-<component>-*` | yes | `:root`, an ancestor, or the component itself |
| Editor hook | `--ui-editor-*` | yes | `:root`, an ancestor, or the editor |
| Private | `--_*` | implementation-specific | nowhere in application CSS; not API |

Looma does not register public hooks just to restate normal inheritance. Typed registrations
can validate values or support interpolation. Private measurements may use `inherits: false`
when each instance needs its own value; they are not theme settings.

Themes supply shared values; components retain their layout rules. Looma protects
its declared flow, alignment and spacing with important priority. Setting
`align-items: center` on a Checkbox, even as a normal inline style, does not change
the alignment between its box and label. Its first-line alignment is component
behavior, including when the label wraps or has a description.

Use a supported prop or public custom property. If the capability is missing, improve
the component instead of selecting its private inputs or labels. A consumer can
make a deliberate `!important` override under the CSS cascade, but doing so leaves
the normal theming contract. Public token declarations themselves are not important;
changing them still updates every protected declaration that reads them.

This priority contract protects declared layout properties, not every possible
application style or arbitrary author markup. It does not create a security boundary
against intentionally hostile CSS.

</details>

## Themes

Switch with `data-theme="light"` or `data-theme="dark"`. Leave the root attribute unset to
follow the system preference.

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
  --ui-danger: #ffa191;
  --ui-success: #84d393;
  --ui-warning: #f0af63;
  --ui-info: #92c0ff;
}
```

`--ui-surface-raised` and `--ui-surface-sunken` are seeded rather than mixed because which
direction reads as "lifted" flips between a light and a dark scheme, and only the theme knows
which one it is.

In a dark theme the intent tones are light, so their foregrounds (`--ui-on-accent`,
`--ui-on-danger`, and `--ui-on-warning`) are dark. That is what lets one tone per intent serve both text and solid surfaces.

## Keep exploring

- [Customize a theme](https://threadlabs.studio/looma/customize/) visually and export CSS or a recipe.
- [Theme reference](./theme-reference.md) covers typography, spacing, material, motion and generation inputs.
- [Browse components](/components/) for each component's props and public hooks.
