# Follow-ups after 0.3.0

Known work that did not ship in 0.3.0, grouped by target. The component option decisions and the
defects found by the 0.3 audit are recorded in the docs site's
[Component Option Audit](../apps/docs/docs/component-library-audit.md); this list points into it
rather than repeating it.

## 0.4 goals

- **Multi-select is the combobox's job.** `ui-select` stays the native, single-choice control; the
  native multi-select interface is poor. Remove `multiple` from `ui-select` and steer multi-select to
  `ui-combobox multiple`. (This replaces the audit's `values: list(string)` plan for `ui-select`.)
- **No-build loading.** Support HTML Next's no-build model with Looma: a page loads HTML Next's
  browser entry with `<script type="module">` and links each component with
  `<link rel="component" href="…/ui-button.html">`. This needs HTML Next's browser entry
  (`@nextwebwg/declarative-components/browser`) published to npm, and Looma shipping its component
  HTML, controllers, and styles as files. Document it beside the installed-package path.

## Defects

- The audit's defect table: Checkbox and Switch lack `name`; Radio Group arrow keys use one axis;
  Dialog Escape depends on `dismissible`; Popover, Tooltip, and Menu `placement` ignore `left`,
  `right`, and centred values; Tree has no keyboard reordering (WCAG 2.5.7); Form Field describes its
  error slot while valid; Editable's empty value is an invisible target; Editor Toolbar toggles lack
  `aria-pressed`; Insert Table Grid ignores `header-row`; Slash and Mention menus overwrite
  `aria-label` and hard-code English; verify Separator labels and Search Shell Escape.
- **Consumer `class` is dropped** when a component root has its own static `class` (HTML Next runtime;
  affects `ui-search-result-row` today). Specify class and style merging between template and consumer.
- **Explicit versus default props.** A template that binds `data-<prop>` for its own prop (Button's
  `:data-variant`, `:data-size`, and others) makes an explicit prop indistinguishable from its default
  after server rendering. Reserve `data-<prop>` for the record and compile default styling instead
  (see HTML Next's rendered-form open issues).
- Authors still write `data-*` markers in two places: Toast Region stories (`data-ui-toast`) and
  Affordance Scope participants (`data-ui-affordance`). Replace both with declared attributes or
  elements.

## Audit-adopted options

The Layout, Form controls, Actions and display, Overlays, Navigation and collections, and Editor
tables of the audit list the options each component adopts after 0.3 (for example Grid `columns`,
Switcher `limit`, Input `size` and `ui-input-group`, Textarea `autosize`, Button `pending`, Avatar
`size`/`shape`/`decorative`, Dialog `closedby`/`alert`/`size`, full `placement` sets, Menu groups,
separators and checkable items, `<ui-toast>` children, Disclosure `name`, Tabs `activation`, Tree
`selection` and `lazy`, Sidebar `persist`).

## Knit contract

- Forward `id`, `name`, and `aria-*` from wrapper-rooted form controls (Checkbox, Radio, Switch,
  Combobox) to their inner control, and document where each attribute lands.
- `aria-pressed` on editor toolbar toggles; accessible names and keyboard reordering for drag handles;
  announce drop outcomes.
- Hide closed overlay invocations before lowering.
- Knit's conformance scenarios as fixtures in Looma's suite.
- List each component's public tokens and guarantees on its API tab.

## Adapters and platform

- **Svelte components.** `@threadlabs/looma/svelte` exports DOM factories (`createUiButton`, …), not
  Svelte components. Generate real components with HTML Next's Svelte target, and qualify React and
  Svelte for release (both are previews in 0.3).
- **Framework-native reactivity.** Controllers run on HTML Next's own signals inside framework
  adapters; map the host to each framework's reactivity instead.
- **HTML Next structural anchors.** `$if`, `$each`, and `$match` still write implementation-named
  comments (`html-next:start`, …); move them to the rendered-form marker grammar.
- **Framework ownership marker.** Resolved in 0.3 (no `data-looma-managed`); keep it out.

## Docs and tooling

- The every-component-page docs test is slow under parallel load; give it its own worker or split it.
- Decide the docs site's cream background (ghost and subtle styles are tuned to it).
- Icon Button medium and large sizes may be slightly large; revisit with real layouts.
