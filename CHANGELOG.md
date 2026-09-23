# Changelog

## Unreleased

## v0.6.2

- Combobox with `multiple` keeps the items it selects. It reported each choice and waited for the
  consumer to pass `items` back, so selecting an option appeared to do nothing. A consumer that
  sets `items` still owns them.
- Combobox's help affordance is a circled question mark beside the field, not a bare `?` inside the
  box, and it opens its tooltip on press. A control's box holds its value.
- Tooltip takes `trigger`: `hover` (also opens on keyboard focus), `click` for a help button where
  hovering a question mark says nothing, or `focus`.

## v0.6.1

Fixes for 0.6.0, found by a new rule that checks every token a stylesheet reads is defined.

- The editor's stylesheet still referenced tokens 0.6.0 renamed (`--ui-radius-1`/`-2`,
  `--ui-editor-toolbar-bg`, `--ui-space-1-5`). `var()` with no fallback is invalid when the name is
  undefined, so those radii computed as 0 and `--ui-editor-toolbar-surface` was ignored.
- Restored `--ui-font-size-xl`, `--ui-font-size-2xl`, and `--ui-line-height-relaxed`, which the
  editor's prose reads: 0.6.0 removed them as unread.
- The editor toolbar marks an active mark with a tint, not a solid fill. Solid is the strongest
  emphasis and means "this is the action to take"; a row of nineteen controls should not shout at
  rest. `--ui-editor-toolbar-active-surface`, `-text`, and `-border` set it. Each toggle now also
  reports `aria-pressed`.
- The pinned editor toolbar wraps instead of scrolling behind a hidden scrollbar, so controls that
  do not fit the text column stay reachable.
