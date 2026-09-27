# Library coverage checkpoint (2026-09-26)

This is the current-source checkpoint for the [family survey](../component-library-audit.md) and
[option audit](../../apps/docs/docs/component-library-audit.md). Those documents explain the corpus
and the decisions made at the time; their "shipped" columns are historical. This checkpoint reads
the 73 component definitions under `packages/looma/src/components/`. A listed prop proves that an
option is declared, not that its behavior or accessibility has been qualified. The source definitions,
browser tests, and current public docs remain authoritative.

## Coverage that has moved since the surveys

- The source now has Combobox (including multiple values), Context Menu, Tree, Table, Meter,
  Description List, Input Group, Sidebar, and additional layout and display components.
- Button now has a separate `tone` axis and can render a native link; Input, Select, Textarea,
  Combobox, Checkbox, Radio, and Switch use the common `sm`/`md`/`lg` control sizes.
- Menu, Tabs, Disclosure, and Tree expose `density`. Top Bar renders a native `<header>`.
- A three-level theming cascade now connects global values, inherited field/action/overlay
  group values, then local component hooks. The [theming guide](../../apps/docs/docs/tokens.md)
  describes which value reaches which component.
- Textarea now has `autosize` with `rows` as its minimum height in browsers with CSS field sizing.
- Checkbox and Radio Group now declare `invalid` and expose it on their native controls.
- Combobox now declares `invalid`, `filter`, `open-on-focus`, and `loading`, with an `empty` slot.
- Button and Icon Button now declare `pending`, retaining focus while preventing activation.
- Callout now accepts `neutral`; `note` remains a compatibility alias.
- Avatar now has square and decorative modes and a person glyph fallback. Avatar Group accepts a
  true total and a templated accessible overflow label.
- Badge now has an outline variant for both pill and pointed tag shapes.
- Dialog is modal by default; `modeless`, `closedby`, `alert`, `size`, and an `open` event cover the
  adopted dialog options. The shared overlay stack applies the close policy when native `closedby`
  is unavailable.
- Editable has action labels, a placeholder, and native required and maximum-length constraints.
- Menu and Context Menu now accept named groups, separators, native link items, and shortcut hints;
  their keyboard navigation includes wrapping arrows, Home/End, and typeahead.
- Menu Item now has checkbox and radio states. Checkable items stay open and radios are exclusive
  within the nearest Menu Group.
- Toast Region has six placements and a single duration setting; authored Toast children carry
  tone, action content, and a dismiss request while programmatic messages keep show().
- Grid caps its responsive column count with `columns`; Switcher stacks overlong rows with `limit`.
- Popover and Tooltip now support twelve typed placements, a local offset hook, and collision
  flipping; Tooltip defaults to centered top and shortens delay while scanning nearby hints.
- Tabs adds manual activation for panels that take time to render; auto activation remains default.
- Tabs accepts authored tab buttons through a named slot when a text panel label is too limited.
- Disclosure adds exclusive named groups, rich summary content, optional heading semantics, and
  closed content that opens for a fragment target or find-in-page match.
- Tree now has click/tap and keyboard alternatives to dragging, typeahead navigation, and lazy
  branches that signal busy until children arrive.
- Tree selection now distinguishes navigation, single choice, and multiple choice. Multiple mode
  exposes checkboxes and cascades requests to descendants; applications retain controlled item state.
- Insert Table Grid now uses one roving tab stop with arrow navigation and inserts on cell
  activation; coarse-pointer cells are at least 44px square.
- Editor Toolbar now has roving focus among enabled authored controls; command state remains with
  the controls and the editor integration.
- Slash Menu now accepts authored items and groups with label/keyword filtering; Mention Menu
  accepts authored people with an Avatar start slot. Both keep their data item path for existing
  integrations, expose authored empty content, and report a stable value with the visible index.
