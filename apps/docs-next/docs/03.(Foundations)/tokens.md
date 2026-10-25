---
order: 3
---

# Tokens

Looma is themed with CSS custom properties. Start with a few global values; use inherited group
values when a family of components needs a different treatment; set a component hook when one
instance needs to differ. A component's fallback chain reads **component → group → global** where
that group applies. The group and component levels are optional.

Borders and elevation follow [one visual role guide](https://github.com/threadlabs-studio/looma/blob/main/docs/visual-system.md):
`--ui-border-divider` separates content, `--ui-border-strong` encloses panels and floating
surfaces, and `--ui-control-border` marks interactive controls. Actions use a modest highlight and
raised shadow that settle when pressed; disabled controls are flat. Tone changes the colour, not
the border or elevation role.

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
  --ui-danger: #c92d1e;
  --ui-success: #007a33;
  --ui-warning: #ba5b0b;
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
| `--ui-border`, `-strong`, `--ui-control-border` | ink + page | the same ramp: 12% for separators, 25% for overlay edges, 48% for enabled control edges |
| `--ui-accent-hover`, `-active` | accent + ink | toward the ink, for pressure |
| `--ui-accent-subtle`, `--ui-danger-soft` | accent + page | toward the page, for a tint |
| `--ui-disabled-surface`, `--ui-disabled-text`, `--ui-disabled-border` | sunken surface, ink + page | flat surface, pale ink, and a low-contrast edge distinguish a disabled control from every enabled tone |
| `--ui-disabled-filter` | `none` | optional hook for custom disabled treatments |
| `--ui-focus-ring` | accent | the focus ring is the accent |
| `--ui-warning-subtle-text` | warning + ink | 55% warning toward the ink. Amber is the lightest intent, so it takes more ink to read at 4.5:1, and a theme can keep a bright, saturated warning for tints, borders, and icons |

The mixes are directional rather than absolute: they move *toward the ink* or *toward the page*.
In a dark theme the ink is light, so the same mix brightens where it darkened in a light one, and
one set of rules serves both.

A disabled Button or Icon Button uses the shared neutral surface, text, and border instead of its
active tone. Its shadow and highlight disappear. The optional filter hook is available
through `--ui-button-disabled-filter` and `--ui-icon-button-disabled-filter`.

### The rest of the contract

| Group | Values |
| --- | --- |
| Type | `--ui-font-sans`, `--ui-font-mono`, `--ui-font-size`, `-sm`, `--ui-font-medium`, `--ui-line-height` |
| Space | `--ui-space-1` … `--ui-space-4` |
| Radius | `--ui-radius-sm`, `-md`, `-lg`, `-round` |
| Elevation | `--ui-shadow-sm`, `--ui-shadow-lg` |
| Motion | `--ui-motion-fast`, `--ui-motion-ease` |
| Controls | `--ui-control-size`, `-size-sm`, `--ui-control-min-block-size` |

## Line weights and selection

Use semantic dimensions for visual edges. `--ui-border-width` defaults to `1px` for ordinary
borders and dividers. `--ui-accent-line-width` aliases it for emphasis edges and line selection.
`--ui-focus-width` defaults to `2px` for keyboard focus. Changing the border width therefore
changes the emphasis width too, unless a theme deliberately sets them independently.

Selected navigation, tree, list, search, and choice rows share `--ui-selection-surface`,
`--ui-selection-text`, and `--ui-selection-radius`. They derive from the accent, page surface,
readable accent text, and medium radius. The default tint on neutral surfaces is 10%; selected navigation keeps its
resting label weight. A Nav Item's `variant="line"` is a discrete square-edge treatment, not a
radius override.

List rows, surface navigation and tree highlights use `--ui-selection-border` for
a faint continuous inset edge. Its default mixes 20% accent into the page surface,
giving pale fills definition on softly toned panels without changing row size.
Keyboard focus retains its stronger independent ring; framed list cards and
explicit line navigation retain their existing edges.

Colored Cards, Callouts and card Sections derive highlights from their actual surface hue,
with a darker lightness step in light themes and a lighter one in dark themes. A bounded
chroma increase keeps pale highlights visibly in their color family instead of reading grey. The faint edge
follows the same hue. The surface supplies a scoped internal row recipe without redeclaring public theme tokens. Nested neutral
panels restore the global brand recipe; transparent Sections inherit the surrounding context.
Action buttons retain their own intent colors and keyboard focus stays independent. Per-row
surface hooks remain the most specific override.

```css
:root {
  --ui-border-width: 1px;
  --ui-focus-width: 2px;
  --ui-radius-md: 0.5rem;
}

/* A deliberate independent emphasis weight at a theme boundary. */
[data-theme="dark"] {
  --ui-accent-line-width: 2px;
}
```

A component hook can still override its own edge or surface. Glyph strokes, circular shapes,
shadow lighting, and positioning corrections are not surface-border roles; they retain their
own geometry. The shared focus role never doubles as the selected-state marker.

## Derived values

Everything else in `tokens.css` is computed from the contract: the intent tones (`--ui-accent-solid`,
`*-soft`, `*-strong-surface`), the interaction roles (`--ui-action-*`, `--ui-control-*`), the type
and space steps either side of the contract's own, the elevation names, and the icon sizes.

Do not restate a derived value in a theme. Setting `--ui-accent` gives you `--ui-accent-solid`,
`--ui-action-primary-surface` and the rest for free, and they keep agreeing when the accent changes.

### Derived action insets

`--ui-action-inset-sm`, `--ui-action-inset-md` and `--ui-action-inset-lg` derive from the
corresponding spacing steps. They control boxed text actions' horizontal content padding while
height remains on the shared control scale. A theme can derive these values from its control
sizes to give actions more room without changing fields' editing insets.

## Optional semantic theme recipe

Import `@threadlabs/looma/theme-system.css` after `tokens.css` and your palette to
express a theme through shared type, geometry, material and motion decisions. It
is opt-in: themes without it retain the base token defaults. The CSS recipe uses
custom properties, with no component selectors or runtime script.

```css
@import "@threadlabs/looma/tokens.css";
@import "@threadlabs/looma/theme-light.css";
@import "@threadlabs/looma/theme-system.css";

:root {
  --ui-font-size: 1rem;
  --ui-font-display: Georgia, serif;
  --ui-control-roominess: 2.75;
  --ui-spacing: 1.05;
  --ui-scale-ratio: 1.2;
  --ui-space-curve: 1;
  --ui-radius-md: 0.5rem;
  --ui-outer-depth: 0.7;
  --ui-inner-depth: 0.4;
  --ui-edge-light: 0.25;
  --ui-overlay-translucency: 0.1;
  --ui-motion-fast: 0.15s;
}
```

Use unlayered declarations, as above, to override the recipe's `theme` layer.
Lengths, font families, weights, easing functions and durations use CSS syntax.
The recipe recomputes at `:root`, `[data-theme]` and `[data-contrast]` boundaries;
a class alone does not recompute inherited derived values.

### Typography, geometry and spacing inputs

These defaults describe the shared recipe with the base tokens. The bounds in
this table are the documentation customizer's authoring limits. Hand-written CSS
is not validated by that authoring tool; the CSS recipe only guards size ratios
at `1` and spacing/curve/depth at `0` where needed.

| Property | Default | Customizer range and effect |
| --- | --- | --- |
| `--ui-font-sans` | `system-ui, sans-serif` in generated themes | Body/interface font stack; System font uses the operating system's native face. |
| `--ui-font-display` | `system-ui, sans-serif` in generated themes | Display/heading font stack. |
| `--ui-font-size` | `1rem` | Base text size; 14–24px for px inputs, with 0.875–1.5rem bounds for relative lengths so root preferences remain effective. Relative lengths retain their units. Type steps, choice marks and control heights follow it. |
| `--ui-font-medium` | `500` | Emphasis weight, 400–700; body and heading weights retain their separate roles. |
| `--ui-control-roominess` | `2.5` | Unitless height multiplier, 2–4 times base text size. Derives `--ui-control-size`; it is not a length. |
| `--ui-spacing` | `1` | Unitless space multiplier, 0.75–1.5. Changes gaps and horizontal action insets without changing control heights. |
| `--ui-scale-ratio` | `1.2` | Small/medium/large control ratio, 1–1.5; 1 deliberately makes the sizes equal. |
| `--ui-space-curve` | `1` | Spacing curve, 0.5–2; 1 is linear and 2 bends the interior steps quadratically, keeping the endpoints fixed. |
| `--ui-radius-md` | `0.5rem` in base tokens; `8px` in generated themes | Corner seed, 0–32px or equivalent. Derives small, large, action, field and overlay radii; explicit round shapes stay round. |
| `--ui-border-width` | `1px` | Line weight, 0.5–3px or equivalent; derives emphasis edges. Generated themes give focus a separate minimum of 2px. |

For base text size `f`, roominess `q`, ratio `r`, spacing `s` and curve `c`, the
medium height is `h = f × q`; control heights are `h/r`, `h`, `h×r`.
The spacing unit is `u = f × s / 4`, so changing control roominess does not change page rhythm. The first and last spacing steps stay at
`u` and `8u`; interior steps use `u × (1 + 7 × (k/7)^c)`, with `k = 1, 2, 3, 5`
for steps 2–5. Step 0.5 is half of step 1. Changing the control ratio does not
change spacing. Spacing follows base text independently of control roominess.

On coarse pointers, the small size is at least `--ui-control-min-block-size`
(default `44px`). Medium and large derive successively from that raised small
size using the same ratio, so the touch minimum does not collapse distinct sizes
when the ratio exceeds 1. Single-line editing/action insets
(`--ui-control-inset-block-sm`, `-md`, `-lg`) fit their box and typography;
multiline content can still grow. Horizontal `--ui-action-inset-sm`, `-md`, `-lg`
follow spacing steps 2–4. Choice marks follow type rather than the row size.

### Material and light inputs

All fraction inputs below run from 0 to 1 in the customizer. They represent
separate aspects of one material: depth controls elevation/recession, finish
controls reflection, and transmission controls the decorative background plane.

| Property | Default | Effect and dependencies |
| --- | --- | --- |
| `--ui-outer-depth` | `0.6` | 0–2 authoring range. Raised and floating shadow distance/blur; 0 is flat. Light position supplies shadow direction. |
| `--ui-inner-depth` | `0.3` | 0–2 authoring range. Recessed field and pressed-control shadows; 0 removes recession. |
| `--ui-glassiness` | `0` | Frosted backdrop blur, saturation and a light-catching rim on participating surfaces. Visible transmission needs a scene behind the decorative plane. |
| `--ui-surface-separation` | `0` | Decorative rim/offset around participating surfaces; scaled by popup purpose and rendered size. It can appear with glassiness at 0. |
| `--ui-overlay-translucency` | `0` | Transparency of the shared overlay fill and decorative glass color; 0 is opaque for the overlay fill, 1 transparent. Material content remains on an opaque plane. |
| `--ui-finish` | `0` | Matte (0) through polished (1). Reflection strength also depends on light strength and the generated readable reflection colors. |
| `--ui-edge-light` | `0` | Illuminated boundary, independent of depth. Bright edge strength also depends on light strength. |
| `--ui-glow` | `0` | Soft tone-derived light beyond a surface. Radius depends on glow; visible strength also depends on light strength. |
| `--ui-light-x` | `0.5` | Source position left (0) to right (1), relative to each surface. |
| `--ui-light-y` | `0` | Source position top (0) to bottom (1); `(0.5, 0)` is top center. |
| `--ui-light-spread` | `0.5` | Concentrated spot (0) through broad reflection (1). Requires finish and illumination to show a reflection. |
| `--ui-light-strength` | `0.65` | Shared illumination response. Does not set elevation or remove depth shadows at 0. |

Finish at 0 removes reflections even when the light is strong. Glow and edge
light can still respond independently. Glassiness and separation create the
ornamental outer treatment; raising overlay translucency alone does not make an
opaque material content plane transparent. A feature's visible effect depends
on the participating surface and its surroundings. Standard Cards keep their
quiet treatment; `treatment="expressive"` opts into the theme's material.

| Derived family | Public outputs |
| --- | --- |
| Elevation | `--ui-shadow-xs`, `-sm`, `-md`, `-lg`, `-xl`; `--ui-raised`; `--ui-elevation-tooltip`, `-overlay`, `-dialog` |
| Control response | `--ui-action-edge`, `--ui-action-shadow`, `--ui-control-inset`, `--ui-pressed` |
| Material planes | `--ui-overlay-surface`, `--ui-material-content`, `--ui-material-glass`, `--ui-material-edge` |
| Reflections | `--ui-surface-highlight`, `--ui-neutral-highlight`, `--ui-accent-highlight`, `--ui-danger-highlight`, `--ui-success-highlight`, `--ui-warning-highlight`, `--ui-info-highlight`; `--ui-raised-highlight` uses the surface highlight |
| Glow | `--ui-material-glow`, `--ui-neutral-glow`, `--ui-accent-glow`, `--ui-danger-glow`, `--ui-success-glow`, `--ui-warning-glow`, `--ui-info-glow` |

Generated themes also supply bounded reflection colors `--ui-surface-reflection`,
`--ui-neutral-reflection` and `--ui-{accent,danger,success,warning,info}-reflection`.
Their brightest stops preserve readable foregrounds. Reduced-transparency and
forced-color preferences disable ornamental reflection/glow; participating
components also remove backdrop blur and decorative transmission.

### Motion inputs and outputs

| Property | Default | Customizer range and effect |
| --- | --- | --- |
| `--ui-motion-fast` | `120ms` | Feedback pace, 0–600ms; accepts `ms` or `s`. |
| `--ui-motion-ease` | `cubic-bezier(0.2, 0, 0.2, 1)` | Shared acceleration/settling; CSS easing keywords or a cubic Bézier curve. Customizer x coordinates are 0–1, y coordinates −1–2. |

The recipe sets `--ui-motion-press` to the fast duration, `--ui-motion-base` to
1.5 times it, and `--ui-motion-ease-out` to the chosen curve. Feedback, reveal and
layout roles derive as fast, base and 1.5 times base, with corresponding
`--ui-motion-feedback-ease`, `--ui-motion-reveal-ease` and
`--ui-motion-layout-ease`. Activation scale (`--ui-press-scale`, `0.98`) is
independent of depth. Reduced motion removes press/reveal timing and activation
scale; components retain their own reduced-motion handling. Explicit timing
or scale overrides should also respect that preference.

### Palette generation decisions

The documentation customizer adds a generation step to the CSS recipe. Four
six-digit hex seeds (`action`, `canvas`, `surface`, `text`) feed the paired
light/dark palette. Seed defaults below are the customizer's Clear starting point;
other starting points supply their own values. Resolved outputs may be repaired
for the requested mode and contrast.

| Recipe field | Public output | Default seed |
| --- | --- | --- |
| `action` | `--ui-accent` | `#5b55d6` |
| `canvas` | `--ui-surface` | `#f6f6f8` |
| `surface` | `--ui-surface-raised` | `#ffffff` |
| `text` | `--ui-text` | `#1a1a1a` |

These generation decisions retain one identity across both modes:

| Recipe field | Default | Range and meaning |
| --- | --- | --- |
| `warmth` | `0.5` | 0–1; cool through neutral to warm surfaces and ink. Leaves the action hue independent. |
| `color-intensity` | `0.5` | 0–1; quiet through vivid chroma across surfaces, action and status colors. 0.5 retains original seed intensity before readability repair. |
| `palette-relationship` | `preserve` | `preserve` keeps seed hues; `neighboring` relates quiet hues to the action hue +30°; `complementary` uses the action hue +180°, before warmth shifts. |

These three fields are recipe-only generator decisions, with no corresponding
CSS custom properties. Edit the JSON recipe and regenerate to produce the
resolved colors. The generator uses Oklab mixing
and OKLCH hue/chroma adjustments, reduces out-of-gamut chroma while preserving
hue/lightness, and repairs readable surfaces, text, action foregrounds, borders,
focus and reflection peaks. Resolved colors may differ from requested seeds.
Generated CSS includes both palettes and mode boundaries; use `data-theme` to
choose a mode or leave it unset on the root to follow the system.

The existing intent colors and readable foregrounds remain public. Custom CSS,
component overrides and arbitrary content still need contrast checks on their
actual surfaces. A direct supported role or component hook can override a
derived value without replacing the recipe; the recipe never selects private
inputs or labels to achieve a theme.

### Recipe files, fonts and migration

The customizer's schema-version-1 JSON stores string decisions in `values`.
Unknown decision names are rejected, omitted decisions take defaults, and the
optional `presets` mapping records Palette/Material provenance. An optional
`fonts` mapping associates `body-font` and/or `display-font` with a curated Google
Fonts family, while `values` retains the matching CSS font stacks. The System
font choice needs no download; selected Google faces load in previews and add a
Google Fonts `@import` before rules in downloaded and locally saved CSS. Advanced
custom stacks are for already loaded or self-hosted faces; a stack alone does
not download a font.

Before 1.0, renamed decisions have no compatibility aliases. Replace recipe
`density` with `spacing` and CSS `--ui-density` with `--ui-spacing`. Replace the
old length-valued recipe `control-size` with numeric `control-roominess`: divide
the desired medium height by the base text size (for example, `40px / 16px = 2.5`).
With the shared recipe, author `--ui-control-roominess`; `--ui-control-size`
remains a derived public height role. Relative length inputs remain relative;
when their value cannot be checked as an absolute length, generated bounds use
`rem` endpoints so the root font preference still scales them.

## Group values

Group values are the middle layer. They inherit from a page, form, dialog, theme root or other
ancestor, and work only in the components listed here. They are intentionally absent from
`tokens.css`; an unset group value leaves the global design intact.

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

Widths work the same way. Input, Select, and Nav Item fill their container, and a Form Field can
shrink to nothing; each reads a hook for it:

```css
.quantity { --ui-input-inline-size: 8ch; }
.status-filter { --ui-select-inline-size: 12rem; }
.rail-item { --ui-nav-item-inline-size: auto; }
.address-field { --ui-form-field-min-inline-size: 16rem; }
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

## Motion and navigation

Motion uses three roles: `--ui-motion-feedback` for control state and caret rotation,
`--ui-motion-reveal` for panels and drawers, and `--ui-motion-layout` for occupied
space such as a docked sidebar. Each has a matching `-ease` token. They derive
from the existing fast/base durations and ease/ease-out curves, so a theme can
set one seed or tune a role once. Reduced-motion preferences disable component
transitions even when a containing group overrides a duration.

Nav Item and Disclosure's `variant="navigation"` share the `--ui-nav-*` semantic
tokens: icon size, gap, padding, minimum row height, and hover surface. Both use
the shared `--ui-selection-radius` for corners.
Compact density uses the `--ui-nav-compact-*` padding and height values, not a
different icon column. Nav Item's leading and trailing slots center their content
on those columns; Disclosure's leading and indicator slots use the same columns.

Use a unique `name` for each independent disclosure group. Add `requiredOpen`
to keep one member open, including on initialization and after removing the open
member. Unnamed disclosures and groups without this option remain freely
collapsible. `fill` works within a bounded flex column and animates the flexible
space transfer without scrolling its headers away. Custom indicators stay
mounted and rotate a half-turn when opened; provide the closed-state icon.

Sidebar's `--ui-sidebar-collapsed-width` hook defaults to zero. A separate rail
can occupy that width while the sidebar's content remains inert and clipped.
Its fixed-width content canvas avoids wrapping navigation text during collapse.

## Typography

Font sizes derive from a `rem` base, so a host scales them from the root font
size. The optional shared recipe gives `--ui-font-size-xs` a `12px` floor.
`--ui-control-min-block-size` is `44px` to keep the comfortable touch-target floor
in CSS pixels when the root font is smaller.

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
  --ui-danger: #ff6b6b;
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

## Components own their layout

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

Choice marks follow typography through derived `--ui-choice-mark-size`,
`--ui-choice-track-height` and `--ui-choice-track-width`. The default ratios are
1.125, 1.5 and 2.5 times the base font size. Checkbox and radio marks retain the
same size across sm/md/lg rows; those rows align with the shared control heights.
The switch thumb and travel derive from its track, including component hooks.
These are derived roles, not additional theme seeds.