- Tokens that never matched their component are renamed: `--ui-layout-gap` is `--ui-stack-gap` and
  `--ui-cluster-gap`; `--ui-toast-enter-duration`/`-exit-duration` are
  `--ui-toast-region-enter-duration`/`-exit-duration`. Per-instance values the component sets
  itself (the insert-table grid's dimensions, the table swatch colours) are private.

## v0.6.0

Migrating a theme:

- Set the contract (about 40 values) and delete everything that restated a derived value: the
  `*-solid`/`*-soft` intent pairs, `--ui-surface-default`/`-elevated`/`-canvas`/`-hover`,
  `--ui-text-primary`, `--ui-font-family-*`, `--ui-font-normal`/`-semibold`/`-bold`,
  `--ui-space-5`/`-6`, `--ui-shadow-xs`/`-md`/`-xl`, `--ui-motion-base`. A converted product theme
  dropped from 104 declarations to 74, and a third of it was restating Looma's own derivation.
- Rename: `-bg`/`-color` component tokens are `-surface`/`-text`; `--ui-radius-1`…`-4`/`-xl` are
  `-sm`/`-md`/`-lg`/`-dialog`; `--ui-text-sm` is `--ui-font-size-sm`; `--ui-color-focus` is
  `--ui-focus-ring`; `--ui-tree-row-min-height` is `--ui-tree-item-min-block-size`.
- If you redefined an Icon Button per-size token (`--ui-icon-button-size-sm`/`-size-lg`), set
  `--ui-icon-button-size` on the element instead; the `size` prop resolves the default.
- If you want a disabled state other than the neutral default, set `--ui-disabled-surface` and
  `--ui-disabled-text` once, rather than per component.

- The editor's editing surface carries `role="textbox"` and `aria-multiline="true"` with its
  `label`. A name on a plain `contenteditable` div is prohibited by ARIA, which rc.1 tripped.
- Disabled is a contract decision: `--ui-disabled-surface` and `--ui-disabled-text` give every
  component the same neutral disabled state at full opacity, instead of each variant fading its
  own colours. `--ui-<component>-disabled-*` still overrides it.
- `tone="accent"` on Button tints an outline, ghost, or link button with the accent colour, for a
  secondary action that still reads as the primary path.
- The editor toolbar's `--ui-editor-toolbar-button-size` and `-mobile-button-size` work again:
  they set `--ui-icon-button-size`, which replaced the per-size tokens.

### Also in 0.6.0

Breaking: the theming surface. A product themes Looma through a contract of about 40 values; every
other global derives from them. See the entries below for the renames and removals.

- Editor: a `label` prop names the editing surface (default "Document"). Without it the text box
  had no accessible name, which fails WCAG 4.1.2.
- `--ui-surface-muted` and `--ui-radius-lg` are contract values, not derived ones: a palette with
  its own middle neutral, or a product that rounds large surfaces differently, sets them rather
  than accepting the derivation.
- Theming has a contract: about 40 `--ui-*` values (intent colour, neutrals, focus, type, space,
  radius, elevation, motion, and the shared control sizes) that a product sets to theme Looma.
  Every other global is derived from them, so a theme that sets only the contract stays coherent.
- The duplicate `oklch` palette is gone: one palette per theme, in the theme files.
- Removed the parallel radius and text scales: `--ui-radius-1`…`-4` and `--ui-radius-xl` are
  `--ui-radius-sm`, `-md`, `-lg`, and `-dialog`; `--ui-text-sm` was a font size and is
  `--ui-font-size-sm`; `--ui-color-focus` is `--ui-focus-ring`; `--ui-space-1-5` and
  `--ui-space-12` are gone.
- Tree Item's label cell stretches its slotted content, so a link in the label slot is the row's
  hit area instead of sizing to its own text.
- Light dismiss needs a press it can place: a pointerdown reporting no coordinates (assistive
  technology, or a synthetic event) no longer closes a dismissible overlay.
- `--ui-control-min-block-size` is `44px`, not `2.75rem`: WCAG counts CSS pixels, so a smaller root
  font must not shrink a touch target below the minimum.
- `density="compact"` on Menu, Tabs, Disclosure, and Tree: rows trade padding and type size for
  fit. Nothing has to rescale a global token to compact a menu any more. Menu Item reads
  `--ui-menu-item-padding-block`/`-padding-inline`, `-font-size`, `-radius`, and `-hover-surface`.
- One token vocabulary, `--ui-<component>[-<variant>][-<state>]-<property>`: `-bg` and `-color`
  become `-surface` and `-text` (Icon Button, Top Bar, Search Shell, Search Result Row, Editor
  Toolbar), and the state comes before the property (`--ui-button-ghost-hover-surface`,
  `--ui-button-link-text`).
- Tokens that restated a prop are gone: `--ui-icon-button-size-sm`/`-size-lg` (the `size` prop
  resolves the size; `--ui-icon-button-size` still overrides it on an element), and the Floating
  Action Button's colour and size family (it reads the accent and control values directly, and
  keeps `--ui-floating-action-button-inset-block-end`/`-inset-inline-end`/`-z-index`).
- Names that never matched their component are renamed or gone: `--ui-field-*`, `--ui-option-*`,
  and `--ui-multi-combobox-*` are `--ui-combobox-*`; `--ui-z-overlay` is
  `--ui-context-menu-z-index`; the tree's row tokens carry the name of the component that reads
  them (`--ui-tree-item-min-block-size`, `-font-size`, `-label-padding-block`/`-inline`).
- Every component colour token's fallback chain ends in a semantic token, and the dead literal
  fallbacks on global tokens are gone.
- A dark theme's intent tones take a dark foreground (`--ui-on-accent`, `--ui-on-danger`), since
  its solid tones are light.

## v0.5.2

- The Vue components are converted by `@nextwebwg/html-next` (it replaces the deprecated
  `@nextwebwg/declarative-components`) and read as hand-written Vue: props by name, typed values
  with no helper object, `v-if`/`v-for` on elements, and dprint formatting.
- Breaking (types only): optional Vue props are declared `name?: T`, not `T | null`; pass
  `undefined`, not `null`, to leave one unset.