- Table Toolbar and Table Context Menu now expose checked header row and column commands;
  LoomaEditor's integration executes them against the active table. Move row and column actions
  are enabled only where the table package accepts the move. Table Overlay's row and column
  handles select the axis and open its scoped menu.
- The turnkey Vue editor now offers create, edit, preview, and removal for links in its toolbar;
  the form preserves the selected text while focus moves out of the editor.
- The turnkey editor's Block actions menu inserts, duplicates, and deletes the active top-level
  block. It uses the toolbar on desktop and mobile instead of hover-only gutter chrome.
- Search Shell now moves focus from its search field through enabled result rows with arrows and
  Home/End; Escape always closes, while `dismissible` governs backdrop activation alone.
- Listbox now covers permanently visible single or multiple choice with native options, keyboard
  selection, form submission and reset; its field appearance follows the inherited theme layer.

## Family boundaries

| Family | Decision |
| --- | --- | --- |
| Menu hierarchy | Actions, links, checkbox and radio items, named groups, and keyboard navigation cover ordinary menus. Keep submenus deferred: a nested pointer and keyboard model adds complexity and no surveyed Looma use requires it yet. |
| Alert dialog | `ui-dialog alert closedby="none"` supplies alert semantics and an explicit decision action. A second component would repeat that contract. |
| Drawer or sheet | `ui-sidebar` becomes an off-canvas drawer at its breakpoint. Use a fullscreen Dialog for a modal task sheet. These distinct behaviors do not need one more generic overlay name. |
| Hover card | Use Tooltip for a brief noninteractive hint and click-triggered Popover for rich content. Defer hover-only interactive content, which needs a separately qualified pointer and focus model. |
| Editor block chrome | The accessible Block actions menu covers insert, duplicate, and delete in desktop and mobile toolbars. Keep gutter drag chrome deferred until it adds a concrete workflow beyond those actions. |

## Option coverage and qualification

The audit's adopted options now have declarations or an explicit composition path. Browser checks
cover the changed interaction contracts.

| Area | Decision | Boundary |
| --- | --- | --- |
| Layout | Sidebar `persist` declined | The application persists `collapsed` and `width` from `toggle` and `resize`, choosing its own storage scope and policy. The public Sidebar guide explains the contract. |
| Forms | No outstanding adopted options | Preserve native validation, form participation, and a declarative text form for every option. Multi-select belongs to Combobox or visible Listbox; the earlier Select `multiple` proposal was superseded. |
| Actions and display | No outstanding adopted options | Keep visual axes consistent and avoid adding a prop where a native attribute or composition already works. |
| Overlays | No outstanding adopted options | The shared positioner and dismissal behavior serve Popover, Tooltip, Menu, Context Menu, and Combobox; browser tests cover placement, keyboard and dismissal paths. |
| Navigation | No outstanding adopted options | Keep controlled state and keyboard patterns consistent; do not infer behavior from prop names alone. |
| Editor | No outstanding adopted editor options | Keep host callbacks and domain data outside the component boundary. |

## Theming decision

`danger` remains one semantic intent across validation, destructive actions, and status display.
`--ui-danger` is the simple global change. `--ui-field-danger` is a narrower inherited group
override for validation styling; it does not create a separate error palette. The same precedence
applies to group radius and overlay surface values. Group values stay unset by default, so a product
can retheme Looma through the small global contract without maintaining a second token inventory.

## Verification

- Package and browser tests exercise the newly adopted interaction contracts in HTML and Vue,
  including native forms, overlay dismissal and positioning, editor actions, and the global →
  group → component theme cascade in light, dark, and high-contrast themes.
- Docs browser checks measure contrast and accessibility for the published light and dark examples.
  The theming guide explains that a product's own palette still needs its own contrast and focus
  checks, including in high contrast.
- Generated API metadata, component examples, the docs site, Storybook, typechecking, and a packed
  consumer are verified together so the declared contract is available outside this workspace.
