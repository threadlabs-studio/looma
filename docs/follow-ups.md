# Follow-ups after 0.3.0

Known work that did not ship in 0.3.0, grouped by target. The component option decisions and the
defects found by the 0.3 audit are recorded in the docs site's
[Component Option Audit](../apps/docs/docs/component-library-audit.md); this list points into it
rather than repeating it.

## Cleanup (in progress)

1. **Organize the repository.** One package (`packages/looma`); each component is one folder with
   its template, controller, and examples side by side (`components/ui-button/ui-button.html`,
   `ui-button.js`, `examples/`). The HTML Next spec forbids script in component HTML, so the
   controller sits beside the template rather than inside it. Delete the empty README-only folders
   and the unused TypeScript left from the old implementation.
2. **Style with classes, not state attributes or `:scope`.** A template that styles by a prop binds
   a class (`class:sm="size == 'sm'"`, then `.sm { … }`) instead of reflecting `data-size` and
   selecting `:scope[data-size='sm']`. Component styles are scoped by authorship, so `:scope` is
   not part of the source; the root is styled by its own element or class.
3. **No BEM.** Scoped styles need no block prefix: `.chip__surface` and `.chip__label` become
   `.surface` and `.label`. If a style is not contained to its component without a prefix, that is
   a runtime scoping bug to fix in HTML Next, not a reason for prefixes.
4. **No private custom properties that nothing reassigns.** Consumers customize through the public
   `--ui-<component>-*` hooks; a default that never changes is written inline in the rule that reads
   the hook (`background: var(--ui-chip-surface, var(--ui-surface-subtle))`), not aliased through a
   `--_chip-*` property declared on the root. A private property is only justified where a variant
   changes the default (`.sm { --_chip-font-size: … }`). Update `component-token-rule.test.mjs`,
   which currently requires the private aliases.
5. **No vendored HTML Next runtime.** `packages/core/src/declarative/runtime.js` and
   `generated-runtime.js` (plus a second copy in `tools/declarative-build/vendor/`) are bundled
   copies of HTML Next committed into source, because HTML Next is not published. Depend on the
   published `@nextwebwg/declarative-components` instead (also needed for the 0.4 no-build path).
6. **Remove `components/shared/native-control.js`** if nothing needs it any more (likely superseded).
7. **Format every component file.** Markup and style formatting is inconsistent across the templates;
   run one formatter over all of them (not Prettier).
8. **No generated files in source.** `src/declarative/registry.js` (each template inlined as a JSON
   string plus controller imports), the runtime copies, the committed adapters in
   `packages/{vue,react,svelte}/src/generated/`, and `generated/component-api.json` are build outputs.
   The two materializer modes also disagree (`--registry-only` lists folders and includes deferred
   components; the manifest pass does not).
9. **No package-level component CSS.** `packages/layout/src/declarative/styles.css` (243 lines) and the
   editor's (1,592 lines) style components from outside, through the runtime's private
   `data-component-root` attribute, and reset every descendant with `all: revert-layer` (why `ui-chip`
   needs `!important`). The published `layout.css`, `styles.css` (core, 940 lines), and `editor.css`
   are 0.2 leftovers that select the old invocation tags. The `@layer base/components/utilities`
   scheme exists only so that reset has a layer to revert to. HTML Next chooses scoping, not
   isolation, so the reset contradicts the platform. Each component's styles belong in its own
   template, scoped; consumer content is not reset; tokens are the only package CSS. Removing the
   `./layout.css`, `./styles.css`, and `./editor.css` exports is a breaking change for consumers.
10. **Legacy TypeScript beside the declarative components.** `packages/core/src/overlay/` (manager and
    positioning, 783 lines) is a second overlay stack: controllers use `components/shared/overlay.js`,
    so a consumer calling the exported `openOverlay` does not coordinate with any component. It is
    still used by `packages/editor/src/table-overlay.ts`. `packages/core/src/field/` types 0.2 event
    details and is used by a hand-written `packages/vue/src/Combobox.ts`. Audit the hand-written Vue
    components and editor classes against their declarative components, then remove the duplicates
    and the root exports.
11. **No `status` or `summary` on component definitions.** They are catalog and docs metadata, not
    platform semantics: nothing at runtime reads them. HTML Next's spec lists them as optional and
    never defines them, yet its parser requires both (HC007, HC003), so every Looma template carries
    boilerplate such as `status="early" summary="Looma ui-container layout primitive."`. Remove them
    from the HTML Next spec, parser, and contract, then from every template; descriptions belong in
    the docs pages.

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