- `v-model:<prop>` works wherever an event reports a prop: `v-model:open` on Dialog, Menu, Context
  Menu, Popover, Tooltip, Disclosure, Search Shell, and Toast Region; `v-model:query` on Combobox;
  `v-model:checked` on Checkbox, Radio, and Switch.
- Select: `v-model` selects the model's option once the slotted options exist, and after
  hydration. It had shown the first option.
- Form Field: its label, help, and error regions are styled however they are slotted: `#label` in
  Vue as well as `slot="label"` in HTML.

- Icon Button: on coarse pointers and once touch input is used, an invisible hit area at least
  `--ui-control-min-block-size` square is centred on the button, so it is a touch target without
  growing visually.

- Tree Item: the label spans the row height and centres its content, and
  `--ui-tree-label-padding-block` / `--ui-tree-label-padding-inline` set its padding, so slotted
  label content such as a link can fill the row as its hit area.

- Search Shell: a dismissible shell closes on the first Escape, including from inside its search
  field (the browser otherwise spends that Escape clearing the field).
- Search Shell: the search region shows focus with an accent edge, themed by
  `--ui-search-shell-focus-color` (default `--ui-control-focus`).
- Button: `align="start"` lays content out from the start edge with start-aligned text (option
  rows such as a create chooser), and `stretch` fills the container's inline size.
- Popover: an anchor toggle dispatches one `open` or `close` with its real trigger. It had
  reported opens as `programmatic` and dispatched each anchor close twice.
- Dialog: the header close button is a touch target (`--ui-control-min-block-size`) on coarse
  pointers and once touch input is used.
- Tree Item: drop feedback (the inside highlight and the before/after insertion indicator) styles
  only the target row, not every row nested in an expanded container.
- Tests: Tree drag and drop is covered in the browser (reorder detail, inside drops and
  hover-expand, indicators, max-depth and accepts rejection, the full-row drag image).

## v0.5.1 Candidate

- Button: a ghost button reads `--ui-button-ghost-text`, not `--ui-button-text`, so theming the
  outline text leaves ghost buttons alone.
- Button and Icon Button: disabled styling is themable. `--ui-button-disabled-opacity`,
  `-surface`, `-border`, and `-text`; `--ui-icon-button-disabled-opacity`, `-bg`, `-border`, and
  `-color`. Unset, each falls back to the variant's own colours at 0.6 opacity, as before.
- `@threadlabs/looma/vue` exports `trackInputModality(document)`. Call it once on the client so
  touch sizing (`html[data-ui-input-modality="touch"]`) applies app-wide after the first touch;
  Tree Item still starts it on mount.

## v0.5.0 Candidate

Breaking: Looma is one package built from one set of component definitions.

- The Vue components are converted from the definitions by HTML Next and contain no HTML Next
  runtime: each renders its native root with Vue. Import their styles once from
  `@threadlabs/looma/vue.css`. Input, Textarea, and Select keep `v-model`.
- Components follow the styling model of the Declarative HTML Components proposal: styles are
  scoped to each component, customization is through `--ui-*` custom properties, and a component's
  props are styled through its own state, not reflected `data-*` attributes.
- Removed: `@threadlabs/looma/core`, `/layout`, `/loader`, `/core/declarative`,
  `/core/declarative-generated`, and the `layout.css`, `styles.css`, and `editor.css`
  stylesheets. Component styles ship with each component; `tokens.css` and the themes remain.
- `@threadlabs/looma` registers every component (layout and editor included) for HTML pages;
  `@threadlabs/looma/components/*` are the component files for pages without a build.
- Chip, deprecated since 0.3, is removed; use Badge.
- A consumer's attributes on a component win over the component's own (a `type` on a Button,
  for example), and a consumer's `class` is kept.
- Fixes: Menu items take keyboard focus; the Floating Action Button no longer stretches to the
  viewport width; toasts authored inside a Toast Region show while `open` is set; the context menu
  is one surface; checkbox, radio, and switch events report keyboard and pointer triggers.

## v0.4.0 Candidate

