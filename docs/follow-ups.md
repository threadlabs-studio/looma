# Follow-ups after 0.3.0

Known work that did not ship in 0.3.0, grouped by target. The component option decisions and the
defects found by the 0.3 audit are recorded in the docs site's
[Component Option Audit](../apps/docs/docs/component-library-audit.md); this list points into it
rather than repeating it.

## Current goal (set 2026-09-22)

Knit running on a clean Looma whose components follow the proposal's styling model
(nextwebwg.org/html-next/styling) and whose Vue output contains no HTML Next.

1. **HTML Next runtime.** Root-only `data-component`; `:host`, `:host-state()`, and deep `:slotted()`
   compiled without a CSS parser in the browser (a real parser in build tools); `<?carrier?>`;
   framework adoption removed; `status`/`summary` optional; tests hardened across engines; published.
2. **Vue converter.** Generated `.vue` imports only Vue and the component's own modules; generated
   controller host; `<style scoped>`; tested against Looma's components; published.
3. **Looma cleanup and release.** The cleanup list below, adapters from the published converter, one
   package, released.
4. **Knit.** Migrate with the Knit session: custom-properties-only theme, 0.2 wrappers unwrapped,
   tests and pages verified.

## Cleanup (done on reorg/components, 2026-09-22)

Done: one package (`packages/looma`, every component a folder with its template, controller, and
examples); `:host` and `:host-state()` instead of `:scope` and styling-only `data-*`; no BEM in
component styles; private custom properties only where a variant reassigns them (checked by
`component-token-rule.test.mjs`); no vendored runtime, registry, generated adapters, or committed
API metadata; `native-control.js` and the legacy TypeScript duplicates (overlay manager, field
models, the table overlay element, the hand-written Vue Combobox) removed; every component file
formatted with dprint (checked in CI); no package component CSS (`layout.css`, `styles.css`,
`editor.css`, `@layer`, `all: revert-layer` are gone); no `status`/`summary`; the build is HTML
Next's assembler plus Vite and vue-tsc, with no rewriting. Controllers no longer add or remove
nodes: templates render tabs, toasts, menus, the combobox's options, avatar overflow, and every
editor surface. The HTML Next fixes this surfaced (attribute precedence, enumerated booleans,
multiple bindings per prop, camel-case `:host-state()` names, `:host` in `:slotted()` rules,
assembler source layout, `v-model` for form controls, type-clean Vue output) are in
`@nextwebwg/declarative-components@1.0.0-alpha.1`.

Remaining:
- **`:class` with a list** (item 12): specify class composition in the proposal.
- **Release 0.5.0**: publish HTML Next `1.0.0-alpha.1` (needs the npm owner's code), depend on it
  from npm instead of the local tarball, run `pnpm release:verify`, merge to main.
- **Knit on 0.5**: unwrap the 0.2 wrapper markup, move Knit's theme to custom properties only
  (Button needs per-variant tokens), replace `styles.css`/`layout.css`/`editor.css` imports with
  `vue.css`, drop the `core/declarative` test mocks, and verify with Knit's tests.
- **Storybook** is repointed at the package but its stories were not reviewed against the new DOM.

## Session notes (2026-09-22)

Decisions and findings from side conversations, kept here so they are not lost.

- **Separator is a native `<hr>`.** Done on the reorg branch: `<hr :aria-orientation="orientation">`,
  styles in the template, controller deleted (it only added `role` and `aria-orientation` at
  runtime). A labelled "— or —" divider is a different component: ARIA makes a separator's
  children presentational. Modern `<hr>` styling needs one reset (`margin: 0`, `border: 0`, one
  border side); the UA `margin: 0.5em auto` collapses it in a flex row.
- **Style scoping model (agreed 2026-09-22).** Styles are scoped from `[data-component]` to
  `[data-component]`: `@scope ([data-component~="x-chip"]) to ([data-component], [data-slotted])`.
  `data-component` marks component roots only (space-separated for delegated roots); every other
  element is unmarked. HTML Next's per-element stamping and its "authored, never inserted by other
  code" rule go: they protect nothing (any script can write the attribute) and are stricter than
  Shadow DOM. Verified in Chromium: the root and its markup are styled; a nested component's root
  and insides are not (limits are exclusive), so a parent lays out children from its own element
  (`gap`, grid) and a single child's box through the consumer's `class` on the invocation (needs
  the dropped-`class` fix); projected consumer content needs the one element marker
  (`data-slotted`, or `data-component-slot`) because slot ranges are comments CSS cannot see;
  `:slotted()` remains the opt-in. Update hydration and the rendered form, which use
  `data-component-root`. Needs the spec rewrite, a runtime prototype, and adversarial review.
- **ARIA and native attributes are legitimate style hooks.** `hr[aria-orientation="vertical"]`
  selects on an attribute the element needs anyway; prefer these over `data-*` reflection.
- **Attribute precedence.** The runtime writes a template's literal attributes after the
  invocation's, so an author's `role`, `class`, or other attribute on the invocation loses to the
  template. Specify invocation-over-template precedence in HTML Next (see Consumer `class`).
- **HTML Next on npm.** `@nextwebwg/declarative-components@1.0.0-alpha.0` is published (next and
  latest). The generator fixes from nextwebwg/html-next#49 and #50 need an `alpha.1` release (npm
  requires the owner's authenticator code). The converter, unplugin, and html-forms packages are
  publishable on main but unpublished: publish the converter with cleanup item 14; restore
  `private` on the other two until they have a consumer.
- **Reorg branch history.** Commit `d1d5c2c` ("Record the :host-state candidate") accidentally
  includes Matthew's in-progress edits (the `ui-container.html` sketch and the deletion of
  `packages/layout/src/declarative/{registry.js,registry.d.ts,styles.css}`); split it before the
  branch is reviewed. The layout package does not build until the registry question (item 8) is
  resolved.
- **Knit on 0.3.** 0.3.1 carries Knit's three blockers (TreeItem label slot, Select options, Vue
  form events and `v-model`). Knit's migration lives uncommitted in
  `workspaces/knit/gaborone` on a branch named `review-joel-workspace-ideas`; give it its own
  branch before committing. On 0.3.1 its typecheck is clean and all 1,031 unit tests pass (four
  stale 0.2 assertions updated: two theme tests removed because the behavior is Looma's now, the
  outline test and the tooltip `for` test rewritten for 0.3). E2E not yet run.
- **Knit migration follow-ups.** Unwrap 0.2 wrapper markup, which nests controls under 0.3 (for
  example `<Button><button>…</button></Button>` and `<Input><input v-model></Input>`). Knit's
  theme keys the outline button on `[data-component-root~='ui-button'][data-variant='outline']`,
  a runtime-private attribute plus an explicit-only reflection; give Button per-variant tokens so
  Knit sets tokens instead. Knit's other open gaps (docs/looma-migration-inventory.md in Knit):
  full-width Button, app shell (Sidebar is only the panel), multi-value Editable, Combobox
  `footer`/`empty`/`loading` slots, color-swatch picker, interactive Badge, selectable card/row,
  Avatar size/tint/presence.

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
