# Theme reference

Look up shared geometry, material, palette generation and motion values. For your first theme,
start with [Tokens](./tokens.md) or [open the customizer](https://threadlabs.studio/looma/customize/).

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

Choice rows use `--ui-accent-subtle` for hover and active-option feedback. Hover
does not draw a keyboard focus ring. Focus stays on the owning field for an
active-descendant combobox, or on the row when the row itself receives focus.
Forced-color mode preserves a visible active-option indicator.

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
  --ui-font-size: 16px;
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
| `--ui-font-size` | `16px` | Sets the document root’s font size. The customizer accepts 14–24px; type steps, choice marks, controls and rem-based page layout derive from that root once. |
| `--ui-font-medium` | `500` | Emphasis weight, 400–700; body and heading weights retain their separate roles. |
| `--ui-control-roominess` | `2.5` | Unitless height multiplier, 2–4 times base text size. Derives `--ui-control-size`; it is not a length. |
| `--ui-rhythm` | `1` | Unitless compact-to-airy multiplier, 0.75–1.5. Coordinates vertical Stack gaps with bounded line-height ratios. Horizontal navigation and control-row gaps follow spacing alone. |
| `--ui-spacing` | `1` | Unitless space multiplier, 0.75–1.5. Changes gaps and horizontal action insets without changing control heights. |
| `--ui-scale-ratio` | `1.2` | Small/medium/large control ratio, 1–1.5; 1 deliberately makes the sizes equal. |
| `--ui-space-curve` | `1` | Spacing curve, 0.5–2; 1 is linear and 2 bends the interior steps quadratically, keeping the endpoints fixed. |
| `--ui-radius-md` | `0.5rem` in base tokens; `8px` in generated themes | Corner seed, 0–32px or equivalent. Derives small, large, action, field and overlay radii; explicit round shapes stay round. |
| `--ui-border-width` | `1px` | Line weight, 0.5–3px or equivalent; derives emphasis edges. Generated themes give focus a separate minimum of 2px. |

<details>
<summary>Control and spacing formulas</summary>

For base text size `f`, roominess `q`, ratio `r`, spacing `s`, rhythm `t` and curve `c`, the
medium height is `h = f × q`; control heights are `h/r`, `h`, `h×r`.
The spacing unit is `u = f × s / 4`, so changing control roominess does not change page rhythm. Stack multiplies its chosen gap by bounded rhythm `t`; an explicit `--ui-stack-gap` remains exact. Horizontal row gaps and padding use the spacing steps directly. The first and last spacing steps stay at
`u` and `8u`; interior steps use `u × (1 + 7 × (k/7)^c)`, with `k = 1, 2, 3, 5`
for steps 2–5. Step 0.5 is half of step 1. Changing the control ratio does not
change spacing. Spacing follows base text independently of control roominess.

Line heights are always **unitless multipliers** of each role’s own font size.
Rhythm derives `--ui-line-height-tight = clamp(1.1, 1.2 + (t − 1) × 0.2, 1.3)`
and `--ui-line-height = clamp(1.35, 1.4 + (t − 1) × 0.4, 1.6)`.
`--ui-line-height-md` follows the latter; `--ui-line-height-relaxed` is that ratio
times `1.15`. No px or rem line heights are generated. Use Rhythm to coordinate
text and layout; use Spacing to refine gaps without changing text ratios.

Pointer capability does not change the visible size ladder. Small, medium and
large retain the theme’s proportions on touch. Hit-area guidance is a separate,
context-dependent decision: `--ui-control-min-block-size` is an adjustable
comfort preference for components that offer expanded targets, not a mandatory
visible height or universal accessibility rule. Small secondary controls can
remain deliberately compact. Invisible extensions must not steal neighbouring
controls. Single-line editing/action insets
(`--ui-control-inset-block-sm`, `-md`, `-lg`) fit their box and typography;
multiline content can still grow. Horizontal `--ui-action-inset-sm`, `-md`, `-lg`
follow spacing steps 2–4, with a minimum equal to the matching vertical inset so increasing roominess cannot pinch the label horizontally. Choice marks follow type rather than the row size.

</details>

### Choosing units

The base is a pixel value: `:root { --ui-font-size: 18px; }` sets the document
root to 18px. Normal text is `1rem`, a `2.5rem` control is 45px, and `2rem`
of layout space is 36px. Derived type and geometry use the root, rather than
multiplying the authored base value again. The size samples show the actual
rendered control height in both rem and px; no mental conversion is needed.

| Unit | Use |
| --- | --- |
| `px` | The root base; deliberately fixed details such as thin borders and focus strokes; hit-area dimensions chosen for the control’s context; pointer coordinates. These are CSS pixels and still follow browser zoom. |
| `rem` | Type roles, text-related gaps, padding and layout dimensions that should grow with the root. Corners may also use rem when their shape should scale with the interface. |
| `em` | Inline details that should follow their own text size rather than the document base. |
| Unitless | Line height, size ratios, roominess and spacing multipliers. |

Base text size is explicitly px-based. Other length editors can switch px/rem
while preserving the resolved quantity, including minimum and maximum values.
Their ranges convert through the current root; generated CSS keeps the documented
pixel bounds, so relative lengths grow with the root until those limits apply. At an 18px root, `9px` becomes `0.5rem`;
increasing the root to 20px then makes that relative value 10px. Switching units
alone does not resize it. A 10px root is not needed for arithmetic: the tool
shows the resolved values while normal text remains `1rem`.

The `--ui-font-size` seed is set on `:root`, not on a nested mode boundary.
Mode boundaries change the palette without establishing a second rem root.
Old recipes that stored relative `text-size` values must choose an explicit px
base (for example, `1.0625rem` at the former 16px root becomes `17px`). There is
no compatibility conversion that guesses the original root.

### Material and light inputs

Fraction inputs run from 0 to 1 unless a different range is listed. They represent
separate aspects of one material: depth controls elevation/recession, finish
controls reflection, and transmission controls the decorative background plane.

| Property | Default | Effect and dependencies |
| --- | --- | --- |
| `--ui-outer-depth` | `0.6` | 0–2 authoring range. Raised and floating shadow distance/blur; 0 is flat. Light position supplies shadow direction. |
| `--ui-inner-depth` | `0.3` | 0–2 authoring range. Recessed field and pressed-control shadows; 0 removes recession. |
| `--ui-glassiness` | `0` | Frosted backdrop blur, saturation and a light-catching rim on participating surfaces. Visible transmission needs a scene behind the decorative plane. |
| `--ui-surface-separation` | `0` | Decorative rim/offset around participating surfaces; scaled by popup purpose and rendered size. It can appear with glassiness at 0. |
| `--ui-overlay-translucency` | `0` | How much of the scene decorative floating material transmits; larger values make the frame more transparent. Overlay and material content remain opaque. |
| `--ui-finish` | `0` | Matte (0) through polished (1). Reflection strength also depends on light strength and the generated readable reflection colors. |
| `--ui-edge-light` | `0` | Illuminated boundary, independent of depth. Bright edge strength also depends on light strength. |
| `--ui-glow` | `0` | Soft tone-derived light beyond a surface. Radius depends on glow; visible strength also depends on light strength. |
| `--ui-light-x` | `0.5` | Source position left (0) to right (1), relative to each surface. |
| `--ui-light-y` | `0` | Source position top (0) to bottom (1); `(0.5, 0)` is top center. |
| `--ui-light-spread` | `0.5` | Concentrated spot (0) through broad reflection (1). Requires finish and illumination to show a reflection. |
| `--ui-light-strength` | `0.65` | Shared illumination response. Does not set elevation or remove depth shadows at 0. |

The low end of glassiness and glow stays gentle; their upper range deliberately
allows a richer frosted material and a vivid bloom. The response is curved:
`g + 2g⁴`, so 30% remains close to its quiet setting while 100% reaches three
times the former linear response. This is an ornamental range, not a
readability constraint. Content planes stay opaque and reflection colours
remain readable; reduced-transparency preferences still remove the effects.

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

<details>
<summary>Migrate an older recipe</summary>

Before 1.0, renamed decisions have no compatibility aliases. Replace recipe
`density` with `spacing` and CSS `--ui-density` with `--ui-spacing`. Replace the
old length-valued recipe `control-size` with numeric `control-roominess`: divide
the desired medium height by the base text size (for example, `40px / 16px = 2.5`).
With the shared recipe, author `--ui-control-roominess`; `--ui-control-size`
remains a derived public height role. Relative geometry inputs keep their units;
generated guards retain the same documented pixel limits as absolute inputs.
Recipe `text-size` is now an explicit px base for the document root.

</details>

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

### Disclosure groups

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
`--ui-control-min-block-size` defaults to `44px` as an adjustable touch-area
comfort preference. It does not enlarge the shared visible control geometry;
choose target dimensions in context rather than treating this default as law.

A theme sets one root size, `--ui-font-size`; every type step derives from that resolved root, so the scale
moves as a whole:

| Step | Multiple | Used for |
|---|---|---|
| `--ui-font-size-2xs` | 0.6875 | keyboard hints and micro-labels |
| `--ui-font-size-xs` | 0.75 | captions and avatar-group counts |
| `--ui-font-size-sm` | 0.875 | controls, labels, badges, trees, and help text |
| `--ui-font-size-md` | 1 | body copy, field labels, the editor, and menus |
| `--ui-font-size-lg`, `-xl`, `-2xl` | 1.125, 1.25, 1.5 | headings |

Neighbouring steps are at least two pixels apart at the default size: a label one pixel smaller than
the text beside it reads as a mistake, not as hierarchy.

FormField and Combobox labels use the body step (16px at the default root), while
field help stays on the supporting step (14px). A compact theme can set
`--ui-field-label-font-size: var(--ui-font-size-sm)` to retain smaller labels.
In the customizer’s Typography view, **Field label size** defaults to **Follow body text**. Choose **Set a separate size** to author an independent size. The recipe stores this as `label-size`, and CSS/recipe exports preserve it.

The component-specific `--ui-form-field-label-font-size` and
`--ui-combobox-label-font-size` hooks take precedence on an individual component.


Choice marks follow typography through derived `--ui-choice-mark-size`,
`--ui-choice-track-height` and `--ui-choice-track-width`. The default ratios are
1.125, 1.5 and 2.5 times the base font size. Checkbox and radio marks keep the
same size across sm/md/lg rows; those rows align with shared control heights.
The switch thumb and travel derive from its track, including component hooks.