Breaking: `@threadlabs/looma/react` and `@threadlabs/looma/svelte` are removed.
React support is in development: it ships once HTML Next converts components to
React without its runtime. The optional `react` and `svelte` peer dependencies
are removed with them. The documentation shows HTML and Vue examples only.

## v0.3.1 Candidate

- Vue Input, Textarea, and Select support `v-model` (`modelValue` and
  `update:modelValue`, from the native `input` event, or `change` for Select).
- Vue handlers for native `input` and `change` events receive the event itself;
  component events still receive their `detail`.
- Select renders its authored `<option>` children in every adapter: HTML Next
  parses `<select>` content by the HTML Standard's rules.
- Tree Item has a `label` slot: content such as a link replaces the label text,
  while `label` stays the item's accessible name and names its disclosure and
  drag handle. Framework adapters also render declared text (`$value`) directly
  instead of filling it in after mount.

## v0.3.0 Candidate

Breaking: Looma components are HTML Next declarative components. Each
`ui-*` invocation lowers to its native root (`<button>`, `<input>`, `<dialog>`,
and so on); no custom elements are registered.

- Props are HTML attributes. Values are typed by HTML Next's type system;
  `list`, `record`, and `object` props are written as JSON attribute text.
  Components no longer expose JavaScript properties on their roots, and only
  props an author supplies are reflected as `data-<name>`.
- Attributes written on an invocation, including `class`, `style`, `id`,
  `type`, `name`, and `aria-*`, land on the native root.
- Components read their public `--ui-*` tokens with fallbacks instead of
  redeclaring them, so tokens set on an ancestor apply (for example
  `--ui-dialog-viewport-gap: 0` for an edge-to-edge dialog).
- Button gains `variant="link"`: an inline text action with no box, the
  inherited font, an underline that strengthens on hover, and a focus ring.
- Rebuild `ui-sidebar` as the sidebar panel only (an `<aside>`), no longer a
  two-pane layout: `width`, `resizable` with bounds, `collapsed`, and below its
  `breakpoint` an off-canvas drawer; a `commandfor`/`command="--toggle"` button
  toggles it, reported by a `toggle` event.
- Rename `ui-center` to `ui-container` (Vue, React: `Container`): a centred column
  with a maximum width and gutters.
- Rename `ui-inline` to `ui-cluster`. A cluster always wraps and has no
  `wrap` or `justify` props.
- Combobox: drop function-valued hooks, option descriptions, and option
  metadata. Single selection uses `value`; multiple selection uses `items`.
  A selected value's label follows later changes to its authored option.
- Remove the Valibot field adapter and its optional peer dependency.
- Dialog gains a titled header with a close button, a scrolling body, and an
  `actions` footer. Toast Region gains `auto` and `duration`. Tooltip gains
  `inverse`. Tabs gain `stretch` and scroll on overflow. Icon Button gains
  `round`. Editable gains `hint` and `actions`.
- Tree Item `expand` no longer bubbles and never changes ancestors or
  siblings.
- Overlays resolve `for` targets that appear later, treat backdrop presses as
  outside presses, measure position without mid-animation transforms, and
  close correctly when `open` is `false`. Context Menu renders its menu inside
  its positioned surface and leaves focus alone after a light dismiss.
- High-contrast themes use high-contrast accent and danger colors.
- Server-rendered components hydrate into the same instance their authored
  markup lowers into, including slot content not yet shown, using HTML
  Next's rendered form (slot range markers and `serializeRenderedForm`).
  Framework adapters no longer write a `data-looma-managed` ownership marker,
  and Vue slot regions use the native `slot` attribute.
- A visual pass across controls: control and icon sizing, raised surfaces,
  focus halos, overlay elevation, and select and combobox affordances.
- Publish the component option audit, which records the options each
  component adopts after 0.3.

## v0.2.20 Candidate

- Preserve editor focus while table-overlay controls are pressed, so a managed
  overlay cannot replace the pointer target before its insertion click fires.

