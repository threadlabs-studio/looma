# Shared Conventions

## Plan

Set one API vocabulary that all components and adapters follow, including state names, event payload shapes, and controlled/uncontrolled behavior.

## Task Breakdown With Checkpoints

- Checkpoint 1: naming and event schemas fixed.
- Checkpoint 2: controlled/uncontrolled rules fixed.
- Checkpoint 3: slot and SSR contracts fixed.

## Naming Rules

- Attributes use kebab-case (`default-open`, `aria-controls`).
- Properties use camelCase (`defaultOpen`).
- Shared state names: `open`, `disabled`, `selected`, `checked`, `value`, `invalid`, `readOnly`.
- State styling exposure: `data-state`, `data-disabled`, `data-selected`.

## Event Rules

- Use native events when semantics already exist (`input`, `change`, `focus`, `blur`).
- Custom component events use lowercase names with stable payload keys.
- Preferred custom events:
  - `open`: `{ open: true, reason, trigger }`
  - `close`: `{ open: false, reason, trigger }`
  - `select`: `{ value, previousValue, trigger }`
- Payload keys are semver-protected and framework adapters must preserve them.

## Controlled/Uncontrolled Rules

- Declarative controls expose one native-like state name, such as `value`, `checked`, or `open`; they do not add framework-style `default-*` attributes.
- Input-like controls use the authored value as their initial/reset value. Live edits stand between external updates; a changed value prop replaces them. The component definition states its exact ownership rules.
- Explicitly controlled channels, such as Combobox's `selectedValues`, retain consumer ownership and report requested changes for the consumer to reflect back.
- Events report user edits or intent according to the component's declared contract. Adapters preserve the underlying ownership rules.
- Removing or reanchoring a Menu or Popover collapses its released trigger, even if the consumer set `aria-expanded="true"` before mounting the overlay. Other pre-existing trigger attributes are restored.

## Slots and Children

- Favor natural children first.
- Named slots, when needed, use short semantic names: `trigger`, `content`, `label`, `help`, `error`.
- Do not mutate child order unless contract explicitly requires it.

## SSR and Upgrade Contract

- SSR HTML must be meaningful and usable before JS.
- Upgrade attaches behavior without rewriting the tree shape.
- Required ARIA attributes must be derivable from SSR markup.
- Derive rendered data before SSR. Use `<computed>` for declaration expressions and
  server-prepared module inputs for calculations outside that expression language.
  Browser connection attaches interactions; a controller effect that first fills
  rendered data after mounting leaves that data missing from the server HTML.

## Template Text And Formatting

Use `{$label}` for reactive text and slot fallbacks, and mixed text such as `Create “{$query}”` for labels around a value. `$value` remains useful when an expression replaces an element's whole content, particularly when formatting would introduce whitespace around its text. Literal opening braces in template text use `\{`. Inline paths and equivalent `$value` bindings generate the same direct Vue text, including in repeated rows.

Use `concat()` for IDs, slot names, CSS values, and composed strings. Use Intl `format()` for localized presentation, such as `format($percent / 100, 'percent', { maximumFractionDigits: 0 })` for a meter's spoken percentage. Formatting may also specify a locale as its final argument. Keep CSS and machine-readable attribute values independent of locale.

## No External Margin Rule

- Components cannot set external margins.
- Inter-component spacing is owned by layout primitives (`ui-stack`, `ui-cluster`, etc).
- Lint and visual examples should enforce this policy.

## Icon System

- Looma's shipped controls use Lucide. Internal actions must use a real Lucide
  SVG from `LOOMA_ICONS`, never a Unicode glyph or text stand-in.
- Use `LoomaIconName` for typed command metadata and `loomaIconMarkup()` in
  framework-neutral components. Framework adapters render the same icon nodes
  as native VNodes.
- Icons inherit `currentColor` and are `1em` by default, so they follow the text
  around them. A container such as Icon Button sets its icon's default size
  instead. `--ui-icon-size` and `--ui-icon-stroke-width` restyle one icon.
  `tone="secondary"` or `tone="muted"` gives a supporting icon its semantic colour
  without wrapping it in text; the default `inherit` follows the control.
  Accessible names belong to the button or menu item, while decorative SVGs
  remain hidden from assistive technology.
- Components whose icon is consumer content may continue to accept a slot, but
  Looma-owned defaults and turnkey features use the shared registry.
- `ui-icon` derives its shapes from `name` in its template, so server-rendered and pre-upgrade HTML
  already carry the whole SVG; a component need not inline an icon's SVG to draw it before
  JavaScript. `tools/scripts/generate-icon-catalog.mjs` writes those shapes from `LOOMA_ICONS`.

## Component-owned layout

A component's alignment and spacing are library behavior. Declared display, flex
flow, alignment, gaps, margins, padding and box sizing are protected with
`!important`, including state-specific declarations. This stops ordinary host
styles, high-specificity selectors and normal inline declarations from silently
reconfiguring the component. Public token values stay ordinary custom properties;
a protected declaration still resolves its supported token normally. An explicit
consumer `!important` remains a deliberate CSS escape hatch, governed by normal
cascade precedence. It is not the recommended implementation path.

Do not protect custom-property declarations or keyframes. Internal controller writes
to protected properties must deliberately use important priority, and remove those
owned declarations when their state no longer applies. Do not turn a controller's
transient state into a consumer CSS dependency.

Boxed Buttons centre the label’s cap-height/baseline text box. Button and link
roots share border-box geometry. Descenders remain visible; inline link actions
retain normal inline flow. Do not compensate for font metrics with page-level translations.

A Checkbox centres its mark by painted geometry, independently of font metrics.
It centres its box against the label's first line. Font metrics, wrapping
and descriptions must not switch its alignment policy. A page may position the
whole checkbox; it cannot use ordinary `align-items` to rearrange its input and
label. If a supported change needs new behavior, add it to the responsible primitive
and verify related consumers rather than compensating in application CSS.
