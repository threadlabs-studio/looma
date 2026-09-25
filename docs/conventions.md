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

- Value state: `value` + `defaultValue`.
- Open state: `open` + `defaultOpen`.
- Controlled source always wins when provided.
- Events always fire for user intent.
- Controlled consumers must reflect state updates back to the component.

## Slots and Children

- Favor natural children first.
- Named slots, when needed, use short semantic names: `trigger`, `content`, `label`, `help`, `error`.
- Do not mutate child order unless contract explicitly requires it.

## SSR and Upgrade Contract

- SSR HTML must be meaningful and usable before JS.
- Upgrade attaches behavior without rewriting the tree shape.
- Required ARIA attributes must be derivable from SSR markup.
- Derive what a component shows from its props with `<computed>`, not a controller effect: a
  controller runs only after upgrade (a Vue component's only once mounted, never on the server), so
  anything it fills in is missing from server-rendered and first-rendered HTML.

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
- Icons inherit `currentColor`; size and stroke width stay themeable through
  Looma CSS tokens. Accessible names belong to the button or menu item, while
  decorative SVGs remain hidden from assistive technology.
- Components whose icon is consumer content may continue to accept a slot, but
  Looma-owned defaults and turnkey features use the shared registry.
- `ui-icon` derives its shapes from `name` in its template, so server-rendered and pre-upgrade HTML
  already carry the whole SVG; a component need not inline an icon's SVG to draw it before
  JavaScript. `tools/scripts/generate-icon-catalog.mjs` writes those shapes from `LOOMA_ICONS`.