## v0.2.19 Candidate

- Project slash commands to the managed menu's display-only item contract,
  keeping internal keywords and executable callbacks out of component props.

## v0.2.18 Candidate

- Convert native editor suggestion rectangles to Looma's structural anchor
  contract before rendering managed mention and slash menus, preventing a
  mount-time validation error from freezing asynchronous results at loading.

## v0.2.17 Candidate

- Keep async mention suggestions current while a query is typed one character
  at a time, so fast input cannot leave the menu stuck in its loading state.

## v0.2.16 Candidate

- Preserve every Vue-owned TreeItem slot across SSR hydration when conditional
  controls precede the row regions, so folder icons, labels, actions, and
  children remain visible after declarative controller attachment.

## v0.2.15 Candidate

- Forward generated Combobox query, selection, creation, and focus events
  through Vue using its component-listener contract, so controlled queries no
  longer revert while typing and separator-driven item creation reaches apps.
- Preserve omitted controlled Boolean props as `undefined` in generated Vue
  adapters, so Editable, menus, disclosures, form controls, and tree items keep
  their documented uncontrolled behavior until an owner supplies state.
- Keep sole default-slot children direct in generated Vue roots, preserving
  native child-selector layout and measurements for Sidebar, Switcher, Reel,
  and other single-region primitives.

## v0.2.13 Candidate

- Preserve Vue-owned flow anchors during SSR hydration and make generated Vue
  roots reconcile their actual structure, so later conditional updates cannot
  shift labels, actions, children, or other projected content between regions.

## v0.2.12 Candidate

- Keep Vue-owned default-slot content in its intended component region across
  reactive updates, including labels beside named leading and action regions.

## v0.2.11 Candidate

- Preserve Vue-owned conditional content added after mount in named slots, so
  framework updates remain in the intended component region.

## v0.2.10 Candidate

- Preserve conditional framework subtrees during native-root attachment, so
  nested components in named slots remain intact, and keep hidden native roots
  out of layout.

## v0.2.9 Candidate

- Preserve Vue named-slot content when declarative controllers attach to native
  roots, and keep optional-region visibility synchronized with controller state.

## v0.2.8 Candidate

- Render conditional Vue tree-item controls directly so server markup hydrates
  without browser-parsed template nodes changing its child structure.

## v0.2.7 Candidate

- Preserve server-rendered framework component roots during package registration
  so adapters can hydrate without Looma rewriting their child structure first.

## v0.2.6 Candidate

- Interpret pasted HTML and Markdown document markup as editable structure while
  preserving programming-language source and explicit code-block paste as code.
- Keep paste as one Undo/Redo history step, make command availability reactive,
  and add an opt-in sticky desktop toolbar for always-visible editor controls.

## v0.2.5 Candidate

- Keep defined menu-item spacing on its single shadow-owned surface while
  retaining the styled pre-upgrade and no-JavaScript fallback.

## v0.1.28 Candidate

- Keep anchored popovers and menus inside visual-viewport gutters, falling back
  from native anchor placement when the rendered surface would overflow.
- Give popovers and menus one painted, scroll-owning surface and prevent
  pre-upgrade fallback chrome from surviving as a second wrapper after upgrade.
- Include dialog chrome in viewport sizing so compact modal content does not
  introduce avoidable nested scrolling.

## v0.1.27 Candidate

- Keep selected values to a single bounded line by default, including custom
  chip renderers, with an explicit CSS token for another finite maximum width.

## v0.1.26 Candidate

- Let multi-value combobox consumers opt into separator-driven token entry.
  Typing a configured separator commits an exact suggestion or creates the
  current query, clears synchronously, and keeps focus ready for the next item.
- Preserve unmatched text when creation is disabled, and forward the new
  `tokenSeparators` contract through the supported Vue adapter.

## v0.1.25 Candidate

- Add a domain-neutral `ui-editable` reveal primitive with explicit activation,
  outside-click dismissal, Escape handling, and predictable focus transfer.
- Add a controlled `ui-multi-combobox` for keyboard-navigable selected values,
  optimistic consumer updates, metadata, and custom item and option rendering.
- Extend Combobox composition with visually hidden labels, inline start content,
  popup footer content, and imperative input focus.

## v0.1.24 Candidate

- Add compact semantic `ui-chip` metadata and `ui-callout` primitives, including
  persisted editor callout nodes and Info, Note, and Warning slash commands.
- Make tree nesting structural, with derived accessibility depth and indentation,
  and add keyboard navigation that preserves slotted interactive content.
- Define controlled primitive state explicitly: omitted values use local defaults;
  supplied false and empty values remain controlled until the owner accepts a
  requested change.
- Generate typed Vue adapter props and emitted event details from the public
  component API, and fail CI when generated API metadata or declarations drift.

## v0.1.23 Candidate

- Add a domain-neutral smart combobox with contextual async suggestions, separate
  query/selection state, connected disclosure/help, rich options, and typed Vue models.
- Add Standard Schema field validation, a separate optional Valibot adapter,
  non-destructive display formatting, and scoped restrained typography hooks.
- Make tooltip descriptions accessible and optionally pinnable by click/touch,
  preserving hover/focus access and Escape dismissal.
- Expand closed tree targets before committing containment reorders, so moved
  items render immediately as the target's first child.
- Add optional hierarchy/subtree depth metadata, truthful disabled pointer
  feedback, and structured rejection events for known-invalid depth-limited drops.

## v0.1.22 Candidate

Nested sources keep parent-level outdent feedback current from their native
`drag` coordinates. This covers ancestor rows that cannot receive a new
`dragenter` because the gesture began inside their expanded subtree.

## v0.1.21 Candidate

Tree drop targets become active on native `dragenter`, so short gestures
can highlight and commit before Chromium emits a later `dragover`. Drop
feedback also survives transitions across a tree item's shadow boundary,
preserving nested insertion bars while folders open recursively.

## v0.1.20 Candidate

Short native tree drags complete at the item beneath the released pointer
even when Chromium ends the gesture without emitting `dragover` or `drop`.
Normal drops remain unchanged, while canceled and outside-tree drags still do
nothing.

## v0.1.19 Candidate

Tree insertion feedback stays aligned with the resulting hierarchy. Nested
sibling bars use the child level, while an `after` drop on an expanded folder
appears below its complete subtree. An `inside` drop is defined as the first
position in the target's compatible child list.

## v0.1.18 Candidate

The editor exposes a domain-neutral people-mention extension and an accessible,
bounded mention menu for static or asynchronous workspace providers. Context
menus keep keyboard focus inside their active top-layer surface, and table
row/column selectors rest as subtle centered bars that expand to full drag
handles on hover or focus.

## v0.1.17 Candidate

Menus, popovers, context menus, tooltips, and toast regions share one top-layer
windowing contract, so scrolling and clipping ancestors cannot hide them.
Native CSS Anchor Positioning is preferred for anchored surfaces; a lightweight
flip/shift fallback runs only while one is open. Tooltips wait for pointer
intent by default, expose configurable show/hide delays, and still open
immediately for keyboard focus.

Trees default to compact 32px rows and a 15px dense-interface text token, then
animate to 44px targets only after real touch input. Looma's default sans font
uses the native system UI stack. Controlled Vue editor updates preserve an
active ProseMirror selection without stealing focus from another control.
The editor and interactive Storybook table picker use the same anchored,
light-dismissible popover instead of hand-positioned floating panels.

## v0.1.16 Candidate

Vue adapters preserve Stencil's hydration marker across consumer class updates,
so responsive rerenders cannot leave already-rendered components invisible.
This candidate supersedes `0.1.15` for Vue consumers using the new semantic tree
components.

## v0.1.15 Candidate

Applications can build semantic, themeable trees with consistent disclosure,
selection, indentation, and contextual action slots. Pointer reordering uses
the complete row as its drag image, mutes the source in place, distinguishes
capped before/after insertion from container drops, and expands closed targets
after deliberate hover intent.

The public core also exposes reusable drop-position, drag-image, and hover-intent
utilities. Looma filters incompatible and descendant targets before showing a
move cursor or visual preview; applications retain data, authorization,
domain-specific validation, keyboard/touch action menus, and persistence.

## v0.1.14 Candidate

The turnkey Vue editor accepts provider-neutral image upload metadata
and resolve responsive rendition attributes at render time without persisting
CDN URLs in editor JSON. Image activation is accessible in editable and
read-only modes, failed renditions fall back to the stored master once, and
failed uploads can retry the same `File`.

Hosts retain control over image storage, CDN policy, viewer presentation, and
telemetry through typed callbacks and events. Looma owns only the reusable
editor interaction and delivery seam.

## v0.1.13 Candidate

Release qualification compiles and executes the exact public consumer
fixture against the packed facade before npm publication. The fixture uses the
typed `heading-1` Lucide key, so icon-contract drift is caught before immutable
package bytes reach the registry. Its Tiptap core, PM, and Vue dependencies are
also aligned on the same supported 2.27 line for a complete SSR consumer graph.

## v0.1.12 Candidate

The turnkey editor separates table discovery from editing: hovering a cell
reveals its row and column handles before focus, while selecting it adds the
cell-action menu and table toolbar. Column resizing stays anchored to compact
112px-minimum cells, and wide tables scroll as one surface on narrow screens.

Editor controls share an opinionated, typed Lucide icon registry and
token-driven ghost-button treatment. The insert-table picker preserves a
committed size while previewing hover choices, the mobile slash menu selects
the intended block type, and Storybook exercises the real editor instead of
fixed interaction states.

## v0.1.11 Candidate

Empty body cells expose reliable column-resize handles in the turnkey Vue
editor and the standalone Looma table extension. Tiptap's structural cell
minimum matches Looma's rendered 112px minimum, and its inward boundary probe
stays inside empty cells so a direct hover can begin a real column drag.

## v0.1.10 Candidate

The turnkey Vue editor anticipates table actions with contextual guide dots,
near-hover insertion and selection controls, direct-hover tooltips, exact
merged-cell geometry, and reliable column dragging. Row, column, and cell
selection can reach background, merge, split, clear, and logical-boundary
insertion commands without giving up normal text editing.

Core also introduces a themeable `ui-affordance-scope` and shared virtual
proximity coordinator. One listener and one animation-frame batch per scope can
reveal overlapping nearby actions without adding invisible hit targets, while
touch and keyboard paths retain visible controls. Mobile editor controls use one
scrollable, snap-aligned dock, and wide tables scroll as a whole around
minimum-width cells.

## v0.1.9 Candidate

The Vue `Sidebar` adapter declares its custom-element-owned light-DOM resize
handle as an expected hydration difference. Nuxt and other server-rendered Vue
applications can use the resizable sidebar without false hydration mismatch
errors while retaining the pointer, keyboard, and persistent-width behavior
introduced in `0.1.8`.

## v0.1.8 Candidate

The `ui-sidebar` layout primitive supports opt-in pointer resizing with
configurable bounds and durable local-storage persistence. A visible separator
handle exposes the same adjustment through keyboard controls, including Home,
End, and arrow-key steps, so resizing does not depend on precise pointer input.

## v0.1.7 Candidate

Mobile editors use the visual viewport when the software keyboard is open.
The turnkey Vue editor presents exactly one touch-scrollable, snap-aligned dock
above the keyboard, switches that dock between formatting and table actions,
and provides a clear route back to formatting. Slash commands and table menus
remain inside the visible viewport.

Narrow tables retain useful cell widths inside a horizontal scroll wrapper;
desktop table boundaries keep their hover insertion and drag-resize affordances.
The dialog primitive can also forward an accessible label directly to its native
dialog surface, avoiding nested application dialog shells.

## v0.1.6 Candidate

Table editing keeps structural and appearance controls available during cell
selections. The table toolbar exposes cell backgrounds and explicit merge/split
actions, row-boundary hover reveals insertion controls, column boundaries retain
drag resizing, and final paragraphs no longer add trailing space inside cells.

Vue consumers can use `LoomaEditor` as a complete editor whose formatting,
slash-command, upload, focus, and table-control behavior is owned by Looma.
Existing Tiptap editors can adopt the same table behavior independently through
`LoomaTableKit` or `getLoomaTableExtensions()`. All editor controls resolve through
Looma semantic tokens so host theme overrides style the entire editor consistently.

All workspace packages and repository fixtures share the release version so
build and test output cannot misleadingly report an older internal version.

## v0.1.5 Candidate

Measured `ui-center` surfaces retain horizontal auto margins after Looma's
light-DOM reset, so they center inside wider parents instead of sticking to the
inline-start edge.

## v0.1.4 Candidate

Layout and common overlay surfaces preserve their intended display modes
through Looma's light-DOM reset and stay within narrow or safe-area-constrained
viewports. Grid minimums collapse without horizontal overflow, centered content
remains fluid, mobile search fills the dynamic viewport, and fixed controls,
menus, popovers, tabs, and dialogs have explicit responsive bounds.

The layout package also adds intrinsic `ui-switcher`, `ui-sidebar`, and
keyboard-focusable `ui-reel` primitives, with matching Vue, React, and Svelte
adapter exports.

Property-controlled dialogs use their rendered `data-open` state for host
visibility, matching framework adapters that set the `open` property rather
than reflecting an HTML attribute.

## v0.1.3 Candidate

Buttons expose a typed `outline`, `solid`, `destructive`, and `ghost`
appearance contract with a more distinctive default theme. Editor consumers
gain a reusable floating toolbar frame, compact table menus, precisely aligned
table-edge insertion controls, and outline-free table editing.

## v0.1.2 Candidate

Table context menus stay within the browser viewport when opened near an
edge, so every available table action remains reachable without requiring a
larger viewport.

## v0.1.1 Candidate

Looma Release 1 publishes one installable package with the same supported
subpaths introduced in `0.1.0`. The editor dependency contract is corrected so
the concrete Tiptap extensions used by Looma's preset ship inside the editor subpath;
consumers provide only their compatible Tiptap core or framework lifecycle
package. The protected release proof also runs its external SSR consumer on the
declared Node 20 runtime.

`0.1.0` reached npm during the first publication rehearsal but failed the clean
public-consumer gate. It is superseded by this Candidate and is not a supported
Release 1 artifact.

## v0.1.0 Candidate

> Deprecated: the package omitted runtime dependencies required by its editor
> entry. Use `0.1.1` or the `candidate` tag after qualification completes.

Looma Release 1 defines one Candidate package for direct custom-element consumers
and supported Vue 3 applications:

- `@threadlabs/looma` and `/core` expose the core web-component and overlay surface.
- `/layout` exposes light-DOM layout primitives.
- `/editor` and `/editor/extensions` expose editor elements and optional Tiptap helpers.
- `/vue` exposes the supported Release 1 adapter.
- Explicit `.css` subpaths expose tokens, themes, layout, core, and editor styles.

Candidate means this package is installable and qualified for its documented
surface, while APIs may still change before Stable. It does not imply completion
of the component roadmap or Stable support parity.

Editor table actions preserve document data and have keyboard and accessibility
coverage. `E-TBL-003` remains an accepted Candidate visual-polish limitation;
data loss or corruption is not accepted. React and Svelte adapters remain
deferred repository previews and are not part of this release.

Install the package through the npm `candidate` dist-tag and follow
the [Getting Started guide](https://threadlabs-studio.github.io/looma/docs/getting-started)
and [Candidate support boundary](https://threadlabs-studio.github.io/looma/docs/release-1-support)
before adoption.

```sh
pnpm add @threadlabs/looma@candidate
```
